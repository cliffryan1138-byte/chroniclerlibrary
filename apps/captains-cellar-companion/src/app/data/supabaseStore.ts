import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CommunityAggregates, Item, Log, LogTag, TasteProfile } from '../../core'
import type { AppUser, CollectionItem, CuratorActions, NewLog, QueueEntry, Store, UserPatch } from './store'

interface UserRow { id: string; mode: AppUser['mode']; birth_year: number; quiz_seed: AppUser['quizSeed']; detailed_offer_seen: boolean; is_curator?: boolean }

const toUser = (row: UserRow, email: string | null): AppUser => ({
  id: row.id, email, mode: row.mode, birthYear: row.birth_year, quizSeed: row.quiz_seed, detailedOfferSeen: row.detailed_offer_seen,
  isCurator: row.is_curator === true,
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

  /** The maker this name belongs to (matched ignoring case and spacing), adding a pending one if it's new. */
  async function findOrAddMaker(name: string, userId: string): Promise<string | null> {
    const key = name.trim().replace(/\s+/g, ' ').toLowerCase()
    const { data: found } = await sb.from('makers').select('id').eq('name_key', key).maybeSingle()
    if (found) return found.id
    const { data: added, error } = await sb.from('makers')
      .insert({ name: name.trim().replace(/\s+/g, ' '), status: 'user_added_pending', created_by: userId }).select('id').single()
    // Someone else's pending maker can hold the name unseen; the item still saves, unlinked, until curation.
    return error ? null : added.id
  }

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await sb.rpc(fn, args)
    if (error) throw new Error(error.message)
  }

  const curator: CuratorActions = {
    async queue() {
      const { data, error } = await sb.rpc('curator_queue')
      if (error) throw new Error(error.message)
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        kind: r.kind, id: r.id, category: r.category, brand: r.brand, name: r.name, strength: r.strength,
        attributes: r.attributes ?? {}, makerId: r.maker_id, createdAt: r.created_at,
        logCount: Number(r.log_count ?? 0), people: r.people == null ? null : Number(r.people),
      })) as QueueEntry[]
    },
    async makers() {
      const { data, error } = await sb.from('makers').select('id, name, country, website').eq('status', 'curated').order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    approveItem: (id, brand, name, strength) => rpc('approve_item', { item_id: id, new_brand: brand, new_name: name, new_strength: strength }),
    mergeItem: (fromId, intoId) => rpc('merge_item', { from_id: fromId, into_id: intoId }),
    rejectItem: (id) => rpc('reject_item', { item_id: id }),
    approveMaker: (id, name, country, website) => rpc('approve_maker', { maker_id: id, new_name: name, new_country: country, new_website: website }),
    mergeMaker: (fromId, intoId) => rpc('merge_maker', { from_id: fromId, into_id: intoId }),
    rejectMaker: (id) => rpc('reject_maker', { maker_id: id }),
  }

  const toCollection = (r: Record<string, unknown>): CollectionItem => ({
    id: r.id as string, category: r.category as string, kind: r.kind as string, maker: (r.maker as string) ?? null,
    name: (r.name as string) ?? null, attributes: (r.attributes as Record<string, unknown>) ?? {},
    dedicatedItemId: (r.dedicated_item_id as string) ?? null, notes: (r.notes as string) ?? null, acquiredOn: (r.acquired_on as string) ?? null,
  })

  return {
    kind: 'supabase',
    curator,
    async listCollection() {
      const { data, error } = await sb.from('collection_items').select('*').order('created_at')
      if (error) throw error
      return (data ?? []).map(toCollection)
    },
    async saveCollectionItem(input) {
      const row = {
        category: input.category, kind: input.kind, maker: input.maker, name: input.name, attributes: input.attributes,
        dedicated_item_id: input.dedicatedItemId, notes: input.notes, acquired_on: input.acquiredOn,
      }
      const q = input.id
        ? sb.from('collection_items').update(row).eq('id', input.id).select().single()
        : sb.from('collection_items').insert(row).select().single()
      const { data, error } = await q
      if (error) throw error
      return toCollection(data)
    },
    async deleteCollectionItem(id) {
      const { error } = await sb.from('collection_items').delete().eq('id', id)
      if (error) throw error
    },
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
    async accessToken() {
      const { data } = await sb.auth.getSession()
      return data.session?.access_token ?? null
    },
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
        makerId: r.maker_id ?? null,
        tags: (r.item_tags ?? []).map((t: { family: string; descriptor: string | null; weight: number }) => ({ ...t, weight: Number(t.weight) })),
      })) as Item[]
    },
    async addItem(category, brand, name) {
      const { data: { user } } = await sb.auth.getUser()
      const makerId = await findOrAddMaker(brand, user!.id)
      const { data, error } = await sb.from('items')
        .insert({ category, brand, name, status: 'user_added_pending', created_by: user!.id, maker_id: makerId })
        .select().single()
      if (error) throw error
      return { id: data.id, category, brand, name, attributes: data.attributes ?? {}, strength: data.strength, status: data.status, tags: [], makerId } as Item
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
    async saveProfiles(profiles: Record<string, TasteProfile>) {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const logCount = Object.values(profiles).reduce((n, p) => n + p.logCount, 0)
      await sb.from('taste_profiles').upsert({ user_id: user.id, profile: profiles, log_count: logCount, updated_at: new Date().toISOString() })
    },
  }
}
