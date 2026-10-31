import { useState } from 'react'
import type { FamilyId } from '../../core'
import { branch } from '../branch'
import { Chip } from './ui'

/** Family chips with a plain-English line under them for whichever one was tapped last (the simple-mode tooltip). */
export function FamilyPicker({ selected, onToggle, tone, disabled = [] }: { selected: FamilyId[]; onToggle: (f: FamilyId) => void; tone?: 'accent' | 'danger'; disabled?: FamilyId[] }) {
  const [hint, setHint] = useState<FamilyId | null>(null)
  const families = branch.spec.taxonomy.families.filter((f) => !disabled.includes(f.id))
  const hinted = families.find((f) => f.id === hint)
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {families.map((f) => (
          <Chip key={f.id} tone={tone} selected={selected.includes(f.id)} onClick={() => { onToggle(f.id); setHint(f.id) }}>
            {f.label}
          </Chip>
        ))}
      </div>
      <p className="mt-2 min-h-5 text-xs text-muted" aria-live="polite">{hinted ? `${hinted.label}: ${hinted.blurb}` : 'Tap a note to see what it means.'}</p>
    </div>
  )
}
