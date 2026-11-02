import type { CommunityAggregates, Item, Log, LogTag, Rating, SeedProfile, TasteProfile } from '../../core'

export interface AppUser {
  id: string
  email: string | null
  mode: 'simple' | 'detailed'
  birthYear: number
  /** Quiz answers per category. Older rows hold a single cigar seed; readSeeds() handles both. */
  quizSeed: QuizSeeds | SeedProfile | null
  detailedOfferSeen: boolean
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
}
