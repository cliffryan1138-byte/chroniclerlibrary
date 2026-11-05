import { ArrowLeft, PenLine, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { familyLabel } from '../../core'
import type { ItemStats } from '../data'
import { store } from '../data'
import { useApp } from '../state'
import { Button, Card, Section } from './ui'

const pct = (x: number) => `${Math.round(x * 100)}%`

/** One item's own page: its facts, your history with it, what members' logs add up to, and its line. */
export function ItemSheet({ onLog }: { onLog: () => void }) {
  const { openItemId, openItem, allItems, logs, branch, setLogPrefill } = useApp()
  const item = allItems.find((i) => i.id === openItemId)
  const [stats, setStats] = useState<ItemStats | null>(null)

  useEffect(() => {
    if (!openItemId) return
    setStats(null)
    store.itemStats(openItemId).then(setStats).catch(() => setStats(null))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') openItem(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openItemId, openItem])

  const mine = useMemo(() => logs.filter((l) => l.itemId === openItemId), [logs, openItemId])
  const line = item ? branch.lineOf(item) : null
  const siblings = useMemo(() => (item && line
    ? allItems.filter((i) => i.id !== item.id && i.status === 'curated' && i.category === item.category && i.brand === item.brand && branch.lineOf(i) === line)
    : []), [allItems, item, line, branch])

  if (!openItemId) return null
  if (!item) return null
  const attrs = item.attributes as Record<string, unknown>
  const facts = branch.attributeFields.filter((f) => attrs[f.key] != null && attrs[f.key] !== '' && !(Array.isArray(attrs[f.key]) && !(attrs[f.key] as unknown[]).length))
  const sources = Array.isArray(attrs.sources) ? (attrs.sources as string[]) : []
  const fam = (f: string) => familyLabel(branch.spec.taxonomy, f)
  const avg = mine.length ? mine.reduce((s, l) => s + l.overallRating, 0) / mine.length : null

  return (
    <div role="dialog" aria-modal="true" aria-label={`${item.brand} ${item.name}`} className="fixed inset-0 z-30 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-md px-4 pb-16 pt-4">
        <button onClick={() => openItem(null)} className="mb-4 flex min-h-11 items-center gap-2 text-sm text-muted"><ArrowLeft size={18} /> Back</button>

        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-accent">{item.brand}{line ? ` · ${line}` : ''}</p>
          <h1 className="font-display text-3xl font-bold leading-tight">{item.name}</h1>
          <branch.AttributeSummary item={item} />
          {item.status !== 'curated' && <p className="text-xs text-muted">Waiting for a curator. Only you can see it for now.</p>}
        </header>

        <div className="mt-5">
          <Button className="flex w-full items-center justify-center gap-2" onClick={() => { setLogPrefill({ brand: item.brand, name: item.name }); openItem(null); onLog() }}>
            <PenLine size={18} /> Log this {branch.itemLabels.noun[0]}
          </Button>
        </div>

        <div className="mt-7 space-y-7">
          {facts.length > 0 && (
            <Section title="The facts">
              <Card className="divide-y divide-line p-0">
                {facts.map((f) => (
                  <div key={f.key} className="flex items-baseline justify-between gap-4 px-4 py-2 text-sm">
                    <span className="text-muted">{f.label}</span>
                    <span className="text-right font-semibold">{branch.formatFact(f.key, attrs[f.key], item)}</span>
                  </div>
                ))}
              </Card>
              {sources.length > 0 && <p className="mt-2 text-xs text-muted">Source: {sources.map((s) => s.split('/')[0]).filter((s, i, a) => a.indexOf(s) === i).join(', ')}</p>}
            </Section>
          )}

          <Section title="You and this one">
            {mine.length ? (
              <Card className="space-y-1 text-sm">
                <p><span className="font-semibold">{mine.length === 1 ? 'Once' : `${mine.length} times`}</span>, averaging <span className="inline-flex items-center gap-1 font-semibold"><Star size={14} className="fill-accent text-accent" />{avg!.toFixed(1)}</span></p>
                <p className="text-muted">Last on {new Date(mine[0].loggedAt).toLocaleDateString()}</p>
                {mine[0].notes && <p className="italic">“{mine[0].notes}”</p>}
              </Card>
            ) : <p className="text-sm text-muted">You haven't logged it yet.</p>}
          </Section>

          <Section title="Members' logs" hint="Totals only. Nobody's notes or ratings are shown.">
            {!stats ? <p className="text-sm text-muted">…</p> : !stats.enough ? (
              <p className="text-sm text-muted">
                {stats.people === 0 ? 'No members have logged it yet.' : `Logged by ${stats.people} ${stats.people === 1 ? 'member' : 'members'} so far.`} The community view opens once 3 people have logged it.
              </p>
            ) : (
              <Card className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="font-display text-2xl font-bold">{stats.people}</p><p className="text-xs text-muted">members logged it</p></div>
                  <div><p className="font-display text-2xl font-bold">{stats.wouldAgain == null ? '—' : pct(stats.wouldAgain)}</p><p className="text-xs text-muted">would reach for it again</p></div>
                  <div><p className="font-display text-2xl font-bold">{stats.avgRating ?? '—'}</p><p className="text-xs text-muted">average rating</p></div>
                </div>
                {stats.loved.length > 0 && <p><span className="font-semibold">Fans noted:</span> {stats.loved.map(fam).join(', ')}</p>}
                {stats.low.length > 0 && <p><span className="font-semibold">Low raters noted:</span> {stats.low.map(fam).join(', ')}</p>}
              </Card>
            )}
          </Section>

          {siblings.length > 0 && (
            <Section title={`More of the ${line} line`}>
              <ul className="space-y-2">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => openItem(s.id)} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left">
                      <p className="text-sm font-semibold">{s.name}</p>
                      <branch.AttributeSummary item={s} />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
