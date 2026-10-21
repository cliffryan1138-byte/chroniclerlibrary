import { createLocalStore } from './localStore'
import { createSupabaseStore } from './supabaseStore'
import type { Store } from './store'

export * from './store'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase when configured, otherwise a browser-only demo store. */
export const store: Store = url && key ? createSupabaseStore(url, key) : createLocalStore()
