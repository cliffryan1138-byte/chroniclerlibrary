import type { Item } from '../../../core'
import { strengthLabel, type PipeAttributes } from '../rules'

/** One-line summary for a pipe tobacco card: style · cut · leaf · strength. */
export function AttributeSummary({ item }: { item: Item }) {
  const a = item.attributes as PipeAttributes
  // "Virginia · Flake · Virginia" says nothing twice: skip the leaf when it only repeats the style.
  const leaf = a.components?.length && a.components.join(', ') !== a.blend_style ? a.components.join(', ') : null
  const parts = [a.blend_style, a.cut, leaf]
  return (
    <p className="text-xs text-muted">
      {parts.filter(Boolean).join(' · ')}
      {item.strength != null && <> · <span className="font-semibold">{strengthLabel(item.strength)}</span></>}
    </p>
  )
}
