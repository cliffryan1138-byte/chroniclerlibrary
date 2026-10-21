import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildProfile, recommend, type CommunityAggregates, type Item, type Log, type Recommendation, type TasteProfile } from '../core'
import { appConfig } from '../config/captains-cellar'
import { branch } from './branch'
import { store, type AppUser, type NewLog, type UserPatch } from './data'

interface AppState {
  ready: boolean
  user: AppUser | null
  items: Item[]
  logs: Log[]
  profile: TasteProfile
  recommendations: Recommendation[]
  setUser: (u: AppUser | null) => void
  updateUser: (patch: UserPatch) => Promise<void>
  addLog: (log: NewLog) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [community, setCommunity] = useState<CommunityAggregates>({})

  useEffect(() => {
    store.currentUser().then(setUser).catch(() => setUser(null)).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!user) return
    store.listItems(branch.spec.category).then(setItems)
    store.listLogs().then(setLogs)
    store.communityAggregates().then(setCommunity).catch(() => setCommunity({}))
  }, [user?.id])

  const profile = useMemo(
    () => buildProfile({ logs, items, taxonomy: branch.spec.taxonomy, seed: user?.quizSeed, coldStartLogs: branch.spec.coldStartLogs }),
    [logs, items, user?.quizSeed],
  )

  const recommendations = useMemo(
    () => recommend({
      profile, items, taxonomy: branch.spec.taxonomy, community,
      excludeItemIds: logs.map((l) => l.itemId), limit: appConfig.recommendationCount, strengthLabel: branch.spec.strengthLabel,
    }),
    [profile, items, logs, community],
  )

  const addLog = useCallback(async (input: NewLog) => {
    const saved = await store.addLog(input)
    const next = [saved, ...logs]
    setLogs(next)
    // The profile is derived; persist the rebuilt copy so other surfaces can read it.
    await store.saveProfile(buildProfile({ logs: next, items, taxonomy: branch.spec.taxonomy, seed: user?.quizSeed, coldStartLogs: branch.spec.coldStartLogs }))
  }, [logs, items, user?.quizSeed])

  const updateUser = useCallback(async (patch: UserPatch) => setUser(await store.updateUser(patch)), [])
  const signOut = useCallback(async () => {
    await store.signOut()
    setUser(null); setLogs([]); setItems([])
  }, [])

  return (
    <Ctx.Provider value={{ ready, user, items, logs, profile, recommendations, setUser, updateUser, addLog, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp outside AppProvider')
  return ctx
}
