import type { CommunityAggregates, Item, Log, LogTag, Rating, SeedProfile, TasteProfile } from '../../core'

export interface AppUser {
  id: string
  email: string | null
  mode: 'simple' | 'detailed'
  birthYear: number
  quizSeed: SeedProfile | null
  detailedOfferSeen: boolean
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
  updateUser(patch: UserPatch): Promise<AppUser>
  listItems(category: string): Promise<Item[]>
  listLogs(): Promise<Log[]>
  addLog(log: NewLog): Promise<Log>
  communityAggregates(): Promise<CommunityAggregates>
  saveProfile(profile: TasteProfile): Promise<void>
}
