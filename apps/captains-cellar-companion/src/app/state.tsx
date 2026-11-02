import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildProfile, recommend, type CommunityAggregates, type Item, type Log, type Recommendation, type SeedProfile, type TasteProfile } from '../core'
import { appConfig } from '../config/captains-cellar'
import { branches, type ActiveBranch, type BranchId } from './branch'
import { readSeeds, store, type AppUser, type CollectionItem, type NewCollectionItem, type NewLog, type QuizSeeds, type UserPatch } from './data'

interface AppState {
  ready: boolean
  user: AppUser | null
  /** The category the screens are showing. Each has its own palate, quiz answers and suggestions. */
  branch: ActiveBranch
  setBranch: (id: BranchId) => void
  seeds: QuizSeeds
  /** Catalog and logs for the active category only. */
  items: Item[]
  logs: Log[]
  allLogs: Log[]
  /** Every category's catalog, for screens that work across them (curation). */
  allItems: Item[]
  /** Re-read the catalog and logs, e.g. after a curator merges or approves something. */
  reloadCatalog: () => Promise<void>
  /** How many entries wait for a curator; null for everyone else. */
  waiting: number | null
  /** The user's collection (pipes) for the active category. */
  collection: CollectionItem[]
  saveCollectionItem: (item: NewCollectionItem) => Promise<void>
  deleteCollectionItem: (id: string) => Promise<void>
  refreshWaiting: () => Promise<void>
  profile: TasteProfile
  recommendations: Recommendation[]
  setUser: (u: AppUser | null) => void
  updateUser: (patch: UserPatch) => Promise<void>
  saveSeed: (seed: SeedProfile) => Promise<void>
  addLog: (log: NewLog) => Promise<void>
  addItem: (brand: string, name: string) => Promise<Item>
  signOut: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)
const BRANCH_KEY = 'ccc:branch'

function initialBranch(): ActiveBranch {
  try {
    const saved = localStorage.getItem(BRANCH_KEY)
    return branches.find((b) => b.id === saved) ?? branches[0]
  } catch {
    return branches[0]
  }
}

function profileFor(b: ActiveBranch, allLogs: Log[], allItems: Item[], seeds: QuizSeeds): TasteProfile {
  const items = allItems.filter((i) => i.category === b.spec.category)
  const ids = new Set(items.map((i) => i.id))
  const logs = allLogs.filter((l) => ids.has(l.itemId))
  return buildProfile({ logs, items, taxonomy: b.spec.taxonomy, seed: seeds[b.id], coldStartLogs: b.spec.coldStartLogs })
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [branch, setBranchState] = useState<ActiveBranch>(initialBranch)
  const [allItems, setAllItems] = useState<Item[]>([])
  const [allLogs, setAllLogs] = useState<Log[]>([])
  const [community, setCommunity] = useState<CommunityAggregates>({})
  const [waiting, setWaiting] = useState<number | null>(null)
  const [allCollection, setAllCollection] = useState<CollectionItem[]>([])

  useEffect(() => {
    store.currentUser().then(setUser).catch(() => setUser(null)).finally(() => setReady(true))
  }, [])

  const reloadCatalog = useCallback(async () => {
    const [lists, logs] = await Promise.all([Promise.all(branches.map((b) => store.listItems(b.spec.category))), store.listLogs()])
    setAllItems(lists.flat())
    setAllLogs(logs)
    setAllCollection(await store.listCollection().catch(() => []))
  }, [])

  const refreshWaiting = useCallback(async () => {
    if (!user?.isCurator) return setWaiting(null)
    try { setWaiting((await store.curator.queue()).length) } catch { /* keep the last count */ }
  }, [user?.isCurator])

  // A curator's badge stays current: on open, after the catalog changes, and when they come back to the app.
  useEffect(() => { refreshWaiting() }, [allItems, refreshWaiting])
  useEffect(() => {
    refreshWaiting()
    const onVisible = () => { if (document.visibilityState === 'visible') refreshWaiting() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshWaiting])

  useEffect(() => {
    if (!user) return
    let loadedAt = Date.now()
    reloadCatalog()
    store.communityAggregates().then(setCommunity).catch(() => setCommunity({}))
    // A home-screen app stays alive in the background for days, so coming back to it refreshes the
    // catalog (curator changes, newly loaded makers). At most once a minute; a failed refresh keeps what's shown.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - loadedAt < 60_000) return
      loadedAt = Date.now()
      reloadCatalog().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id, reloadCatalog])

  const setBranch = useCallback((id: BranchId) => {
    const next = branches.find((b) => b.id === id)
    if (!next) return
    setBranchState(next)
    try { localStorage.setItem(BRANCH_KEY, id) } catch { /* per-device convenience only */ }
  }, [])

  const seeds = useMemo(() => readSeeds(user?.quizSeed ?? null), [user?.quizSeed])
  const items = useMemo(() => allItems.filter((i) => i.category === branch.spec.category), [allItems, branch])
  const logs = useMemo(() => {
    const ids = new Set(items.map((i) => i.id))
    return allLogs.filter((l) => ids.has(l.itemId))
  }, [allLogs, items])

  const profile = useMemo(() => profileFor(branch, allLogs, allItems, seeds), [branch, allLogs, allItems, seeds])

  const recommendations = useMemo(
    () => recommend({
      profile, items, taxonomy: branch.spec.taxonomy, community,
      excludeItemIds: logs.map((l) => l.itemId), limit: appConfig.recommendationCount, strengthLabel: branch.spec.strengthLabel,
    }),
    [profile, items, logs, community, branch],
  )

  const addLog = useCallback(async (input: NewLog) => {
    const saved = await store.addLog(input)
    const next = [saved, ...allLogs]
    setAllLogs(next)
    // The profiles are derived; persist the rebuilt copies so other surfaces can read them.
    await store.saveProfiles(Object.fromEntries(branches.map((b) => [b.id, profileFor(b, next, allItems, seeds)])))
  }, [allLogs, allItems, seeds])

  const addItem = useCallback(async (brand: string, name: string) => {
    const item = await store.addItem(branch.spec.category, brand.trim().replace(/\s+/g, ' '), name.trim().replace(/\s+/g, ' '))
    setAllItems((prev) => [...prev, item])
    return item
  }, [branch])

  const collection = useMemo(() => allCollection.filter((c) => c.category === branch.spec.category), [allCollection, branch])
  const saveCollectionItem = useCallback(async (input: NewCollectionItem) => {
    const saved = await store.saveCollectionItem(input)
    setAllCollection((prev) => (input.id ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]))
  }, [])
  const deleteCollectionItem = useCallback(async (id: string) => {
    await store.deleteCollectionItem(id)
    setAllCollection((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const updateUser = useCallback(async (patch: UserPatch) => setUser(await store.updateUser(patch)), [])
  const saveSeed = useCallback(async (seed: SeedProfile) => {
    setUser(await store.updateUser({ quizSeed: { ...seeds, [branch.id]: seed } }))
  }, [seeds, branch])

  const signOut = useCallback(async () => {
    await store.signOut()
    setUser(null); setAllLogs([]); setAllItems([]); setAllCollection([])
  }, [])

  return (
    <Ctx.Provider value={{
      ready, user, branch, setBranch, seeds, items, logs, allLogs, allItems, reloadCatalog, waiting, refreshWaiting, collection, saveCollectionItem, deleteCollectionItem, profile, recommendations,
      setUser, updateUser, saveSeed, addLog, addItem, signOut,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp outside AppProvider')
  return ctx
}
