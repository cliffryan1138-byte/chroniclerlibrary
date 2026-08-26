'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SITES, getSite } from '@/lib/sites';

interface Entry {
  file: string;
  path: string;
  sha: string;
  title: string;
  description: string;
  pubDate: string;
  draft: boolean;
}

export default function ContentBrowser({ initialSite }: { initialSite: string }) {
  const [siteKey, setSiteKey] = useState(initialSite);
  const site = getSite(siteKey) ?? SITES[0];
  const [collectionKey, setCollectionKey] = useState(site.collections[0].key);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [busyFile, setBusyFile] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/content?site=${siteKey}&collection=${collectionKey}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Could not load content.');
        setEntries([]);
      } else {
        setEntries(body.entries as Entry[]);
      }
    } catch {
      setError('Could not load content.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [siteKey, collectionKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset the collection when switching to a site that lacks the current one.
  useEffect(() => {
    if (!site.collections.some((c) => c.key === collectionKey)) {
      setCollectionKey(site.collections[0].key);
    }
  }, [site, collectionKey]);

  async function remove(entry: Entry) {
    const ok = window.confirm(
      `Delete "${entry.title}" from ${site.name}?\n\nThis commits a deletion to the repo. It stays in the git history, but it comes off the live site.`,
    );
    if (!ok) return;
    setBusyFile(entry.file);
    try {
      const res = await fetch(
        `/api/content/entry?site=${siteKey}&collection=${collectionKey}&file=${encodeURIComponent(entry.file)}`,
        { method: 'DELETE' },
      );
      const body = await res.json();
      if (!res.ok) setError(body.error || 'Delete failed.');
      else await load();
    } catch {
      setError('Delete failed.');
    } finally {
      setBusyFile('');
    }
  }

  const shown = entries.filter((e) =>
    filter.trim() ? e.title.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <select
          value={siteKey}
          onChange={(e) => setSiteKey(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/30"
        >
          {SITES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={collectionKey}
          onChange={(e) => setCollectionKey(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/30"
        >
          {site.collections.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title…"
          className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/30"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm opacity-70">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-black/20 p-8 text-center dark:border-white/20">
          <p className="text-sm opacity-70">
            {entries.length === 0
              ? `No ${site.collections.find((c) => c.key === collectionKey)?.label.toLowerCase()} yet on ${site.shortName}.`
              : 'Nothing matches that filter.'}
          </p>
          {entries.length === 0 && (
            <Link
              href={`/compose?site=${siteKey}&collection=${collectionKey}`}
              className="mt-3 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900"
            >
              Write the first one
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-xl border border-black/10 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          {shown.map((e) => (
            <li key={e.file} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.title}</span>
                  {e.draft && (
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
                      draft
                    </span>
                  )}
                </div>
                {e.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs opacity-60">{e.description}</p>
                )}
                <p className="mt-0.5 text-xs opacity-40">
                  {e.pubDate} · {e.file}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/compose?site=${siteKey}&collection=${collectionKey}&file=${encodeURIComponent(e.file)}`}
                  className="rounded-md border border-black/15 px-2.5 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => remove(e)}
                  disabled={busyFile === e.file}
                  className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  {busyFile === e.file ? '…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
