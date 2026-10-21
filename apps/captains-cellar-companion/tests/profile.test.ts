import { describe, expect, it } from 'vitest'
import { buildProfile, profileFromLogs, ratingWeight, topFamilies, validateTaxonomy } from '../src/core'
import { desc, fam, item, log, taxonomy } from './fixtures'

const items = [item('i1', 2), item('i2', 4), item('i3', 5)]

describe('rating weighting', () => {
  it('centers on 3: loved notes go up, disliked notes go down, meh does nothing', () => {
    expect(ratingWeight(5)).toBe(1)
    expect(ratingWeight(3)).toBe(0)
    expect(ratingWeight(1)).toBe(-1)
    const p = profileFromLogs([log('i1', 5, [fam('alpha')]), log('i2', 1, [fam('beta')]), log('i3', 3, [fam('gamma')])], items, taxonomy)
    expect(p.families.alpha).toBeGreaterThan(0)
    expect(p.families.beta).toBeLessThan(0)
    expect(p.families.gamma).toBe(0)
  })

  it('a higher rating weighs a tag more than a lower one', () => {
    const p = profileFromLogs([log('i1', 5, [fam('alpha')]), log('i2', 4, [fam('beta')])], items, taxonomy)
    expect(p.families.alpha).toBeGreaterThan(p.families.beta)
  })

  it('intensity scales the contribution', () => {
    const strong = profileFromLogs([log('i1', 5, [fam('alpha', 3)])], items, taxonomy)
    const faint = profileFromLogs([log('i1', 5, [fam('alpha', 1)])], items, taxonomy)
    expect(strong.families.alpha).toBeGreaterThan(faint.families.alpha)
  })

  it('values stay within -1..1 and every family is present', () => {
    const p = profileFromLogs([log('i1', 5, [fam('alpha', 3)])], items, taxonomy)
    expect(Object.keys(p.families).sort()).toEqual(['alpha', 'beta', 'delta', 'gamma'])
    for (const v of Object.values(p.families)) expect(Math.abs(v)).toBeLessThanOrEqual(1)
  })

  it('strength preference follows what was enjoyed, ignoring disliked items', () => {
    const p = profileFromLogs([log('i3', 5, [fam('alpha')]), log('i1', 1, [fam('alpha')])], items, taxonomy)
    expect(p.strength).toBe(5)
  })
})

describe('family roll-up', () => {
  it('descriptors roll up to their family from the taxonomy, not the stored family', () => {
    const p = profileFromLogs([log('i1', 5, [desc('a1', 'beta')])], items, taxonomy)
    expect(p.families.alpha).toBe(1)
    expect(p.families.beta).toBe(0)
    expect(p.descriptors.a1).toBe(1)
  })

  it('unknown descriptors and families are ignored', () => {
    const p = profileFromLogs([log('i1', 5, [desc('zz', 'nope'), fam('nope')])], items, taxonomy)
    expect(Object.values(p.families).every((v) => v === 0)).toBe(true)
  })

  it('several descriptors of one family in one log count once at family level', () => {
    const p = profileFromLogs([log('i1', 5, [desc('a1', 'alpha'), desc('a2', 'alpha')])], items, taxonomy)
    expect(p.families.alpha).toBe(1)
  })
})

describe('simple vs detailed parity', () => {
  it('a family tap and a descriptor-by-thirds log of the same family produce the same family weights', () => {
    const simple = profileFromLogs([log('i1', 5, [fam('alpha'), fam('beta')])], items, taxonomy)
    const detailed = profileFromLogs([
      log('i1', 5, [desc('a1', 'alpha', 2, 1), desc('a2', 'alpha', 2, 2), desc('a1', 'alpha', 2, 3), desc('b1', 'beta', 2, 2)]),
    ], items, taxonomy)
    expect(detailed.families).toEqual(simple.families)
  })

  it('mixed simple and detailed logs feed one profile', () => {
    const p = profileFromLogs([log('i1', 5, [fam('alpha')]), log('i2', 5, [desc('a2', 'alpha')])], items, taxonomy)
    expect(p.families.alpha).toBe(1)
    expect(topFamilies(p)).toEqual(['alpha'])
  })
})

describe('cold start', () => {
  const seed = { likedFamilies: ['delta'], dislikedFamilies: ['beta'], strength: 2 }

  it('with no logs the profile is the quiz seed', () => {
    const p = buildProfile({ logs: [], items, taxonomy, seed })
    expect(p.source).toBe('seed')
    expect(p.families.delta).toBe(1)
    expect(p.families.beta).toBe(-1)
    expect(p.strength).toBe(2)
  })

  it('blends seed and logs until the cold-start threshold', () => {
    const logs = [log('i3', 5, [fam('alpha')])]
    const p = buildProfile({ logs, items, taxonomy, seed, coldStartLogs: 4 })
    expect(p.source).toBe('blended')
    expect(p.families.alpha).toBeCloseTo(0.25)
    expect(p.families.delta).toBeCloseTo(0.75)
    expect(p.strength).toBeCloseTo(0.25 * 5 + 0.75 * 2)
  })

  it('ignores the seed once there are enough logs', () => {
    const logs = Array.from({ length: 4 }, () => log('i3', 5, [fam('alpha')]))
    const p = buildProfile({ logs, items, taxonomy, seed, coldStartLogs: 4 })
    expect(p.source).toBe('logs')
    expect(p.families.delta).toBe(0)
  })

  it('an empty user with no quiz gets an empty profile', () => {
    expect(buildProfile({ logs: [], items, taxonomy }).source).toBe('empty')
  })
})

describe('taxonomy validation', () => {
  it('accepts the fixture', () => expect(() => validateTaxonomy(taxonomy)).not.toThrow())
  it('rejects a descriptor pointing at a missing family', () => {
    expect(() => validateTaxonomy({ ...taxonomy, descriptors: [{ id: 'x', label: 'X', family: 'missing' }] })).toThrow()
  })
  it('rejects duplicate descriptor ids', () => {
    expect(() => validateTaxonomy({ ...taxonomy, descriptors: [taxonomy.descriptors[0], taxonomy.descriptors[0]] })).toThrow()
  })
})
