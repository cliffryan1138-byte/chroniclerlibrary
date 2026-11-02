import { describe, expect, it } from 'vitest'
import { createHandler, defaultDeps, MAX_IMAGE_BYTES, SparkRefused, toReading, type BandReading, type Deps } from '../api/scan-band'

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

  it('passes the signed-in user to SPARK so per-user caps apply', async () => {
    let seenUser = ''
    await createHandler(deps({ readBand: async (_i, _m, u) => { seenUser = u; return reading } }))(post({ image: 'x', mediaType: 'image/jpeg' }))
    expect(seenUser).toBe('user-1')
  })

  it('shows a spending-cap refusal as-is', async () => {
    const handler = createHandler(deps({ readBand: async () => { throw new SparkRefused('Daily limit reached.') } }))
    const res = await handler(post({ image: 'x', mediaType: 'image/jpeg' }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toBe('Daily limit reached.')
  })

  it('turns an upstream failure into a friendly 502', async () => {
    const handler = createHandler(deps({ readBand: async () => { throw new Error('boom') } }))
    const res = await handler(post({ image: 'x', mediaType: 'image/jpeg' }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toMatch(/Type it in/)
    expect(body.code).toBe('unexpected')
  })

  it('names a broken link to SPARK with a short code', async () => {
    const handler = createHandler(deps())
    const cases: [Record<string, string | undefined>, string][] = [
      [{ SPARK_URL: undefined, SPARK_CORE_TOKEN: 'tok' }, 'config-missing'],
      [{ SPARK_URL: 'chronicler-spark.example', SPARK_CORE_TOKEN: 'tok' }, 'config-bad-url'],
    ]
    for (const [env, code] of cases) {
      Object.assign(process.env, env)
      if (env.SPARK_URL === undefined) delete process.env.SPARK_URL
      const real = createHandler({ ...deps(), readBand: defaultDeps.readBand })
      const res = await real(post({ image: 'aGVsbG8=', mediaType: 'image/jpeg' }))
      expect((await res.json()).code).toBe(code)
    }
    void handler
  })
})

describe('SPARK cigar_band record -> log form', () => {
  it('joins line and size into the Cigar line and buckets confidence', () => {
    expect(toReading({ maker: 'Test Maker', line: 'Maduro', vitola: 'Robusto', confidence: 0.9 }))
      .toEqual({ found: true, maker: 'Test Maker', name: 'Maduro Robusto', confidence: 'high' })
    expect(toReading({ maker: 'Test Maker', line: null, vitola: null, confidence: 0.6 }).confidence).toBe('medium')
  })
  it('treats an unread band as not found', () => {
    expect(toReading(null).found).toBe(false)
    expect(toReading({ maker: null, line: null, vitola: 'Toro', confidence: 0.2 }).found).toBe(false)
  })
})

describe('the request sent to SPARK', () => {
  it('is a multipart /v1/extract for module cellar with the install token and the user as subject', async () => {
    process.env.SPARK_URL = 'https://spark.example'
    process.env.SPARK_CORE_TOKEN = 'tok'
    const calls: { url: string; init: RequestInit }[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! })
      return new Response(JSON.stringify({ extracted: { maker: 'A', line: 'B', vitola: null, confidence: 0.9 } }))
    }) as typeof fetch
    try {
      const out = await defaultDeps.readBand('aGVsbG8=', 'image/jpeg', 'user-9')
      expect(out).toEqual({ found: true, maker: 'A', name: 'B', confidence: 'high' })
    } finally {
      globalThis.fetch = realFetch
    }
    const { url, init } = calls[0]
    expect(url).toBe('https://spark.example/v1/extract')
    expect(init.headers).toMatchObject({ 'X-Core-Token': 'tok', 'X-App': 'cellar', 'X-Subject': 'user-9' })
    const form = init.body as FormData
    expect(form.get('module_id')).toBe('cellar')
    expect(form.get('kind')).toBe('cigar_band')
    expect(await (form.get('file') as Blob).text()).toBe('hello')
  })
})
