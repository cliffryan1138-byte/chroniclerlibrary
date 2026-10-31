import type { Item } from '../../../core'
import { ATTRIBUTE_FIELDS, DETAIL_SCORES, DETAIL_TEXT, strengthLabel, type CigarAttributes } from '../rules'

export interface DetailFieldsProps {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

/** Detailed-mode extras for a cigar log: 1-5 scores and retrohale/finish notes. Stored in logs.details. */
export function DetailFields({ value, onChange }: DetailFieldsProps) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  return (
    <div className="space-y-4">
      {DETAIL_SCORES.map((s) => {
        const current = typeof value[s.key] === 'number' ? (value[s.key] as number) : null
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-semibold">{s.label}</span>
              <span className="text-muted">{current ?? 'not scored'}</span>
            </div>
            <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={s.label}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={current === n}
                  onClick={() => set(s.key, current === n ? undefined : n)}
                  className={`h-9 rounded-md border text-sm ${current === n ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface'}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-0.5 flex justify-between text-xs text-muted"><span>{s.low}</span><span>{s.high}</span></div>
          </div>
        )
      })}
      {DETAIL_TEXT.map((t) => (
        <label key={t.key} className="block">
          <span className="mb-1 block text-sm font-semibold">{t.label}</span>
          <textarea rows={2} placeholder={t.placeholder} value={(value[t.key] as string) ?? ''}
            onChange={(e) => set(t.key, e.target.value || undefined)}
            className="w-full rounded-md border border-line bg-surface p-2 text-sm" />
        </label>
      ))}
    </div>
  )
}

/** One-line spec summary for an item card. */
export function AttributeSummary({ item }: { item: Item }) {
  const a = item.attributes as CigarAttributes
  const parts = [a.vitola, a.length && a.ring_gauge ? `${a.length} × ${a.ring_gauge}` : null, a.wrapper && `${a.wrapper} wrapper`]
  return (
    <p className="text-xs text-muted">
      {parts.filter(Boolean).join(' · ')}
      {item.strength != null && <> · <span className="font-semibold">{strengthLabel(item.strength)}</span></>}
    </p>
  )
}

export const attributeLabels = ATTRIBUTE_FIELDS
