import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib'

export function Button({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return (
    <button {...props} className={cx(
      'min-h-11 rounded-lg px-4 font-semibold transition disabled:opacity-40',
      variant === 'primary' ? 'bg-accent text-accent-ink active:brightness-90' : 'border border-line bg-surface text-ink',
      className,
    )} />
  )
}

export function Chip({ selected, onClick, children, tone = 'accent' }: { selected: boolean; onClick: () => void; children: ReactNode; tone?: 'accent' | 'danger' }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={cx(
      'min-h-9 rounded-full border px-3 text-sm transition',
      selected
        ? tone === 'danger' ? 'border-danger bg-danger/15 text-danger' : 'border-accent bg-accent text-accent-ink'
        : 'border-line bg-surface text-ink',
    )}>
      {children}
    </button>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-line bg-surface p-4', className)}>{children}</div>
}

export function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {children}
    </section>
  )
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: readonly { label: string; value: T }[]; value: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid rounded-lg border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cx('min-h-9 rounded-md text-sm font-semibold', value === o.value ? 'bg-accent text-accent-ink' : 'text-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
