import type { Item, Log, LogTag, Rating, Taxonomy } from '../src/core'

// Neutral test vocabulary: the engine tests must not depend on any branch.
export const taxonomy: Taxonomy = {
  families: [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
    { id: 'gamma', label: 'Gamma' },
    { id: 'delta', label: 'Delta' },
  ],
  descriptors: [
    { id: 'a1', label: 'A one', family: 'alpha' },
    { id: 'a2', label: 'A two', family: 'alpha' },
    { id: 'b1', label: 'B one', family: 'beta' },
    { id: 'g1', label: 'G one', family: 'gamma' },
  ],
}

export const item = (id: string, strength: number | null, tags: [string, number][] = [], status: Item['status'] = 'curated'): Item => ({
  id, category: 'thing', brand: 'B', name: `Item ${id}`, attributes: {}, strength, status,
  tags: tags.map(([family, weight]) => ({ family, weight })),
})

let n = 0
export const log = (itemId: string, rating: Rating, tags: LogTag[]): Log => ({
  id: `log${++n}`, userId: 'u1', itemId, loggedAt: '2026-01-01T00:00:00Z', overallRating: rating, wouldBuyAgain: null, tags,
})

export const fam = (family: string, intensity: 1 | 2 | 3 = 2): LogTag => ({ descriptor: null, family, third: null, intensity })
export const desc = (descriptor: string, family: string, intensity: 1 | 2 | 3 = 2, third: 1 | 2 | 3 | null = null): LogTag => ({ descriptor, family, third, intensity })
