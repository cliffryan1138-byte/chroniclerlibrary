import { Search, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Intensity, LogTag, Rating, Third } from '../../core'
import { copy } from '../../config/captains-cellar'
import { branch } from '../branch'
import { cx } from '../lib'
import { useApp } from '../state'
import { FamilyPicker } from '../components/FamilyPicker'
import { Button, Card, Chip, Section, Segmented } from '../components/ui'

const INTENSITY = [{ label: 'Faint', value: 1 }, { label: 'Present', value: 2 }, { label: 'Bold', value: 3 }] as const

export function LogScreen({ onSaved }: { onSaved: () => void }) {
  const { items, user, addLog } = useApp()
  const detailed = user?.mode === 'detailed'
  const [query, setQuery] = useState('')
  const [itemId, setItemId] = useState<string | null>(null)
  const [rating, setRating] = useState<Rating | null>(null)
  const [buyAgain, setBuyAgain] = useState<boolean | null>(null)
  const [families, setFamilies] = useState<string[]>([])
  const [tags, setTags] = useState<LogTag[]>([])
  const [third, setThird] = useState<Third | 0>(0)
  const [openFamily, setOpenFamily] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, unknown>>({})
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const item = items.find((i) => i.id === itemId)
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => i.status === 'curated' && (!q || `${i.brand} ${i.name}`.toLowerCase().includes(q))).slice(0, 8)
  }, [items, query])

  const { taxonomy } = branch.spec
  const thirdValue = third === 0 ? null : third
  const hasTag = (d: string) => tags.some((t) => t.descriptor === d && t.third === thirdValue)
  const toggleDescriptor = (descriptor: string, family: string) =>
    setTags(hasTag(descriptor)
      ? tags.filter((t) => !(t.descriptor === descriptor && t.third === thirdValue))
      : [...tags, { descriptor, family, third: thirdValue, intensity: 2 }])
  const setIntensity = (idx: number, intensity: Intensity) => setTags(tags.map((t, i) => (i === idx ? { ...t, intensity } : t)))

  async function save() {
    if (!item || !rating) return
    setBusy(true); setError(null)
    const logTags: LogTag[] = detailed ? tags : families.map((family) => ({ descriptor: null, family, third: null, intensity: 2 }))
    try {
      await addLog({ itemId: item.id, overallRating: rating, wouldBuyAgain: buyAgain, notes: notes.trim() || null, details: detailed ? details : {}, tags: logTags })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-7">
      <h1 className="font-display text-3xl font-bold">{copy.log.title}</h1>

      <Section title={copy.log.pickItem}>
        {item ? (
          <Card className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">{item.brand}</p>
              <p className="font-semibold">{item.name}</p>
              <branch.AttributeSummary item={item} />
            </div>
            <button aria-label="Change selection" onClick={() => setItemId(null)} className="p-1 text-muted"><X size={20} /></button>
          </Card>
        ) : (
          <>
            <label className="flex items-center gap-2 rounded-md border border-line bg-surface px-3">
              <Search size={18} className="text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or brand" className="min-h-11 w-full bg-transparent outline-none" />
            </label>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {matches.map((i) => (
                <li key={i.id}>
                  <button className="w-full px-3 py-2 text-left" onClick={() => setItemId(i.id)}>
                    <p className="text-sm font-semibold">{i.name}</p>
                    <branch.AttributeSummary item={i} />
                  </button>
                </li>
              ))}
              {!matches.length && <li className="px-3 py-3 text-sm text-muted">No match in the catalog yet.</li>}
            </ul>
          </>
        )}
      </Section>

      <Section title={copy.log.rating}>
        <div className="flex gap-1" role="radiogroup" aria-label="Overall rating">
          {([1, 2, 3, 4, 5] as Rating[]).map((n) => (
            <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(n)} className="p-1">
              <Star size={34} className={cx(rating && n <= rating ? 'fill-accent text-accent' : 'text-line')} />
            </button>
          ))}
        </div>
      </Section>

      <Section title={copy.log.wouldBuyAgain}>
        <Segmented label="Would reach for again" options={[{ label: 'Yes', value: 'y' }, { label: 'Not sure', value: 'm' }, { label: 'No', value: 'n' }]}
          value={buyAgain === null ? 'm' : buyAgain ? 'y' : 'n'} onChange={(v) => setBuyAgain(v === 'm' ? null : v === 'y')} />
      </Section>

      <Section title={copy.log.tags} hint={detailed ? 'Pick a third, open a family, tap specific notes.' : 'Tap every note you noticed.'}>
        {detailed ? (
          <div className="space-y-3">
            <Segmented<Third | 0> label="Which part of the session" value={third} onChange={setThird}
              options={[{ label: 'Whole', value: 0 }, ...branch.thirds.map((t) => ({ label: t.label.replace(' third', ''), value: t.value as Third }))]} />
            <div className="flex flex-wrap gap-2">
              {taxonomy.families.map((f) => (
                <Chip key={f.id} selected={openFamily === f.id} onClick={() => setOpenFamily(openFamily === f.id ? null : f.id)}>
                  {f.label}{tags.some((t) => t.family === f.id) ? ' •' : ''}
                </Chip>
              ))}
            </div>
            {openFamily && (
              <Card className="space-y-2">
                <p className="text-xs text-muted">{taxonomy.families.find((f) => f.id === openFamily)?.blurb}</p>
                <div className="flex flex-wrap gap-2">
                  {taxonomy.descriptors.filter((d) => d.family === openFamily).map((d) => (
                    <Chip key={d.id} selected={hasTag(d.id)} onClick={() => toggleDescriptor(d.id, d.family)}>{d.label}</Chip>
                  ))}
                </div>
              </Card>
            )}
            {tags.length > 0 && (
              <ul className="space-y-2">
                {tags.map((t, i) => (
                  <li key={`${t.descriptor}-${t.third}`} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {taxonomy.descriptors.find((d) => d.id === t.descriptor)?.label}
                      <span className="text-muted"> · {t.third ? branch.thirds[t.third - 1].label : 'Whole'}</span>
                    </span>
                    <div className="w-44 shrink-0"><Segmented label="Intensity" options={INTENSITY} value={t.intensity} onChange={(v) => setIntensity(i, v)} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <FamilyPicker selected={families} onToggle={(f) => setFamilies(families.includes(f) ? families.filter((x) => x !== f) : [...families, f])} />
        )}
      </Section>

      {detailed && (
        <Section title="Scores and notes">
          <branch.DetailFields value={details} onChange={setDetails} />
        </Section>
      )}

      <Section title={copy.log.notes}>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border border-line bg-surface p-3 text-sm" placeholder="The chair, the hour, the pour…" />
      </Section>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button className="w-full" onClick={save} disabled={!item || !rating || busy}>{copy.log.save}</Button>
    </div>
  )
}
