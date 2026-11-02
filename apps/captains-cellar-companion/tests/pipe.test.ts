import { describe, expect, it } from 'vitest'
import { BLEND_STYLES, sampleCatalog, STYLE_GUIDE } from '../src/branches/pipe'

describe('pipe tobacco style guide', () => {
  it('describes every style, once', () => {
    expect(new Set(BLEND_STYLES).size).toBe(STYLE_GUIDE.length)
    for (const s of STYLE_GUIDE) expect(s.description.length).toBeGreaterThan(20)
  })
  it('every sample blend sits in a style the guide describes', () => {
    for (const item of sampleCatalog) expect(BLEND_STYLES).toContain(item.attributes.blend_style)
  })
})

describe('pipe collection guides', () => {
  it('describes every shape and material once, with an Other to fall back on', async () => {
    const { PIPE_SHAPES, PIPE_MATERIALS } = await import('../src/branches/pipe/rules')
    for (const guide of [PIPE_SHAPES, PIPE_MATERIALS]) {
      expect(new Set(guide.map((g) => g.id)).size).toBe(guide.length)
      for (const g of guide) expect(g.description.length).toBeGreaterThan(20)
      expect(guide.at(-1)!.id).toBe('Other')
    }
  })
  it('the pipe branch offers a collection grouped by a field it actually has; cigars have none', async () => {
    const { branchFor } = await import('../src/app/branch')
    const spec = branchFor('pipe_tobacco')!.collection!
    expect(spec.fields.map((f) => f.key)).toContain(spec.groupBy)
    expect(branchFor('cigar')!.collection).toBeNull()
  })
})
