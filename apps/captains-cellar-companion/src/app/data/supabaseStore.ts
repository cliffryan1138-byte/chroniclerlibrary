import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CommunityAggregates, Item, Log, LogTag, TasteProfile } from '../../core'
import type { AppUser, NewLog, Store, UserPatch } from './store'

interface UserRow { id: string; mode: AppUser['mode']; birth_year: number; quiz_seed: AppUser['quizSeed']; detailed_offer_seen: boolean }

const toUser = (row: UserRow, email: string | null): AppUser => ({
  id: row.id, email, mode: row.mode, birthYear: row.birth_year, quizSeed: row.quiz_seed, detailedOfferSeen: row.detailed_offer_seen,
})

export function createSupabaseStore(url: string, anonKey: string): Store {
  const sb: SupabaseClient = createClient(url, anonKey)

  async function loadUser(): Promise<AppUser | null> {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data, error } = await sb.from('users').select('*').eq('id', user.id).maybeSingle()
    if (error) throw error
    if (data) return toUser(data as UserRow, user.email ?? null)
    // First sign-in after email confirmation: create the row from the birth year captured at signup.
    const birthYear = Number(user.user_metadata?.birth_year)
    if (!birthYear) throw new Error('Missing birth year on this account.')
    const { data: created, error: insertError } = await sb.from('users').insert({ id: user.id, birth_year: birthYear }).select().single()
    if (insertError) throw insertError
    return toUser(created as UserRow, user.email ?? null)
  }

  return {
    kind: 'supabase',
    currentUser: loadUser,
    async signUp(email, password, birthYear) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { birth_year: birthYear }, emailRedirectTo: window.location.origin } })
      if (error) throw error
      if (!data.session) return 'check-email'
      return (await loadUser())!
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error
      return (await loadUser())!
    },
    async signOut() { await sb.auth.signOut() },
    async updateUser(patch: UserPatch) {
      const { data: { user } } = await sb.auth.getUser()
      const row: Record<string, unknown> = {}
      if (patch.mode) row.mode = patch.mode
      if (patch.quizSeed !== undefined) row.quiz_seed = patch.quizSeed
      if (patch.detailedOfferSeen !== undefined) row.detailed_offer_seen = patch.detailedOfferSeen
      const { data, error } = await sb.from('users').update(row).eq('id', user!.id).select().single()
      if (error) throw error
      return toUser(data as UserRow, user!.email ?? null)
    },
    async listItems(category) {
      const { data, error } = await sb.from('items').select('*, item_tags(family, descriptor, weight)').eq('category', category)
      if (error) throw error
      return (data ?? []).map((r) => ({
        id: r.id, category: r.category, brand: r.brand, name: r.name, attributes: r.attributes, strength: r.strength, status: r.status,
        tags: (r.item_tags ?? []).map((t: { family: string; descriptor: string | null; weight: number }) => ({ ...t, weight: Number(t.weight) })),
      })) as Item[]
    },
    async listLogs() {
      const { data, error } = await sb.from('logs').select('*, log_tags(descriptor, family, third, intensity)').order('logged_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((r) => ({
        id: r.id, userId: r.user_id, itemId: r.item_id, loggedAt: r.logged_at, overallRating: r.overall_rating,
        wouldBuyAgain: r.would_buy_again, notes: r.notes, details: r.details, tags: r.log_tags as LogTag[],
      })) as Log[]
    },
    async addLog(input: NewLog) {
      const { data, error } = await sb.from('logs').insert({
        item_id: input.itemId, overall_rating: input.overallRating, would_buy_again: input.wouldBuyAgain, notes: input.notes, details: input.details,
      }).select().single()
      if (error) throw error
      if (input.tags.length) {
        const { error: tagError } = await sb.from('log_tags').insert(input.tags.map((t) => ({ ...t, log_id: data.id })))
        if (tagError) {
          await sb.from('logs').delete().eq('id', data.id)
          throw tagError
        }
      }
      return { ...input, id: data.id, userId: data.user_id, loggedAt: data.logged_at }
    },
    async communityAggregates() {
      const { data, error } = await sb.rpc('item_family_aggregates')
      if (error) throw error
      const out: CommunityAggregates = {}
      for (const r of (data ?? []) as { item_id: string; family: string; weight: number }[]) {
        ;(out[r.item_id] ??= {})[r.family] = Number(r.weight)
      }
      return out
    },
    async saveProfile(profile: TasteProfile) {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb.from('taste_profiles').upsert({ user_id: user.id, profile, log_count: profile.logCount, updated_at: new Date().toISOString() })
    },
  }
}
