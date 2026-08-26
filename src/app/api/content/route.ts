import { getCollection, getSite } from '@/lib/sites';
import { buildMarkdown, peekEntry, type EntryData } from '@/lib/frontmatter';
import { entryFilename } from '@/lib/slug';
import { listCollection, readFile, writeFile } from '@/lib/github';
import { errorResponse, requireSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /api/content?site=war&collection=blog — list entries in one collection. */
export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const siteKey = url.searchParams.get('site') ?? '';
    const collectionKey = url.searchParams.get('collection') ?? '';

    const site = getSite(siteKey);
    const collection = getCollection(siteKey, collectionKey);
    if (!site || !collection) {
      return Response.json({ error: 'Unknown site or collection.' }, { status: 404 });
    }

    const files = await listCollection(site.repo, collection.folder);

    // Read each file so the list can show real titles and draft state rather
    // than filenames. These collections are small (tens of files), so the
    // per-file fetch is fine and keeps the listing honest.
    const entries = await Promise.all(
      files.map(async (f) => {
        const content = await readFile(site.repo, f.path);
        const peek = content
          ? peekEntry(content.text)
          : { title: f.name, description: '', pubDate: '', draft: false };
        return { file: f.name, path: f.path, sha: f.sha, ...peek };
      }),
    );

    entries.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
    return Response.json({ site: site.key, collection: collection.key, entries });
  } catch (err) {
    return errorResponse(err);
  }
}

interface SaveBody {
  /** One or more site keys — more than one means a cross-post. */
  sites: string[];
  collection: string;
  data: EntryData;
  /** Set when editing an existing entry (single-site only). */
  file?: string;
  sha?: string;
}

/** POST /api/content — create or update an entry on one or more sites. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as SaveBody;

    const siteKeys = Array.isArray(body.sites) ? body.sites : [];
    if (siteKeys.length === 0) {
      return Response.json({ error: 'Pick at least one site.' }, { status: 400 });
    }
    if (body.file && siteKeys.length > 1) {
      return Response.json(
        { error: 'Editing an existing entry works on one site at a time.' },
        { status: 400 },
      );
    }

    const author = { name: session.name, username: session.username };
    const results: Array<{
      site: string;
      ok: boolean;
      path?: string;
      commitUrl?: string;
      created?: boolean;
      error?: string;
    }> = [];

    for (const siteKey of siteKeys) {
      const site = getSite(siteKey);
      const collection = getCollection(siteKey, body.collection);
      if (!site || !collection) {
        results.push({ site: siteKey, ok: false, error: 'Unknown site or collection.' });
        continue;
      }

      // Stamp the author on collections whose schema has the field, unless the
      // author typed one explicitly.
      const data: EntryData = { ...body.data };
      const hasAuthorField = collection.fields.some((f) => f.name === 'author');
      if (hasAuthorField && !String(data.author ?? '').trim()) {
        data.author = session.name;
      }

      const built = buildMarkdown(collection, data);
      if (built.errors.length > 0) {
        results.push({ site: siteKey, ok: false, error: built.errors.join(' ') });
        continue;
      }

      const filename =
        body.file ??
        entryFilename(collection.key, String(data.title ?? ''), String(data.pubDate ?? ''));
      const path = `${collection.folder}/${filename}`;

      // On create, don't silently clobber an existing file with the same slug.
      let sha = body.sha;
      if (!body.file) {
        const existing = await readFile(site.repo, path);
        if (existing) {
          results.push({
            site: siteKey,
            ok: false,
            error: `A ${collection.singular.toLowerCase()} already exists at ${filename}. Change the title or open the existing one to edit it.`,
          });
          continue;
        }
      } else if (!sha) {
        const existing = await readFile(site.repo, path);
        sha = existing?.sha;
      }

      const verb = body.file ? 'Update' : 'Add';
      const isDraft = data.draft === true || data.draft === 'true';
      const message = `${verb} ${collection.singular.toLowerCase()}: ${String(
        data.title ?? filename,
      )}${isDraft ? ' [draft]' : ''}\n\nPosted from the Chronicler dashboard by ${session.name}.`;

      try {
        const res = await writeFile({
          repo: site.repo,
          branch: site.branch,
          path,
          content: built.content,
          message,
          author,
          sha,
        });
        results.push({ site: siteKey, ok: true, ...res });
      } catch (err) {
        results.push({
          site: siteKey,
          ok: false,
          error: err instanceof Error ? err.message : 'Commit failed.',
        });
      }
    }

    const anyOk = results.some((r) => r.ok);
    return Response.json({ results }, { status: anyOk ? 200 : 400 });
  } catch (err) {
    return errorResponse(err);
  }
}
