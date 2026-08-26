import Link from 'next/link';
import { SITES } from '@/lib/sites';
import { listCollection, readFile } from '@/lib/github';
import { peekEntry } from '@/lib/frontmatter';

export const dynamic = 'force-dynamic';

interface Row {
  site: string;
  siteName: string;
  accent: string;
  collection: string;
  collectionLabel: string;
  file: string;
  title: string;
  pubDate: string;
  draft: boolean;
}

/** Pull a recent slice from every collection on every site. */
async function loadOverview() {
  const rows: Row[] = [];
  const counts: Record<string, Record<string, number>> = {};
  const errors: string[] = [];

  await Promise.all(
    SITES.map(async (site) => {
      counts[site.key] = {};
      await Promise.all(
        site.collections.map(async (collection) => {
          try {
            const files = await listCollection(site.repo, collection.folder);
            counts[site.key][collection.key] = files.length;

            // Only read the newest handful per collection — the overview needs a
            // recent slice, not every file in the library.
            const recent = files.slice().sort((a, b) => b.name.localeCompare(a.name)).slice(0, 5);
            for (const f of recent) {
              const content = await readFile(site.repo, f.path);
              if (!content) continue;
              const peek = peekEntry(content.text);
              rows.push({
                site: site.key,
                siteName: site.shortName,
                accent: site.accent,
                collection: collection.key,
                collectionLabel: collection.singular,
                file: f.name,
                title: peek.title,
                pubDate: peek.pubDate,
                draft: peek.draft,
              });
            }
          } catch (err) {
            counts[site.key][collection.key] = 0;
            errors.push(
              `${site.shortName} / ${collection.label}: ${
                err instanceof Error ? err.message : 'could not load'
              }`,
            );
          }
        }),
      );
    }),
  );

  rows.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
  return { rows: rows.slice(0, 15), counts, errors };
}

export default async function OverviewPage() {
  const { rows, counts, errors } = await loadOverview();
  const drafts = rows.filter((r) => r.draft);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
            Overview
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Four sites, one desk. Everything you post here commits straight to the site repo.
          </p>
        </div>
        <Link
          href="/compose"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900"
        >
          New post
        </Link>
      </div>

      {errors.length > 0 && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Some collections could not be read:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="mt-2 opacity-80">
            If this mentions the token, check that GITHUB_TOKEN has Contents access to all four
            repos.
          </p>
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SITES.map((site) => {
          const c = counts[site.key] ?? {};
          const total = Object.values(c).reduce((a, b) => a + b, 0);
          return (
            <div
              key={site.key}
              className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${site.accent}`}>
                  {site.shortName}
                </span>
                <a
                  href={`https://${site.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs opacity-50 hover:underline"
                >
                  visit
                </a>
              </div>
              <p className="mt-3 text-sm font-medium">{site.name}</p>
              <p className="mt-1 text-2xl">{total}</p>
              <p className="text-xs opacity-60">entries in total</p>
              <ul className="mt-3 space-y-0.5 text-xs opacity-70">
                {site.collections.map((col) => (
                  <li key={col.key} className="flex justify-between">
                    <span>{col.label}</span>
                    <span>{c[col.key] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {drafts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Unfinished drafts
          </h2>
          <p className="mt-1 text-sm opacity-70">
            These are committed to the repo but not showing on the live sites.
          </p>
          <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
            {drafts.map((r) => (
              <li key={`${r.site}-${r.collection}-${r.file}`}>
                <Link
                  href={`/compose?site=${r.site}&collection=${r.collection}&file=${encodeURIComponent(r.file)}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-black/[0.03] dark:hover:bg-white/5"
                >
                  <span className={`rounded border px-1.5 py-0.5 text-xs ${r.accent}`}>
                    {r.siteName}
                  </span>
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-auto text-xs opacity-50">{r.pubDate}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
          Recent across all sites
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-black/20 p-6 text-sm opacity-70 dark:border-white/20">
            Nothing loaded yet. If this is your first run, check the environment variables in
            .env.example.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
            {rows.map((r) => (
              <li key={`${r.site}-${r.collection}-${r.file}`}>
                <Link
                  href={`/compose?site=${r.site}&collection=${r.collection}&file=${encodeURIComponent(r.file)}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-black/[0.03] dark:hover:bg-white/5"
                >
                  <span className={`rounded border px-1.5 py-0.5 text-xs ${r.accent}`}>
                    {r.siteName}
                  </span>
                  <span className="text-xs opacity-50">{r.collectionLabel}</span>
                  <span className="font-medium">{r.title}</span>
                  {r.draft && (
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
                      draft
                    </span>
                  )}
                  <span className="ml-auto text-xs opacity-50">{r.pubDate}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
