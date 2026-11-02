import { Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Intensity, LogTag, Rating, Third } from '../../core'
import { copy } from '../../config/captains-cellar'
import { branch } from '../branch'
import { cx, findItem, normalizeName } from '../lib'
import { useApp } from '../state'
import { FamilyPicker } from '../components/FamilyPicker'
import { Button, Card, Chip, Section, Segmented } from '../components/ui'

const INTENSITY = [{ label: 'Faint', value: 1 }, { label: 'Present', value: 2 }, { label: 'Bold', value: 3 }] as const

export function LogScreen({ onSaved }: { onSaved: () => void }) {
  const { items, user, addLog, addItem } = useApp()
  const detailed = user?.mode === 'detailed'
  const [maker, setMaker] = useState('')
  const [cigar, setCigar] = useState('')
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

  const labels = branch.itemLabels
  const makers = useMemo(() => [...new Set(items.map((i) => i.brand))].sort(), [items])
  const cigarsForMaker = useMemo(() => {
    const m = normalizeName(maker)
    return items.filter((i) => !m || normalizeName(i.brand) === m).map((i) => i.name).sort()
  }, [items, maker])
  const match = findItem(items, maker, cigar)
  const named = maker.trim() !== '' && cigar.trim() !== ''

  const { taxonomy } = branch.spec
  const thirdValue = third === 0 ? null : third
  const hasTag = (d: string) => tags.some((t) => t.descriptor === d && t.third === thirdValue)
  const toggleDescriptor = (descriptor: string, family: string) =>
    setTags(hasTag(descriptor)
      ? tags.filter((t) => !(t.descriptor === descriptor && t.third === thirdValue))
      : [...tags, { descriptor, family, third: thirdValue, intensity: 2 }])
  const setIntensity = (idx: number, intensity: Intensity) => setTags(tags.map((t, i) => (i === idx ? { ...t, intensity } : t)))

  async function save() {
    if (!named || !rating) return
    setBusy(true); setError(null)
    const logTags: LogTag[] = detailed ? tags : families.map((family) => ({ descriptor: null, family, third: null, intensity: 2 }))
    try {
      const item = match ?? (await addItem(maker, cigar))
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

      <Section title={copy.log.pickItem} hint={copy.log.pickItemHint}>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{labels.brand}</span>
            <input list="makers" value={maker} maxLength={80} autoCapitalize="words" placeholder={labels.brandPlaceholder}
              onChange={(e) => setMaker(e.target.value)} className="min-h-11 w-full rounded-md border border-line bg-surface px-3" />
            <datalist id="makers">{makers.map((m) => <option key={m} value={m} />)}</datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{labels.name}</span>
            <input list="cigars" value={cigar} maxLength={120} autoCapitalize="words" placeholder={labels.namePlaceholder}
              onChange={(e) => setCigar(e.target.value)} className="min-h-11 w-full rounded-md border border-line bg-surface px-3" />
            <datalist id="cigars">{cigarsForMaker.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          {match ? (
            <Card className="py-3">
              <p className="text-xs font-semibold text-accent">{copy.log.inCatalog}</p>
              <branch.AttributeSummary item={match} />
            </Card>
          ) : named ? (
            <p className="text-xs text-muted">{copy.log.newItem}</p>
          ) : null}
        </div>
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
      <Button className="w-full" onClick={save} disabled={!named || !rating || busy}>{copy.log.save}</Button>
    </div>
  )
}
