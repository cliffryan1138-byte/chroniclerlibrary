import { copy } from '../../config/captains-cellar'
import { branch } from '../branch'
import { useApp } from '../state'
import { Card } from '../components/ui'

export function Discover() {
  const { recommendations } = useApp()
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
            <Card className="space-y-1">
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
    </div>
  )
}
