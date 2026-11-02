import type { Item } from '../../core'
import type { ActiveBranch } from '../branch'
import { Card, Section } from './ui'

interface Browse {
  title: string
  field: string
  groups: readonly { id: string; label: string; description: string }[]
}

/** The catalog grouped by one attribute (e.g. pipe tobacco by blend style), each group with its description. */
export function BrowseBy({ browse, items, branch }: { browse: Browse; items: Item[]; branch: ActiveBranch }) {
  const curated = items.filter((i) => i.status === 'curated')
  const inGroup = (id: string) => curated.filter((i) => String((i.attributes as Record<string, unknown>)[browse.field] ?? 'Other') === id)
  return (
    <Section title={browse.title}>
      <Card className="divide-y divide-line p-0">
        {browse.groups.map((g) => {
          const members = inGroup(g.id)
          // The catch-all group only earns a row when something is in it; named styles teach even when empty.
          if (g.id === 'Other' && !members.length) return null
          return (
            <details key={g.id} className="px-4 py-3">
              <summary className="flex cursor-pointer items-baseline justify-between gap-3">
                <span className="font-semibold">{g.label}</span>
                <span className="shrink-0 text-xs text-muted">{members.length} {members.length === 1 ? 'blend' : 'blends'}</span>
              </summary>
              <p className="mt-1 text-sm text-muted">{g.description}</p>
              {members.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {members.map((i) => (
                    <li key={i.id} className="rounded-lg border border-line bg-bg px-3 py-2">
                      <p className="text-xs text-muted">{i.brand}</p>
                      <p className="text-sm font-semibold">{i.name}</p>
                      <branch.AttributeSummary item={i} />
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )
        })}
      </Card>
    </Section>
  )
}
