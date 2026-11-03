import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Item } from '../../core'
import { copy } from '../../config/captains-cellar'
import { branchFor } from '../branch'
import { store, type MakerRecord, type QueueEntry } from '../data'
import { normalizeName } from '../lib'
import { useApp } from '../state'
import { Button, Card, Section } from '../components/ui'

const used = (e: QueueEntry) =>
  e.kind === 'maker'
    ? `${e.logCount} ${e.logCount === 1 ? 'entry' : 'entries'} under this name`
    : e.logCount ? `Logged ${e.logCount} ${e.logCount === 1 ? 'time' : 'times'} by ${e.people} ${e.people === 1 ? 'person' : 'people'}` : 'Not logged yet'

const field = 'min-h-10 w-full rounded-md border border-line bg-bg px-3 text-sm'

/** Search a list and pick one as the merge target. */
function MergePicker<T>({ options, label, describe, onPick, onCancel }: {
  options: T[]; label: (o: T) => string; describe?: (o: T) => string; onPick: (o: T) => void; onCancel: () => void
}) {
  const [q, setQ] = useState('')
  const hits = options.filter((o) => normalizeName(label(o)).includes(normalizeName(q))).slice(0, 6)
  return (
    <div className="space-y-2 rounded-lg border border-line bg-bg p-3">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalog" className={field} />
      <ul className="space-y-1">
        {hits.map((o, i) => (
          <li key={i}>
            <button className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-surface" onClick={() => onPick(o)}>
              <span className="font-semibold">{label(o)}</span>
              {describe && <span className="block text-xs text-muted">{describe(o)}</span>}
            </button>
          </li>
        ))}
        {!hits.length && <li className="px-2 py-2 text-sm text-muted">No match.</li>}
      </ul>
      <button className="text-sm text-muted underline" onClick={onCancel}>Cancel</button>
    </div>
  )
}

function ItemCard({ entry, catalog, onDone }: { entry: QueueEntry; catalog: Item[]; onDone: () => void }) {
  const branch = entry.category ? branchFor(entry.category) : undefined
  const [brand, setBrand] = useState(entry.brand)
  const [name, setName] = useState(entry.name)
  const [strength, setStrength] = useState(entry.strength == null ? '' : String(entry.strength))
  const [merging, setMerging] = useState(false)
  const [confirm, setConfirm] = useState<Item | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await fn(); onDone() } catch (e) { setError(e instanceof Error ? e.message : 'That did not work.'); setBusy(false) }
  }
  const targets = catalog.filter((i) => i.category === entry.category && i.status === 'curated')
  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-accent">{branch?.name ?? entry.category}</p>
        <p className="text-xs text-muted">{used(entry)}</p>
      </div>
      {branch && Object.keys(entry.attributes ?? {}).length > 0 && (
        <div className="rounded-md bg-bg px-3 py-2">
          <p className="text-xs font-semibold">What they told us</p>
          <branch.AttributeSummary item={{ id: entry.id, category: entry.category ?? '', brand: entry.brand, name: entry.name, attributes: entry.attributes ?? {}, strength: null, status: 'user_added_pending', tags: [] }} />
        </div>
      )}
      <label className="block text-xs font-semibold">{branch?.itemLabels.brand ?? 'Maker'}
        <input value={brand} onChange={(e) => setBrand(e.target.value)} className={`${field} mt-1 font-normal`} />
      </label>
      <label className="block text-xs font-semibold">{branch?.itemLabels.name ?? 'Name'}
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1 font-normal`} />
      </label>
      <label className="block text-xs font-semibold">Strength (1-5, optional)
        <select value={strength} onChange={(e) => setStrength(e.target.value)} className={`${field} mt-1 font-normal`}>
          <option value="">Not stated</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {branch?.spec.strengthLabel(n) ?? n}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {confirm ? (
        <div className="space-y-2 rounded-lg border border-accent p-3 text-sm">
          <p>Merge into <span className="font-semibold">{confirm.brand} {confirm.name}</span>? Every log of this entry moves over, and this entry goes away.</p>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => act(() => store.curator.mergeItem(entry.id, confirm.id))}>Merge</Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Back</Button>
          </div>
        </div>
      ) : merging ? (
        <MergePicker options={targets} label={(i) => `${i.brand} ${i.name}`}
          describe={() => 'In the catalog'} onPick={(i) => { setMerging(false); setConfirm(i) }} onCancel={() => setMerging(false)} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button disabled={busy || !brand.trim() || !name.trim()}
            onClick={() => act(() => store.curator.approveItem(entry.id, brand, name, strength ? Number(strength) : null))}>Approve</Button>
          <Button variant="ghost" disabled={busy} onClick={() => { setError(null); setMerging(true) }}>Merge…</Button>
          <Button variant="ghost" disabled={busy} onClick={() => act(() => store.curator.rejectItem(entry.id))}>Reject</Button>
        </div>
      )}
    </Card>
  )
}

function MakerCard({ entry, makers, onDone }: { entry: QueueEntry; makers: MakerRecord[]; onDone: () => void }) {
  const [name, setName] = useState(entry.name)
  const [country, setCountry] = useState('')
  const [website, setWebsite] = useState('')
  const [merging, setMerging] = useState(false)
  const [confirm, setConfirm] = useState<MakerRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await fn(); onDone() } catch (e) { setError(e instanceof Error ? e.message : 'That did not work.'); setBusy(false) }
  }
  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-accent">Maker</p>
        <p className="text-xs text-muted">{used(entry)}</p>
      </div>
      <label className="block text-xs font-semibold">Name
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1 font-normal`} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold">Country
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Optional" className={`${field} mt-1 font-normal`} />
        </label>
        <label className="block text-xs font-semibold">Website
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Optional" className={`${field} mt-1 font-normal`} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {confirm ? (
        <div className="space-y-2 rounded-lg border border-accent p-3 text-sm">
          <p>Merge into <span className="font-semibold">{confirm.name}</span>? Everything under this name moves over and takes that spelling.</p>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => act(() => store.curator.mergeMaker(entry.id, confirm.id))}>Merge</Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Back</Button>
          </div>
        </div>
      ) : merging ? (
        <MergePicker options={makers} label={(m) => m.name} describe={(m) => m.country ?? 'Catalog maker'}
          onPick={(m) => { setMerging(false); setConfirm(m) }} onCancel={() => setMerging(false)} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button disabled={busy || !name.trim()} onClick={() => act(() => store.curator.approveMaker(entry.id, name, country, website))}>Approve</Button>
          <Button variant="ghost" disabled={busy} onClick={() => { setError(null); setMerging(true) }}>Merge…</Button>
          <Button variant="ghost" disabled={busy} onClick={() => act(() => store.curator.rejectMaker(entry.id))}>Reject</Button>
        </div>
      )}
    </Card>
  )
}

export function Curator() {
  const { allItems, reloadCatalog, refreshWaiting } = useApp()
  const [queue, setQueue] = useState<QueueEntry[] | null>(null)
  const [makers, setMakers] = useState<MakerRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [q, m] = await Promise.all([store.curator.queue(), store.curator.makers()])
      setQueue(q); setMakers(m); setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the queue.')
    }
  }, [])
  useEffect(() => { load() }, [load])
  const done = useCallback(async () => { await Promise.all([load(), reloadCatalog(), refreshWaiting()]) }, [load, reloadCatalog, refreshWaiting])

  const items = useMemo(() => (queue ?? []).filter((e) => e.kind === 'item'), [queue])
  const pendingMakers = useMemo(() => (queue ?? []).filter((e) => e.kind === 'maker'), [queue])

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold">{copy.curator.title}</h1>
        <p className="text-sm text-muted">{copy.curator.subtitle}</p>
      </header>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {queue && !queue.length && <p className="text-muted">{copy.curator.empty}</p>}
      {items.length > 0 && (
        <Section title={`Waiting: ${items.length}`}>
          <div className="space-y-3">{items.map((e) => <ItemCard key={e.id} entry={e} catalog={allItems} onDone={done} />)}</div>
        </Section>
      )}
      {pendingMakers.length > 0 && (
        <Section title={`Makers waiting: ${pendingMakers.length}`}>
          <div className="space-y-3">{pendingMakers.map((e) => <MakerCard key={e.id} entry={e} makers={makers} onDone={done} />)}</div>
        </Section>
      )}
    </div>
  )
}
