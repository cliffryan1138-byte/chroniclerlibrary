import { branch } from '../branch'
import type { AppUser, NewLog, Store, UserPatch } from './store'
import type { Log, TasteProfile } from '../../core'

// Demo mode: a single local user, everything in this browser's localStorage.
const KEY = { user: 'ccc:user', logs: 'ccc:logs', profile: 'ccc:profile' }

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

export function createLocalStore(): Store {
  return {
    kind: 'local',
    async currentUser() { return read<AppUser | null>(KEY.user, null) },
    async signUp(email, _password, birthYear) {
      const user: AppUser = { id: 'local-user', email: email || null, mode: 'simple', birthYear, quizSeed: null, detailedOfferSeen: false }
      write(KEY.user, user)
      return user
    },
    async signIn() {
      const user = read<AppUser | null>(KEY.user, null)
      if (!user) throw new Error('No demo profile in this browser yet. Sign up instead.')
      return user
    },
    async signOut() {
      for (const k of Object.values(KEY)) localStorage.removeItem(k)
    },
    async updateUser(patch: UserPatch) {
      const user = { ...read<AppUser>(KEY.user, null as never), ...patch }
      write(KEY.user, user)
      return user
    },
    async listItems(category) { return branch.sampleCatalog.filter((i) => i.category === category) },
    async listLogs() { return read<Log[]>(KEY.logs, []) },
    async addLog(input: NewLog) {
      const log: Log = { ...input, id: crypto.randomUUID(), userId: 'local-user', loggedAt: new Date().toISOString() }
      write(KEY.logs, [log, ...read<Log[]>(KEY.logs, [])])
      return log
    },
    async communityAggregates() { return {} },
    async saveProfile(profile: TasteProfile) { write(KEY.profile, profile) },
  }
}
