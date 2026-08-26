import { getCollection, getSite } from '@/lib/sites';
import { parseMarkdown } from '@/lib/frontmatter';
import { readFile, deleteFile } from '@/lib/github';
import { errorResponse, requireSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /api/content/entry?site=&collection=&file= — load one entry for editing. */
export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const site = getSite(url.searchParams.get('site') ?? '');
    const collection = getCollection(
      url.searchParams.get('site') ?? '',
      url.searchParams.get('collection') ?? '',
    );
    const file = url.searchParams.get('file') ?? '';

    if (!site || !collection || !file) {
      return Response.json({ error: 'Unknown site, collection, or file.' }, { status: 404 });
    }
    // Keep the caller inside the collection folder.
    if (file.includes('/') || file.includes('..')) {
      return Response.json({ error: 'Bad filename.' }, { status: 400 });
    }

    const path = `${collection.folder}/${file}`;
    const content = await readFile(site.repo, path);
    if (!content) return Response.json({ error: 'Not found.' }, { status: 404 });

    return Response.json({
      data: parseMarkdown(collection, content.text),
      sha: content.sha,
      file,
      path,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/content/entry?site=&collection=&file= */
export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const siteKey = url.searchParams.get('site') ?? '';
    const site = getSite(siteKey);
    const collection = getCollection(siteKey, url.searchParams.get('collection') ?? '');
    const file = url.searchParams.get('file') ?? '';

    if (!site || !collection || !file) {
      return Response.json({ error: 'Unknown site, collection, or file.' }, { status: 404 });
    }
    if (file.includes('/') || file.includes('..')) {
      return Response.json({ error: 'Bad filename.' }, { status: 400 });
    }

    const path = `${collection.folder}/${file}`;
    const existing = await readFile(site.repo, path);
    if (!existing) return Response.json({ error: 'Not found.' }, { status: 404 });

    await deleteFile({
      repo: site.repo,
      branch: site.branch,
      path,
      sha: existing.sha,
      message: `Delete ${collection.singular.toLowerCase()}: ${file}\n\nDeleted from the Chronicler dashboard by ${session.name}.`,
      author: { name: session.name, username: session.username },
    });

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
