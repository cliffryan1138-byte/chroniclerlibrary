import { intensityFactor, rollUpLogTags } from './profile'
import { emptyFamilyVector, familyLabel, familyOf } from './taxonomy'
import type { FamilyId, Item, Log, Taxonomy, TasteProfile } from './types'

export interface ItemVector {
  families: Record<FamilyId, number>
  strength: number | null
}

/** Per item, the share of its logs that noted each family (scaled by intensity). */
export type CommunityAggregates = Record<string, Record<FamilyId, number>>

/** Aggregate many users' logs into per-item family weights. Server code can produce the same shape in SQL. */
export function aggregateCommunityTags(logs: Log[], taxonomy: Taxonomy): CommunityAggregates {
  const sums: Record<string, Record<FamilyId, number>> = {}
  const counts: Record<string, number> = {}
  for (const log of logs) {
    const rolled = rollUpLogTags(log.tags, taxonomy)
    sums[log.itemId] ??= emptyFamilyVector(taxonomy)
    counts[log.itemId] = (counts[log.itemId] ?? 0) + 1
    for (const [family, intensity] of rolled.families) sums[log.itemId][family] += intensityFactor(intensity)
  }
  const out: CommunityAggregates = {}
  for (const [itemId, fam] of Object.entries(sums)) {
    out[itemId] = Object.fromEntries(Object.entries(fam).map(([f, v]) => [f, v / counts[itemId]]))
  }
  return out
}

/** An item's flavor vector: curated tags, blended with community logs when there are any. */
export function itemVector(item: Item, taxonomy: Taxonomy, community?: Record<FamilyId, number>): ItemVector {
  const curated = emptyFamilyVector(taxonomy)
  for (const tag of item.tags ?? []) {
    const family = tag.descriptor ? familyOf(taxonomy, tag.descriptor) ?? tag.family : tag.family
    if (family in curated) curated[family] = Math.max(curated[family], tag.weight)
  }
  const hasCurated = Object.values(curated).some((v) => v > 0)
  if (!community) return { families: curated, strength: item.strength }

  const families = emptyFamilyVector(taxonomy)
  for (const f of Object.keys(families)) {
    const c = community[f] ?? 0
    families[f] = hasCurated ? 0.6 * curated[f] + 0.4 * c : c
  }
  return { families, strength: item.strength }
}

export function cosine(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0, na = 0, nb = 0
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? 0, y = b[k] ?? 0
    dot += x * y; na += x * x; nb += y * y
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export interface Recommendation {
  item: Item
  /** 0-1. */
  score: number
  reason: string
  matchedFamilies: FamilyId[]
}

export interface RecommendInput {
  profile: TasteProfile
  items: Item[]
  taxonomy: Taxonomy
  /** Items the user has already logged; never recommended. */
  excludeItemIds?: Iterable<string>
  community?: CommunityAggregates
  limit?: number
  strengthLabel?: (strength: number) => string
}

const FLAVOR_WEIGHT = 0.75
const STRENGTH_WEIGHT = 0.25

/** Content-based recommendations: score unlogged curated items against the profile. */
export function recommend({ profile, items, taxonomy, excludeItemIds = [], community = {}, limit = 5, strengthLabel = (s) => `${Math.round(s)}/5` }: RecommendInput): Recommendation[] {
  const exclude = new Set(excludeItemIds)
  return items
    .filter((item) => item.status === 'curated' && !exclude.has(item.id))
    .map((item) => {
      const vec = itemVector(item, taxonomy, community[item.id])
      const flavor = (cosine(profile.families, vec.families) + 1) / 2
      const strengthFit = profile.strength != null && vec.strength != null ? 1 - Math.abs(profile.strength - vec.strength) / 4 : 0.5
      const matched = Object.keys(vec.families)
        .filter((f) => vec.families[f] > 0 && profile.families[f] > 0)
        .sort((a, b) => vec.families[b] * profile.families[b] - vec.families[a] * profile.families[a])
        .slice(0, 2)
      return {
        item,
        score: FLAVOR_WEIGHT * flavor + STRENGTH_WEIGHT * strengthFit,
        matchedFamilies: matched,
        reason: explain(matched, vec, profile, taxonomy, strengthLabel),
      }
    })
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
}

function explain(matched: FamilyId[], vec: ItemVector, profile: TasteProfile, taxonomy: Taxonomy, strengthLabel: (s: number) => string): string {
  const names = matched.map((f) => familyLabel(taxonomy, f))
  // Only claim a strength match when the item lands in the same labelled band as the user's preference.
  const sameBand = profile.strength != null && vec.strength != null && strengthLabel(vec.strength) === strengthLabel(profile.strength)
  const strengthPart = sameBand ? `, at the ${strengthLabel(vec.strength!)} strength you lean toward` : ''
  if (names.length === 2) return `Heavy on ${names[0]} and ${names[1]}, two notes you rate highly${strengthPart}.`
  if (names.length === 1) return `Leans ${names[0]}, a note you keep coming back to${strengthPart}.`
  const lead = Object.entries(vec.families).sort((a, b) => b[1] - a[1])[0]
  const leadName = lead && lead[1] > 0 ? familyLabel(taxonomy, lead[0]) : 'something new'
  return `A change of pace: mostly ${leadName}${strengthPart}.`
}
