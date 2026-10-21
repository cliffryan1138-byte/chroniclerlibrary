import { Star } from 'lucide-react'
import { topFamilies } from '../../core'
import { copy } from '../../config/captains-cellar'
import { branch } from '../branch'
import { useApp } from '../state'
import { Card, Section } from '../components/ui'

export function Palate() {
  const { profile, logs, items } = useApp()
  const { taxonomy, strengthLabel } = branch.spec
  const rows = taxonomy.families.map((f) => ({ ...f, value: profile.families[f.id] ?? 0 })).sort((a, b) => b.value - a.value)
  const top = topFamilies(profile).map((f) => taxonomy.families.find((x) => x.id === f)!.label)
  const descriptors = Object.entries(profile.descriptors).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const empty = profile.source === 'empty'

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-3xl font-bold">{copy.profile.title}</h1>
        <p className="text-muted">
          {empty ? copy.profile.empty : top.length ? `You lean ${top.join(', ')}.` : 'No clear favorites yet.'}
        </p>
        {(profile.source === 'seed' || profile.source === 'blended') && <p className="mt-1 text-xs text-accent">{copy.profile.seedNote}</p>}
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card><p className="text-xs text-muted">Sessions logged</p><p className="font-display text-3xl font-bold">{logs.length}</p></Card>
        <Card><p className="text-xs text-muted">Preferred strength</p><p className="font-display text-3xl font-bold">{profile.strength != null ? strengthLabel(profile.strength) : '—'}</p></Card>
      </div>

      {!empty && (
        <Section title="Flavor families" hint="Right of center: notes you enjoy. Left: notes you rate lower.">
          <Card className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                <span>{r.label}</span>
                <div className="relative h-3 rounded-full bg-line/60" aria-label={`${r.label} ${Math.round(r.value * 100)}`}>
                  <div className="absolute inset-y-0 left-1/2 w-px bg-muted/50" />
                  <div className={r.value >= 0 ? 'absolute inset-y-0 left-1/2 rounded-r-full bg-accent' : 'absolute inset-y-0 right-1/2 rounded-l-full bg-danger/70'}
                    style={{ width: `${Math.abs(r.value) * 50}%` }} />
                </div>
                <span className="text-right tabular-nums text-muted">{Math.round(r.value * 100)}</span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {descriptors.length > 0 && (
        <Section title="Specific notes you like">
          <p className="text-sm">{descriptors.map(([d]) => taxonomy.descriptors.find((x) => x.id === d)?.label).join(' · ')}</p>
        </Section>
      )}

      {logs.length > 0 && (
        <Section title="Recent sessions">
          <ul className="space-y-2">
            {logs.slice(0, 10).map((l) => {
              const item = items.find((i) => i.id === l.itemId)
              return (
                <li key={l.id}>
                  <Card className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item?.name ?? 'Unknown item'}</p>
                      <p className="text-xs text-muted">{new Date(l.loggedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm"><Star size={16} className="fill-accent text-accent" />{l.overallRating}</span>
                  </Card>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}
