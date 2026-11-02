// Vercel Function: POST /api/scan-band
// Reads a photo of a cigar band and returns the maker and cigar name so the log form can pre-fill.
// The Anthropic key lives only here (ANTHROPIC_API_KEY on Vercel); only signed-in users can call it.
// Cigar-specific prompt on purpose: this endpoint belongs to the cigar branch of this app.

import Anthropic from '@anthropic-ai/sdk'
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

const SYSTEM = `You read cigar bands from photos for a private tasting journal.
Report the maker (the brand or manufacturer printed on the band) and the cigar's name
(line, blend, and size or vitola if the band or a secondary band shows it).
Only report text you can actually see. Never guess a brand from colors or band style alone.
If no cigar band is visible or the text is unreadable, set found to false and both fields to null.
Use the band's own spelling and capitalization.`

const SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    maker: { type: ['string', 'null'] },
    name: { type: ['string', 'null'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['found', 'maker', 'name', 'confidence'],
  additionalProperties: false,
}

export interface Deps {
  /** Resolves the bearer token to a user id, or null if it isn't a valid session. */
  verifyUser: (token: string) => Promise<string | null>
  readBand: (image: string, mediaType: MediaType) => Promise<BandReading>
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export function createHandler(deps: Deps) {
  return async function POST(request: Request): Promise<Response> {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Sign in to scan a band.' }, 401)
    if (!(await deps.verifyUser(token))) return json({ error: 'Your session expired. Sign in again.' }, 401)

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
      return json(await deps.readBand(image, mediaType as MediaType))
    } catch (err) {
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

  async readBand(image, mediaType) {
    const client = new Anthropic()
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // A false-positive safety decline retries on Anthropic's recommended fallback model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: 'What does this cigar band say?' },
        ],
      }],
    })
    if (response.stop_reason === 'refusal') return { found: false, maker: null, name: null, confidence: 'low' }
    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error(`No text in response (stop_reason ${response.stop_reason})`)
    return JSON.parse(text.text) as BandReading
  },
}

export const POST = createHandler(defaultDeps)
