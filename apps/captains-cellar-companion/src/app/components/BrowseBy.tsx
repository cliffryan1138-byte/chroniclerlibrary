import type { Item } from '../../core'
import type { ActiveBranch } from '../branch'
import { Card, Section } from './ui'

export interface BrowseGroup { id: string; label: string; description?: string }

/** A collapsible list of groups (styles, makers…), each with an optional description and its items. */
export function BrowseBy({ title, groups, membersOf, branch, noun = ['item', 'items'], hideEmpty = [] }: {
  title: string
  groups: readonly BrowseGroup[]
  membersOf: (groupId: string) => Item[]
  branch: ActiveBranch
  noun?: [string, string]
  /** Groups that only earn a row when something is in them (e.g. a catch-all "Other"). */
  hideEmpty?: string[]
}) {
  return (
    <Section title={title}>
      <Card className="divide-y divide-line p-0">
        {groups.map((g) => {
          const members = membersOf(g.id)
          if (!members.length && hideEmpty.includes(g.id)) return null
          return (
            <details key={g.id} className="px-4 py-3">
              <summary className="flex cursor-pointer items-baseline justify-between gap-3">
                <span className="font-semibold">{g.label}</span>
                <span className="shrink-0 text-xs text-muted">{members.length} {members.length === 1 ? noun[0] : noun[1]}</span>
              </summary>
              {g.description && <p className="mt-1 text-sm text-muted">{g.description}</p>}
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
