import { BookOpen, Compass, PenLine, Settings as Cog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { copy } from '../config/captains-cellar'
import { branch } from './branch'
import { cx } from './lib'
import { useApp } from './state'
import { Button, Card } from './components/ui'
import { Auth } from './screens/Auth'
import { Discover } from './screens/Discover'
import { LogScreen } from './screens/LogScreen'
import { Palate } from './screens/Palate'
import { Quiz } from './screens/Quiz'
import { Settings } from './screens/Settings'

type Tab = 'palate' | 'log' | 'discover' | 'settings'
const TABS: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'palate', label: 'Palate', Icon: BookOpen },
  { id: 'log', label: 'Log', Icon: PenLine },
  { id: 'discover', label: 'Discover', Icon: Compass },
  { id: 'settings', label: 'Settings', Icon: Cog },
]

export function App() {
  const { ready, user, logs, updateUser } = useApp()
  const [tab, setTab] = useState<Tab>('palate')
  const [retakeQuiz, setRetakeQuiz] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [logKey, setLogKey] = useState(0)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  if (!ready) return null
  if (!user) return <Auth />
  if (!user.quizSeed || retakeQuiz) return <Quiz onDone={() => { setRetakeQuiz(false); setTab('discover') }} />

  const offerDetailed = user.mode === 'simple' && !user.detailedOfferSeen && logs.length >= branch.detailedOfferAfter

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="px-4 pb-28 pt-6">
        {tab === 'palate' && <Palate />}
        {tab === 'log' && <LogScreen key={logKey} onSaved={() => { setToast(copy.log.saved); setLogKey((k) => k + 1); setTab('palate') }} />}
        {tab === 'discover' && <Discover />}
        {tab === 'settings' && <Settings onRetakeQuiz={() => setRetakeQuiz(true)} />}
      </main>

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-24 mx-auto max-w-sm rounded-lg bg-ink px-4 py-3 text-center text-sm text-bg shadow-lg">{toast}</div>
      )}

      {offerDetailed && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="offer-title">
          <Card className="w-full max-w-md space-y-3">
            <h2 id="offer-title" className="font-display text-2xl font-semibold">{copy.detailedOffer.title}</h2>
            <p className="text-sm text-muted">{copy.detailedOffer.body}</p>
            <Button className="w-full" onClick={() => updateUser({ mode: 'detailed', detailedOfferSeen: true })}>{copy.detailedOffer.accept}</Button>
            <Button variant="ghost" className="w-full" onClick={() => updateUser({ detailedOfferSeen: true })}>{copy.detailedOffer.decline}</Button>
          </Card>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map(({ id, label, Icon }) => (
            <li key={id}>
              <button onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                className={cx('flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs', tab === id ? 'text-accent' : 'text-muted')}>
                <Icon size={22} />{label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
