// Vercel Function: POST /api/scan-band
// Reads a photo of a cigar band and returns the maker and cigar name so the log form can pre-fill.
// The model call happens in Chronicler's SPARK install (/v1/extract, module cellar, kind cigar_band),
// which owns the model key, the spending caps and the audit log. This function only checks that the
// caller is signed in and forwards the photo with the install's token (SPARK_URL, SPARK_CORE_TOKEN).

import { createClient } from '@supabase/supabase-js'

export const MAX_IMAGE_BYTES = 3_500_000
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type MediaType = (typeof MEDIA_TYPES)[number]

export interface BandReading {
  found: boolean
  maker: string | null
  name: string | null
  confidence: 'high' | 'medium' | 'low'
}

/** What SPARK's cigar_band kind returns in `extracted`. */
export interface SparkBand {
  maker: string | null
  line: string | null
  vitola: string | null
  confidence: number | null
}

/** SPARK reports a line and a size separately; the log form has one "Cigar" line for both. */
export function toReading(band: SparkBand | null): BandReading {
  if (!band || !(band.maker || band.line)) return { found: false, maker: null, name: null, confidence: 'low' }
  const name = [band.line, band.vitola].filter(Boolean).join(' ') || null
  const c = band.confidence ?? 0
  return { found: true, maker: band.maker, name, confidence: c >= 0.8 ? 'high' : c >= 0.5 ? 'medium' : 'low' }
}

/** A refusal SPARK means for the person (a spending cap reached): shown to them as-is. */
export class SparkRefused extends Error {}

export interface Deps {
  /** Resolves the bearer token to a user id, or null if it isn't a valid session. */
  verifyUser: (token: string) => Promise<string | null>
  readBand: (image: string, mediaType: MediaType, userId: string) => Promise<BandReading>
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export function createHandler(deps: Deps) {
  return async function POST(request: Request): Promise<Response> {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Sign in to scan a band.' }, 401)
    const userId = await deps.verifyUser(token)
    if (!userId) return json({ error: 'Your session expired. Sign in again.' }, 401)

    let body: { image?: unknown; mediaType?: unknown }
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Expected a JSON body.' }, 400)
    }
    const { image, mediaType } = body
    if (typeof image !== 'string' || !image) return json({ error: 'No photo attached.' }, 400)
    if (!MEDIA_TYPES.includes(mediaType as MediaType)) return json({ error: 'Unsupported image type.' }, 400)
    if (image.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: 'That photo is too large.' }, 413)

    try {
      return json(await deps.readBand(image, mediaType as MediaType, userId))
    } catch (err) {
      if (err instanceof SparkRefused) return json({ error: err.message }, 429)
      console.error('scan-band failed', err)
      return json({ error: "Couldn't read the band right now. Type it in instead." }, 502)
    }
  }
}

export const defaultDeps: Deps = {
  async verifyUser(token) {
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) return null
    const { data, error } = await createClient(url, key).auth.getUser(token)
    return error ? null : data.user?.id ?? null
  },

  async readBand(image, mediaType, userId) {
    const base = process.env.SPARK_URL
    const coreToken = process.env.SPARK_CORE_TOKEN
    if (!base || !coreToken) throw new Error('SPARK_URL and SPARK_CORE_TOKEN must be set')
    const form = new FormData()
    form.append('module_id', 'cellar')
    form.append('kind', 'cigar_band')
    form.append('file', new Blob([Buffer.from(image, 'base64')], { type: mediaType }), 'band.' + mediaType.split('/')[1])
    const res = await fetch(new URL('/v1/extract', base), {
      method: 'POST',
      // X-Subject and X-App let SPARK's meter apply the per-user and per-app spending caps.
      headers: { 'X-Core-Token': coreToken, 'X-App': 'cellar', 'X-Subject': userId, 'X-Feature': 'scan-band' },
      body: form,
    })
    const body = await res.json().catch(() => ({}))
    if (res.status === 429) throw new SparkRefused(body.detail ?? "You've hit today's scan limit. Type it in for now.")
    if (!res.ok) throw new Error(`SPARK ${res.status}: ${body.detail ?? 'no detail'}`)
    return toReading(body.extracted ?? null)
  },
}

export const POST = createHandler(defaultDeps)
