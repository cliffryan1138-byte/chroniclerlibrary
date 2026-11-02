import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Item, Log } from '../../core'
import type { ActiveBranch } from '../branch'
import type { CollectionItem, NewCollectionItem } from '../data'
import { cx, findItem } from '../lib'
import { useApp } from '../state'
import { Button, Card, Section } from './ui'

type Spec = NonNullable<ActiveBranch['collection']>
const field = 'min-h-10 w-full rounded-md border border-line bg-bg px-3 text-sm font-normal'

/** Which collection item a log used, if any (stored in the log's details). */
export const usedWith = (l: Log) => (typeof l.details?.collection_item_id === 'string' ? (l.details.collection_item_id as string) : null)

function Form({ spec, branch, items, initial, onDone }: {
  spec: Spec; branch: ActiveBranch; items: Item[]; initial: CollectionItem | null; onDone: () => void
}) {
  const { saveCollectionItem, deleteCollectionItem } = useApp()
  const [maker, setMaker] = useState(initial?.maker ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [attrs, setAttrs] = useState<Record<string, unknown>>(initial?.attributes ?? {})
  const dedicated = items.find((i) => i.id === initial?.dedicatedItemId)
  const [blendMaker, setBlendMaker] = useState(dedicated?.brand ?? '')
  const [blendName, setBlendName] = useState(dedicated?.name ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blend = findItem(items, blendMaker, blendName)

  async function save() {
    setBusy(true); setError(null)
    const input: NewCollectionItem = {
      id: initial?.id, category: branch.spec.category, kind: spec.kind, maker: maker.trim() || null, name: name.trim() || null,
      attributes: Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== '' && v != null)),
      dedicatedItemId: blend?.id ?? null, notes: notes.trim() || null, acquiredOn: initial?.acquiredOn ?? null,
    }
    try { await saveCollectionItem(input); onDone() } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); setBusy(false) }
  }

  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold">Maker
          <input value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="Who made it" className={`${field} mt-1`} />
        </label>
        <label className="block text-xs font-semibold">Model or nickname
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" className={`${field} mt-1`} />
        </label>
      </div>
      {spec.fields.map((f) => {
        const value = String(attrs[f.key] ?? '')
        const chosen = f.options.find((o) => o.id === value) as { description?: string } | undefined
        return (
          <label key={f.key} className="block text-xs font-semibold">{f.label}
            <select value={value} onChange={(e) => setAttrs({ ...attrs, [f.key]: e.target.value })} className={`${field} mt-1`}>
              {!f.options.some((o) => o.id === '') && <option value="">Not set</option>}
              {f.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {chosen?.description && <span className="mt-1 block font-normal text-muted">{chosen.description}</span>}
          </label>
        )
      })}
      <div>
        <p className="mb-1 text-xs font-semibold">{spec.dedicatedLabel} (optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <input list="collection-blend-makers" value={blendMaker} onChange={(e) => setBlendMaker(e.target.value)} placeholder={branch.itemLabels.brand} className={field} aria-label={`${spec.dedicatedLabel}: ${branch.itemLabels.brand}`} />
          <input list="collection-blend-names" value={blendName} onChange={(e) => setBlendName(e.target.value)} placeholder={branch.itemLabels.name} className={field} aria-label={`${spec.dedicatedLabel}: ${branch.itemLabels.name}`} />
        </div>
        <datalist id="collection-blend-makers">{[...new Set(items.map((i) => i.brand))].map((b) => <option key={b} value={b} />)}</datalist>
        <datalist id="collection-blend-names">{items.filter((i) => !blendMaker || i.brand.toLowerCase() === blendMaker.trim().toLowerCase()).map((i) => <option key={i.id} value={i.name} />)}</datalist>
        {(blendMaker || blendName) && (
          <p className={cx('mt-1 text-xs', blend ? 'text-accent' : 'text-muted')}>
            {blend ? `In your catalog: ${blend.brand} ${blend.name}` : 'Not in the catalog yet. Log it once and it can be picked here.'}
          </p>
        )}
      </div>
      <label className="block text-xs font-semibold">Notes
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where it came from, how it smokes…" className="mt-1 w-full rounded-md border border-line bg-bg p-2 text-sm font-normal" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button disabled={busy || (!maker.trim() && !name.trim())} onClick={save}>{initial ? 'Save' : spec.add}</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        {initial && (
          <Button variant="ghost" className="ml-auto text-danger" disabled={busy}
            onClick={async () => { await deleteCollectionItem(initial.id); onDone() }}>Remove</Button>
        )}
      </div>
    </Card>
  )
}

/** The user's collection for this category, grouped by the spec's field, with how often each was used. */
export function Collection({ spec, branch }: { spec: Spec; branch: ActiveBranch }) {
  const { collection, items, logs } = useApp()
  const [editing, setEditing] = useState<CollectionItem | 'new' | null>(null)
  const groupField = spec.fields.find((f) => f.key === spec.groupBy)!
  const usage = useMemo(() => {
    const by = new Map<string, Log[]>()
    for (const l of logs) { const id = usedWith(l); if (id) by.set(id, [...(by.get(id) ?? []), l]) }
    return by
  }, [logs])
  const label = (c: CollectionItem) => [c.maker, c.name].filter(Boolean).join(' · ')

  return (
    <Section title={spec.title}>
      {editing ? (
        <Form spec={spec} branch={branch} items={items} initial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <Button variant="ghost" className="flex w-full items-center justify-center gap-2" onClick={() => setEditing('new')}>
          <Plus size={18} /> {spec.add}
        </Button>
      )}
      {collection.length > 0 && (
        <Card className="divide-y divide-line p-0">
          {groupField.options.map((g) => {
            const members = collection.filter((c) => String(c.attributes[spec.groupBy] ?? 'Other') === g.id || (!c.attributes[spec.groupBy] && g.id === 'Other'))
            if (!members.length) return null
            return (
              <details key={g.id} open className="px-4 py-3">
                <summary className="flex cursor-pointer items-baseline justify-between gap-3">
                  <span className="font-semibold">{g.label}</span>
                  <span className="shrink-0 text-xs text-muted">{members.length} {members.length === 1 ? spec.noun[0] : spec.noun[1]}</span>
                </summary>
                {'description' in g && <p className="mt-1 text-sm text-muted">{(g as { description: string }).description}</p>}
                <ul className="mt-2 space-y-2">
                  {members.map((c) => {
                    const used = usage.get(c.id) ?? []
                    const recent = [...new Set(used.map((l) => items.find((i) => i.id === l.itemId)?.name).filter(Boolean))].slice(0, 3)
                    const dedicated = items.find((i) => i.id === c.dedicatedItemId)
                    const facts = spec.fields.filter((f) => f.key !== spec.groupBy).map((f) => c.attributes[f.key]).filter(Boolean)
                    return (
                      <li key={c.id}>
                        <button className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-left" onClick={() => setEditing(c)}>
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold">{label(c) || 'Unnamed'}</p>
                            <p className="shrink-0 text-xs text-muted">{used.length} {used.length === 1 ? spec.usageNoun[0] : spec.usageNoun[1]}</p>
                          </div>
                          {facts.length > 0 && <p className="text-xs text-muted">{facts.join(' · ')}</p>}
                          {dedicated && <p className="text-xs text-accent">For {dedicated.brand} {dedicated.name}</p>}
                          {recent.length > 0 && <p className="text-xs text-muted">Recently: {recent.join(', ')}</p>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </details>
            )
          })}
        </Card>
      )}
    </Section>
  )
}
