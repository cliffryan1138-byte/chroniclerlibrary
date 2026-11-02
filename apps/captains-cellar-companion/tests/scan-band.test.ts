import { describe, expect, it } from 'vitest'
import { createHandler, MAX_IMAGE_BYTES, type BandReading, type Deps } from '../api/scan-band'

const reading: BandReading = { found: true, maker: 'Test Maker', name: 'Maduro Robusto', confidence: 'high' }
const deps = (over: Partial<Deps> = {}): Deps => ({
  verifyUser: async (t) => (t === 'good' ? 'user-1' : null),
  readBand: async () => reading,
  ...over,
})
const post = (body: unknown, token: string | null = 'good') =>
  new Request('https://x/api/scan-band', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

describe('POST /api/scan-band', () => {
  it('returns the reading for a signed-in user', async () => {
    const res = await createHandler(deps())(post({ image: 'aGVsbG8=', mediaType: 'image/jpeg' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(reading)
  })

  it('rejects callers without a valid session, before spending anything', async () => {
    let called = false
    const handler = createHandler(deps({ readBand: async () => { called = true; return reading } }))
    expect((await handler(post({ image: 'x', mediaType: 'image/jpeg' }, null))).status).toBe(401)
    expect((await handler(post({ image: 'x', mediaType: 'image/jpeg' }, 'bad'))).status).toBe(401)
    expect(called).toBe(false)
  })

  it('validates the body', async () => {
    const handler = createHandler(deps())
    expect((await handler(post('not json'))).status).toBe(400)
    expect((await handler(post({ mediaType: 'image/jpeg' }))).status).toBe(400)
    expect((await handler(post({ image: 'x', mediaType: 'application/pdf' }))).status).toBe(400)
    expect((await handler(post({ image: 'a'.repeat(Math.ceil(MAX_IMAGE_BYTES / 0.75) + 8), mediaType: 'image/png' }))).status).toBe(413)
  })

  it('turns an upstream failure into a friendly 502', async () => {
    const handler = createHandler(deps({ readBand: async () => { throw new Error('boom') } }))
    const res = await handler(post({ image: 'x', mediaType: 'image/jpeg' }))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/Type it in/)
  })
})
