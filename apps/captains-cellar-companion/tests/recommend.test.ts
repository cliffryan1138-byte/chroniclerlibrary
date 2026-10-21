import { describe, expect, it } from 'vitest'
import { aggregateCommunityTags, buildProfile, cosine, recommend, scorePairing } from '../src/core'
import { fam, item, log, taxonomy } from './fixtures'

const catalog = [
  item('alphaMild', 2, [['alpha', 1]]),
  item('alphaFull', 5, [['alpha', 1]]),
  item('beta', 2, [['beta', 1]]),
  item('gamma', 3, [['gamma', 1], ['delta', 0.4]]),
  item('pending', 2, [['alpha', 1]], 'user_added_pending'),
]

const profileFor = (seed: { likedFamilies: string[]; dislikedFamilies?: string[]; strength: number | null }) =>
  buildProfile({ logs: [], items: catalog, taxonomy, seed })

describe('recommend', () => {
  it('ranks items that share liked families first', () => {
    const recs = recommend({ profile: profileFor({ likedFamilies: ['alpha'], strength: null }), items: catalog, taxonomy })
    expect(recs.slice(0, 2).map((r) => r.item.id).sort()).toEqual(['alphaFull', 'alphaMild'])
  })

  it('uses strength preference to break flavor ties', () => {
    const recs = recommend({ profile: profileFor({ likedFamilies: ['alpha'], strength: 5 }), items: catalog, taxonomy })
    expect(recs[0].item.id).toBe('alphaFull')
  })

  it('pushes disliked families down', () => {
    const recs = recommend({ profile: profileFor({ likedFamilies: [], dislikedFamilies: ['beta'], strength: null }), items: catalog, taxonomy })
    expect(recs.at(-1)!.item.id).toBe('beta')
  })

  it('never returns logged items or pending user submissions', () => {
    const recs = recommend({ profile: profileFor({ likedFamilies: ['alpha'], strength: 2 }), items: catalog, taxonomy, excludeItemIds: ['alphaMild'] })
    const ids = recs.map((r) => r.item.id)
    expect(ids).not.toContain('alphaMild')
    expect(ids).not.toContain('pending')
  })

  it('respects the limit and returns scores between 0 and 1, sorted', () => {
    const recs = recommend({ profile: profileFor({ likedFamilies: ['alpha'], strength: 3 }), items: catalog, taxonomy, limit: 3 })
    expect(recs).toHaveLength(3)
    for (const r of recs) {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(1)
    }
    expect(recs.map((r) => r.score)).toEqual([...recs.map((r) => r.score)].sort((a, b) => b - a))
  })

  it('gives a plain-English one-line reason naming the matched family and strength', () => {
    const [top] = recommend({ profile: profileFor({ likedFamilies: ['alpha'], strength: 2 }), items: catalog, taxonomy, strengthLabel: () => 'Gentle' })
    expect(top.item.id).toBe('alphaMild')
    expect(top.matchedFamilies).toEqual(['alpha'])
    expect(top.reason).toBe('Leans Alpha, a note you keep coming back to, at the Gentle strength you lean toward.')
    expect(top.reason).not.toContain('\n')
  })

  it('only mentions strength when the item is in the same strength band as the user', () => {
    const band = (s: number) => (s < 3 ? 'Low' : 'High')
    const recs = recommend({ profile: profileFor({ likedFamilies: ['alpha'], strength: 5 }), items: catalog, taxonomy, strengthLabel: band })
    expect(recs.find((r) => r.item.id === 'alphaFull')!.reason).toContain('High strength')
    expect(recs.find((r) => r.item.id === 'alphaMild')!.reason).not.toContain('strength')
  })

  it('learns from logs, not just the seed', () => {
    const logs = Array.from({ length: 10 }, () => log('beta', 5, [fam('gamma')]))
    const profile = buildProfile({ logs, items: catalog, taxonomy, seed: { likedFamilies: ['alpha'], strength: null } })
    const [top] = recommend({ profile, items: catalog, taxonomy, excludeItemIds: ['beta'] })
    expect(top.item.id).toBe('gamma')
  })

  it('folds community tags into an item vector', () => {
    const untagged = [item('x', 3), item('y', 3)]
    const community = aggregateCommunityTags([log('x', 4, [fam('delta')]), log('x', 2, [fam('delta')]), log('y', 4, [fam('beta')])], taxonomy)
    expect(community.x.delta).toBe(1)
    const recs = recommend({ profile: profileFor({ likedFamilies: ['delta'], strength: null }), items: untagged, taxonomy, community })
    expect(recs[0].item.id).toBe('x')
  })
})

describe('helpers', () => {
  it('cosine handles zero vectors', () => expect(cosine({ a: 0 }, { a: 1 })).toBe(0))
  it('pairing is a stub that scores nothing yet', () => {
    expect(scorePairing({ families: {}, strength: null }, { families: {}, strength: null }).score).toBeNull()
  })
})
