'use client';

import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import FieldInput from './FieldInput';
import {
  SITES,
  CROSS_POSTABLE,
  getCollection,
  getSite,
  type CollectionDef,
} from '@/lib/sites';
import type { EntryData, FieldValue } from '@/lib/frontmatter';

interface SaveResult {
  site: string;
  ok: boolean;
  path?: string;
  commitUrl?: string;
  created?: boolean;
  error?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seed a blank entry from the collection's declared defaults. */
function blankData(collection: CollectionDef): EntryData {
  const data: EntryData = {};
  for (const f of collection.fields) {
    if (f.default !== undefined) data[f.name] = f.default as FieldValue;
    else if (f.type === 'list') data[f.name] = [];
    else if (f.type === 'boolean') data[f.name] = false;
    else data[f.name] = '';
  }
  if ('pubDate' in data) data.pubDate = today();
  return data;
}

interface Props {
  initialSite: string;
  initialCollection: string;
  /** Set when opened to edit an existing entry. */
  editFile?: string;
}

export default function ComposerForm({ initialSite, initialCollection, editFile }: Props) {
  const [siteKey, setSiteKey] = useState(initialSite);
  const [collectionKey, setCollectionKey] = useState(initialCollection);
  const [alsoPostTo, setAlsoPostTo] = useState<string[]>([]);
  const [data, setData] = useState<EntryData>({});
  const [sha, setSha] = useState<string | undefined>();
  const [loading, setLoading] = useState(!!editFile);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<SaveResult[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const site = getSite(siteKey);
  const collection = getCollection(siteKey, collectionKey);
  const isEditing = !!editFile;

  const canCrossPost =
    !isEditing && (CROSS_POSTABLE as readonly string[]).includes(collectionKey);

  const otherSites = useMemo(
    () =>
      SITES.filter(
        (s) => s.key !== siteKey && s.collections.some((c) => c.key === collectionKey),
      ),
    [siteKey, collectionKey],
  );

  // Load an existing entry, or seed a blank one when the collection changes.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!collection) return;

      if (editFile) {
        setLoading(true);
        setLoadError('');
        try {
          const res = await fetch(
            `/api/content/entry?site=${siteKey}&collection=${collectionKey}&file=${encodeURIComponent(editFile)}`,
          );
          const body = await res.json();
          if (cancelled) return;
          if (!res.ok) {
            setLoadError(body.error || 'Could not load that entry.');
          } else {
            setData(body.data);
            setSha(body.sha);
          }
        } catch {
          if (!cancelled) setLoadError('Could not load that entry.');
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      setData(blankData(collection));
      setSha(undefined);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, collectionKey, editFile]);

  // A collection that doesn't exist on the newly picked site can't stay selected.
  useEffect(() => {
    if (site && !site.collections.some((c) => c.key === collectionKey)) {
      setCollectionKey(site.collections[0].key);
    }
  }, [site, collectionKey]);

  // Cross-post targets must all still offer the chosen collection.
  useEffect(() => {
    setAlsoPostTo((prev) => prev.filter((k) => otherSites.some((s) => s.key === k)));
  }, [otherSites]);

  function set(name: string, value: FieldValue) {
    setData((d) => ({ ...d, [name]: value }));
    setResults(null);
  }

  async function save() {
    if (!collection) return;
    setSaving(true);
    setResults(null);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sites: [siteKey, ...alsoPostTo],
          collection: collectionKey,
          data,
          ...(editFile ? { file: editFile, sha } : {}),
        }),
      });
      const body = await res.json();
      if (body.results) setResults(body.results as SaveResult[]);
      else setResults([{ site: siteKey, ok: false, error: body.error || 'Save failed.' }]);
    } catch {
      setResults([{ site: siteKey, ok: false, error: 'Network error. Nothing was saved.' }]);
    } finally {
      setSaving(false);
    }
  }

  if (!site || !collection) {
    return <p className="text-sm opacity-70">Unknown site or content type.</p>;
  }

  const bodyField = collection.fields.find((f) => f.type === 'markdown');
  const metaFields = collection.fields.filter((f) => f.type !== 'markdown');
  const bodyValue = bodyField ? String(data[bodyField.name] ?? '') : '';

  return (
    <div>
      {/* Site + type pickers */}
      <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="site">
              Site
            </label>
            <select
              id="site"
              value={siteKey}
              onChange={(e) => setSiteKey(e.target.value)}
              disabled={isEditing}
              className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base disabled:opacity-60 dark:border-white/20 dark:bg-black/30"
            >
              {SITES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="collection">
              Content type
            </label>
            <select
              id="collection"
              value={collectionKey}
              onChange={(e) => setCollectionKey(e.target.value)}
              disabled={isEditing}
              className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base disabled:opacity-60 dark:border-white/20 dark:bg-black/30"
            >
              {site.collections.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canCrossPost && otherSites.length > 0 && (
          <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
            <p className="text-sm font-medium">Also post to</p>
            <p className="mt-0.5 text-xs opacity-60">
              The same entry is committed to each site you tick. Categories differ per site, so
              check the category field if you cross-post a blog piece.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {otherSites.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={alsoPostTo.includes(s.key)}
                    onChange={(e) =>
                      setAlsoPostTo((prev) =>
                        e.target.checked ? [...prev, s.key] : prev.filter((k) => k !== s.key),
                      )
                    }
                    className="h-4 w-4"
                  />
                  <span className={`rounded border px-1.5 py-0.5 text-xs ${s.accent}`}>
                    {s.shortName}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {loadError && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {loadError}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm opacity-70">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {/* Metadata */}
          <div className="space-y-4 rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">Details</h2>
            {metaFields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                value={data[f.name]}
                onChange={(v) => set(f.name, v)}
                siteKey={siteKey}
              />
            ))}
          </div>

          {/* Body */}
          {bodyField && (
            <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  {bodyField.label}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPreview((p) => !p)}
                  className="rounded-md border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  {showPreview ? 'Write' : 'Preview'}
                </button>
              </div>

              {showPreview ? (
                <div
                  className="prose mt-3 max-w-none text-sm leading-relaxed [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-black/20 [&_blockquote]:pl-3 [&_h1]:mt-4 [&_h1]:text-xl [&_h2]:mt-4 [&_h2]:text-lg [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(bodyValue || '_Nothing written yet._', {
                      async: false,
                    }) as string,
                  }}
                />
              ) : (
                <textarea
                  value={bodyValue}
                  onChange={(e) => set(bodyField.name, e.target.value)}
                  rows={26}
                  placeholder="Write in Markdown…"
                  className="mt-3 w-full rounded-lg border border-black/15 bg-white p-3 font-mono text-sm leading-relaxed outline-none focus:border-black/40 dark:border-white/20 dark:bg-black/30"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Save bar */}
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-black/10 bg-[var(--parchment)] py-4 dark:border-white/10">
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
        >
          {saving
            ? 'Committing…'
            : isEditing
              ? 'Save changes'
              : alsoPostTo.length > 0
                ? `Publish to ${alsoPostTo.length + 1} sites`
                : 'Publish'}
        </button>
        <p className="text-xs opacity-60">
          {data.draft === true
            ? 'Saved as a draft — committed to the repo, hidden on the live site.'
            : 'Goes live once the site finishes rebuilding, usually a minute or two.'}
        </p>
      </div>

      {results && (
        <div className="mt-4 space-y-2">
          {results.map((r) => {
            const s = getSite(r.site);
            return (
              <div
                key={r.site}
                className={`rounded-lg px-4 py-3 text-sm ${
                  r.ok
                    ? 'bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100'
                    : 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100'
                }`}
              >
                <span className="font-medium">{s?.shortName ?? r.site}</span>{' '}
                {r.ok ? (
                  <>
                    {r.created ? 'created' : 'updated'} <code className="text-xs">{r.path}</code>
                    {r.commitUrl && (
                      <>
                        {' — '}
                        <a href={r.commitUrl} target="_blank" rel="noreferrer" className="underline">
                          view commit
                        </a>
                      </>
                    )}
                  </>
                ) : (
                  <>failed: {r.error}</>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
