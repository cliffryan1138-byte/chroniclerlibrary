import type { Item } from '../../core'
import type { ActiveBranch } from '../branch'
import { useApp } from '../state'
import { Card, Section } from './ui'

export interface BrowseGroup { id: string; label: string; description?: string }

/** A collapsible list of groups (styles, makers…), each with an optional description and its items. */
export function BrowseBy({ title, groups, membersOf, branch, noun = ['item', 'items'], hideEmpty = [], subgroupOf }: {
  title: string
  groups: readonly BrowseGroup[]
  membersOf: (groupId: string) => Item[]
  branch: ActiveBranch
  noun?: [string, string]
  /** Groups that only earn a row when something is in them (e.g. a catch-all "Other"). */
  hideEmpty?: string[]
  /** Splits each group's items under headings (a maker's lines); items without one come last. */
  subgroupOf?: (item: Item) => string | null
}) {
  const { openItem } = useApp()
  const row = (i: Item) => (
    <li key={i.id}>
      <button onClick={() => openItem(i.id)} className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-left">
        <p className="text-xs text-muted">{i.brand}</p>
        <p className="text-sm font-semibold">{i.name}</p>
        <branch.AttributeSummary item={i} />
      </button>
    </li>
  )
  const split = (members: Item[]) => {
    const by = new Map<string, Item[]>()
    for (const i of members) { const k = subgroupOf?.(i) ?? ''; by.set(k, [...(by.get(k) ?? []), i]) }
    return [...by].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
  }
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
              {members.length > 0 && !subgroupOf && <ul className="mt-2 space-y-2">{members.map(row)}</ul>}
              {members.length > 0 && subgroupOf && split(members).map(([line, list], _n, all) => (
                <div key={line || '-'} className="mt-3">
                  {(line || all.length > 1) && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">{line || 'Other'}</p>}
                  <ul className="space-y-2">{list.map(row)}</ul>
                </div>
              ))}
            </details>
          )
        })}
      </Card>
    </Section>
  )
}
