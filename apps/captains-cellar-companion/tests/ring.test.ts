import { describe, expect, it } from 'vitest'
import { lengthLabel, NEW_ITEM_FIELDS, RING_GROUPS, ringGroupOf, ringLabel, sampleCatalog, widestRing } from '../src/branches/cigar'

describe('cigar size labels', () => {
  it('writes lengths in eighths, the way bands and boxes do', () => {
    expect(lengthLabel(6)).toBe('6"')
    expect(lengthLabel(6.125)).toBe('6⅛"')
    expect(lengthLabel(5.625)).toBe('5⅝"')
    expect(lengthLabel(4.5)).toBe('4½"')
    expect(lengthLabel(7.6)).toBe('7.6"') // not an eighth: left as given
  })
  it('names the ring, including two-ring shapes', () => {
    expect(ringLabel({ ring_gauge: 54 })).toBe('54 ring')
    expect(ringLabel({ ring_gauge: 49, ring_gauge_range: '42/49' })).toBe('42/49 ring')
    expect(ringLabel({})).toBeNull()
  })
})

describe('ring groups', () => {
  it('groups by the widest ring: thin under 44, medium 44-51, thick 52 and up', () => {
    expect(ringGroupOf({ ring_gauge: 38 })).toBe('thin')
    expect(ringGroupOf({ ring_gauge: 43 })).toBe('thin')
    expect(ringGroupOf({ ring_gauge: 44 })).toBe('medium')
    expect(ringGroupOf({ ring_gauge: 51 })).toBe('medium')
    expect(ringGroupOf({ ring_gauge: 52 })).toBe('thick')
    expect(ringGroupOf({ ring_gauge_range: '42/49' })).toBe('medium')
    expect(ringGroupOf({})).toBe('unknown')
    expect(widestRing({ ring_gauge: 46, ring_gauge_range: '46/60' })).toBe(60)
  })
  it('describes every group, and every sample cigar lands in a real one', () => {
    for (const g of RING_GROUPS) expect(g.description.length).toBeGreaterThan(20)
    for (const c of sampleCatalog) expect(RING_GROUPS.map((g) => g.id)).toContain(ringGroupOf(c.attributes))
  })
  it('the log form only asks for sizes the catalog stores', () => {
    expect(NEW_ITEM_FIELDS.map((f) => f.key)).toEqual(['length', 'ring_gauge'])
  })
})

describe('cigar lines', () => {
  it('reads the line from the name, before the vitola', async () => {
    const { lineOf } = await import('../src/branches/cigar')
    expect(lineOf({ name: 'Hemingway Short Story', attributes: { vitola: 'Short Story' } })).toBe('Hemingway')
    expect(lineOf({ name: 'Cabaiguan Guapos Toro Grande Natural', attributes: { vitola: 'Toro Grande' } })).toBe('Cabaiguan Guapos')
    expect(lineOf({ name: 'Reserva Nicaragua 10th Belle Encre - Perfecto', attributes: { vitola: '10th Belle Encre - Perfecto' } })).toBe('Reserva Nicaragua')
    expect(lineOf({ name: 'Robusto', attributes: { vitola: 'Robusto' } })).toBeNull() // nothing before it
    expect(lineOf({ name: 'Mystery Stick', attributes: {} })).toBeNull()
    expect(lineOf({ name: 'Anything', attributes: { line: 'Stated Line', vitola: 'x' } })).toBe('Stated Line')
  })
})
