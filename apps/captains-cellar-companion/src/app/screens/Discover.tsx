import { useMemo } from 'react'
import type { Item } from '../../core'
import { copy } from '../../config/captains-cellar'
import { normalizeName } from '../lib'
import { useApp } from '../state'
import { BrowseBy } from '../components/BrowseBy'
import { Card } from '../components/ui'

const makerKey = (i: Item) => i.makerId ?? normalizeName(i.brand)

export function Discover() {
  const { recommendations, branch, items, openItem } = useApp()
  const curated = useMemo(() => items.filter((i) => i.status === 'curated'), [items])
  // Grouped by the maker record when there is one, else by the maker's name ignoring case and spacing.
  const makers = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const i of curated) if (!byKey.has(makerKey(i))) byKey.set(makerKey(i), i.brand)
    return [...byKey].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [curated])
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold">{copy.discover.title}</h1>
        <p className="text-sm text-muted">{copy.discover.subtitle}</p>
      </header>
      {!recommendations.length && <p className="text-muted">{copy.discover.empty}</p>}
      <ol className="space-y-3">
        {recommendations.map((r, i) => (
          <li key={r.item.id}>
            <Card className="space-y-1" onClick={() => openItem(r.item.id)}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted">{i + 1}. {r.item.brand}</p>
                <span className="shrink-0 text-xs font-semibold text-accent">{Math.round(r.score * 100)}% match</span>
              </div>
              <p className="font-display text-lg font-semibold leading-snug">{r.item.name}</p>
              <branch.AttributeSummary item={r.item} />
              <p className="pt-1 text-sm">{r.reason}</p>
            </Card>
          </li>
        ))}
      </ol>
      {branch.browse && (
        <BrowseBy title={branch.browse.title} groups={branch.browse.groups} branch={branch} noun={branch.itemLabels.noun} hideEmpty={[...branch.browse.hideEmpty]}
          membersOf={(id) => curated.filter((i) => branch.browse!.groupOf(i) === id)} />
      )}
      {makers.length > 0 && (
        <BrowseBy title={copy.discover.byMaker} groups={makers} branch={branch} noun={branch.itemLabels.noun}
          membersOf={(key) => curated.filter((i) => makerKey(i) === key)} subgroupOf={(i) => branch.lineOf(i)} />
      )}
    </div>
  )
}
