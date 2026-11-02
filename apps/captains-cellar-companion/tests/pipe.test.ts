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
