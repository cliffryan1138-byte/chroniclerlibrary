import type { Item } from '../../../core'
import { ATTRIBUTE_FIELDS, lengthLabel, ringLabel, strengthLabel, type CigarAttributes } from '../rules'

/** One-line spec summary for an item card. */
export function AttributeSummary({ item }: { item: Item }) {
  const a = item.attributes as CigarAttributes
  const parts = [a.vitola, a.length ? lengthLabel(a.length) : null, ringLabel(a), a.wrapper && `${a.wrapper} wrapper`]
  return (
    <p className="text-xs text-muted">
      {parts.filter(Boolean).join(' · ')}
      {item.strength != null && <> · <span className="font-semibold">{strengthLabel(item.strength)}</span></>}
    </p>
  )
}

export const attributeLabels = ATTRIBUTE_FIELDS
