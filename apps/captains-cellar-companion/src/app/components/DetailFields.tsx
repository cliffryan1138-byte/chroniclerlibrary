export interface ScoreField { key: string; label: string; low: string; high: string }
export interface TextField { key: string; label: string; placeholder: string }

/** Detailed-mode extras: a branch's 1-5 scores and free-text notes, stored in logs.details. */
export function DetailFields({ scores, text, value, onChange }: {
  scores: readonly ScoreField[]
  text: readonly TextField[]
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  return (
    <div className="space-y-4">
      {scores.map((s) => {
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
      {text.map((t) => (
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
