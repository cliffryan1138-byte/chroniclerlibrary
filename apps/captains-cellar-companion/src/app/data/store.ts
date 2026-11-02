import type { CommunityAggregates, Item, Log, LogTag, Rating, SeedProfile, TasteProfile } from '../../core'

export interface AppUser {
  id: string
  email: string | null
  mode: 'simple' | 'detailed'
  birthYear: number
  /** Quiz answers per category. Older rows hold a single cigar seed; readSeeds() handles both. */
  quizSeed: QuizSeeds | SeedProfile | null
  detailedOfferSeen: boolean
  /** Can review what people type in. Granted with SQL only; the app can't set it. */
  isCurator: boolean
}

export type QuizSeeds = Partial<Record<string, SeedProfile>>

/** Quiz answers by category, reading a pre-pipe-tobacco row (one cigar seed) as the cigar seed. */
export function readSeeds(raw: AppUser['quizSeed']): QuizSeeds {
  if (!raw) return {}
  if ('likedFamilies' in raw && Array.isArray((raw as SeedProfile).likedFamilies)) return { cigar: raw as SeedProfile }
  return raw as QuizSeeds
}

export interface NewLog {
  itemId: string
  overallRating: Rating
  wouldBuyAgain: boolean | null
  notes: string | null
  details: Record<string, unknown>
  tags: LogTag[]
}

/** One entry in the curator's queue. Counts only: who logged it never leaves the database. */
export interface QueueEntry {
  kind: 'item' | 'maker'
  id: string
  category: string | null
  brand: string
  name: string
  strength: number | null
  attributes: Record<string, unknown>
  makerId: string | null
  createdAt: string
  logCount: number
  people: number | null
}

export interface MakerRecord { id: string; name: string; country: string | null; website: string | null }

export interface CuratorActions {
  queue(): Promise<QueueEntry[]>
  makers(): Promise<MakerRecord[]>
  approveItem(id: string, brand: string, name: string, strength: number | null): Promise<void>
  mergeItem(fromId: string, intoId: string): Promise<void>
  rejectItem(id: string): Promise<void>
  approveMaker(id: string, name: string, country: string, website: string): Promise<void>
  mergeMaker(fromId: string, intoId: string): Promise<void>
  rejectMaker(id: string): Promise<void>
}

/** Something kept rather than consumed (a pipe). Private to its owner. */
export interface CollectionItem {
  id: string
  category: string
  kind: string
  maker: string | null
  name: string | null
  attributes: Record<string, unknown>
  dedicatedItemId: string | null
  notes: string | null
  acquiredOn: string | null
}
export type NewCollectionItem = Omit<CollectionItem, 'id'> & { id?: string }

export type UserPatch = Partial<Pick<AppUser, 'mode' | 'quizSeed' | 'detailedOfferSeen'>>

export interface Store {
  kind: 'local' | 'supabase'
  currentUser(): Promise<AppUser | null>
  signUp(email: string, password: string, birthYear: number): Promise<AppUser | 'check-email'>
  signIn(email: string, password: string): Promise<AppUser>
  signOut(): Promise<void>
  /** Bearer token for this app's own server functions; null in demo mode. */
  accessToken(): Promise<string | null>
  updateUser(patch: UserPatch): Promise<AppUser>
  listItems(category: string): Promise<Item[]>
  /** A cigar the catalog doesn't have yet: saved as pending, visible only to the person who added it. */
  addItem(category: string, brand: string, name: string): Promise<Item>
  listLogs(): Promise<Log[]>
  addLog(log: NewLog): Promise<Log>
  communityAggregates(): Promise<CommunityAggregates>
  /** The derived profile for each category, saved as one row. */
  saveProfiles(profiles: Record<string, TasteProfile>): Promise<void>
  curator: CuratorActions
  listCollection(): Promise<CollectionItem[]>
  /** Adds a new one, or updates it when it has an id. */
  saveCollectionItem(item: NewCollectionItem): Promise<CollectionItem>
  deleteCollectionItem(id: string): Promise<void>
}
