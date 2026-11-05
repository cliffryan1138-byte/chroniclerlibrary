import { branches } from '../branch'
import type { AppUser, CollectionItem, CuratorActions, NewLog, QueueEntry, Store, UserPatch } from './store'
import type { Item, Log, TasteProfile } from '../../core'

// Demo mode: a single local user, everything in this browser's localStorage.
const KEY = { user: 'ccc:user', logs: 'ccc:logs', profile: 'ccc:profile', items: 'ccc:items', collection: 'ccc:collection' }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked: session-only */ }
}

const key = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

/** Curation over this browser's own typed-in entries. Demo makers are just the catalog's brand names. */
const localCurator: CuratorActions = {
  async queue() {
    const logs = read<Log[]>(KEY.logs, [])
    return read<Item[]>(KEY.items, []).filter((i) => i.status === 'user_added_pending').map((i): QueueEntry => {
      const n = logs.filter((l) => l.itemId === i.id).length
      return { kind: 'item', id: i.id, category: i.category, brand: i.brand, name: i.name, strength: i.strength, attributes: i.attributes,
        makerId: null, createdAt: new Date().toISOString(), logCount: n, people: n ? 1 : 0 }
    })
  },
  async makers() {
    const all = [...branches.flatMap((b) => b.sampleCatalog), ...read<Item[]>(KEY.items, [])].filter((i) => i.status === 'curated')
    return [...new Map(all.map((i) => [key(i.brand), i.brand])).entries()].map(([id, name]) => ({ id, name, country: null, website: null }))
  },
  async approveItem(id, brand, name, strength) {
    const items = read<Item[]>(KEY.items, [])
    const all = [...branches.flatMap((b) => b.sampleCatalog), ...items]
    const me = items.find((i) => i.id === id)
    if (!me) throw new Error('No such item')
    if (all.some((o) => o.id !== id && o.status === 'curated' && o.category === me.category && key(o.brand) === key(brand) && key(o.name) === key(name))) {
      throw new Error('Already in the catalog: merge it instead')
    }
    write(KEY.items, items.map((i) => (i.id === id ? { ...i, brand: brand.trim().replace(/\s+/g, ' '), name: name.trim().replace(/\s+/g, ' '), strength, status: 'curated' as const } : i)))
  },
  async mergeItem(fromId, intoId) {
    write(KEY.logs, read<Log[]>(KEY.logs, []).map((l) => (l.itemId === fromId ? { ...l, itemId: intoId } : l)))
    write(KEY.items, read<Item[]>(KEY.items, []).filter((i) => i.id !== fromId))
  },
  async rejectItem(id) {
    write(KEY.items, read<Item[]>(KEY.items, []).map((i) => (i.id === id ? { ...i, status: 'rejected' as Item['status'] } : i)))
  },
  async approveMaker() {},
  async mergeMaker() {},
  async rejectMaker() {},
}

export function createLocalStore(): Store {
  return {
    kind: 'local',
    curator: localCurator,
    async listCollection() { return read<CollectionItem[]>(KEY.collection, []) },
    async saveCollectionItem(input) {
      const all = read<CollectionItem[]>(KEY.collection, [])
      const item: CollectionItem = { ...input, id: input.id ?? crypto.randomUUID() }
      write(KEY.collection, input.id ? all.map((c) => (c.id === input.id ? item : c)) : [...all, item])
      return item
    },
    async deleteCollectionItem(id) { write(KEY.collection, read<CollectionItem[]>(KEY.collection, []).filter((c) => c.id !== id)) },
    async currentUser() { return read<AppUser | null>(KEY.user, null) },
    async signUp(email, _password, birthYear) {
      // The demo's only user curates their own typed-in entries, so the curator screen can be tried out.
      const user: AppUser = { id: 'local-user', email: email || null, mode: 'simple', birthYear, quizSeed: null, detailedOfferSeen: false, isCurator: true }
      write(KEY.user, user)
      return user
    },
    async signIn() {
      const user = read<AppUser | null>(KEY.user, null)
      if (!user) throw new Error('No demo profile in this browser yet. Sign up instead.')
      return user
    },
    async accessToken() { return null },
    async signOut() {
      for (const k of Object.values(KEY)) localStorage.removeItem(k)
    },
    async updateUser(patch: UserPatch) {
      const user = { ...read<AppUser>(KEY.user, null as never), ...patch }
      write(KEY.user, user)
      return user
    },
    async listItems(category) {
      const samples = branches.flatMap((b) => b.sampleCatalog)
      return [...samples, ...read<Item[]>(KEY.items, [])].filter((i) => i.category === category)
    },
    async addItem(category, brand, name, attributes = {}) {
      const item: Item = { id: crypto.randomUUID(), category, brand, name, attributes, strength: null, status: 'user_added_pending', tags: [] }
      write(KEY.items, [...read<Item[]>(KEY.items, []), item])
      return item
    },
    async listLogs() { return read<Log[]>(KEY.logs, []) },
    async addLog(input: NewLog) {
      const log: Log = { ...input, id: crypto.randomUUID(), userId: 'local-user', loggedAt: new Date().toISOString() }
      write(KEY.logs, [log, ...read<Log[]>(KEY.logs, [])])
      return log
    },
    async communityAggregates() { return {} },
    // Demo mode has one person, so there is never a community block to show.
    async itemStats(itemId) { return { enough: false, people: read<Log[]>(KEY.logs, []).some((l) => l.itemId === itemId) ? 1 : 0 } },
    async saveProfiles(profiles: Record<string, TasteProfile>) { write(KEY.profile, profiles) },
  }
}
