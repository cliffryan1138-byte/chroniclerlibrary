import { emptyFamilyVector, familyOf } from './taxonomy'
import type { DescriptorId, FamilyId, Intensity, Item, Log, LogTag, SeedProfile, Taxonomy, TasteProfile } from './types'

/** 5 → +1, 4 → +0.5, 3 → 0 (neutral), 2 → -0.5, 1 → -1. Dislikes push a note down. */
export function ratingWeight(rating: number): number {
  return (rating - 3) / 2
}

/** Intensity 2 ("present") is the neutral multiplier, so a plain tap in simple mode counts as 1. */
export function intensityFactor(intensity: Intensity): number {
  return intensity / 2
}

const DEFAULT_COLD_START_LOGS = 10

/**
 * Resolve one log's tags to a single intensity per family and per descriptor.
 * The family roll-up takes the max across the log, so tapping a family once (simple)
 * and tagging two of its descriptors across three thirds (detailed) count the same at family level.
 */
export function rollUpLogTags(tags: LogTag[], taxonomy: Taxonomy) {
  const families = new Map<FamilyId, Intensity>()
  const descriptors = new Map<DescriptorId, Intensity>()
  const knownFamilies = new Set(taxonomy.families.map((f) => f.id))
  for (const tag of tags) {
    const family = tag.descriptor ? familyOf(taxonomy, tag.descriptor) : tag.family
    if (!family || !knownFamilies.has(family)) continue
    families.set(family, Math.max(families.get(family) ?? 0, tag.intensity) as Intensity)
    if (tag.descriptor) {
      descriptors.set(tag.descriptor, Math.max(descriptors.get(tag.descriptor) ?? 0, tag.intensity) as Intensity)
    }
  }
  return { families, descriptors }
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n))

/** Profile learned from logs alone. Each tag is weighted by its log's rating. */
export function profileFromLogs(logs: Log[], items: Item[], taxonomy: Taxonomy): TasteProfile {
  const families = emptyFamilyVector(taxonomy)
  const descriptorSums: Record<DescriptorId, number> = {}
  const itemsById = new Map(items.map((i) => [i.id, i]))
  let strengthSum = 0
  let strengthWeight = 0

  for (const log of logs) {
    const w = ratingWeight(log.overallRating)
    const rolled = rollUpLogTags(log.tags, taxonomy)
    for (const [family, intensity] of rolled.families) families[family] += w * intensityFactor(intensity)
    for (const [descriptor, intensity] of rolled.descriptors) {
      descriptorSums[descriptor] = (descriptorSums[descriptor] ?? 0) + w * intensityFactor(intensity)
    }
    // Strength preference leans on what was enjoyed: a 5 counts 3x, a 3 counts 1x, 1-2 not at all.
    const strength = itemsById.get(log.itemId)?.strength
    const sw = Math.max(0, log.overallRating - 2)
    if (strength != null && sw > 0) {
      strengthSum += sw * strength
      strengthWeight += sw
    }
  }

  const n = logs.length || 1
  for (const f of Object.keys(families)) families[f] = clamp(families[f] / n)
  const descriptors = Object.fromEntries(Object.entries(descriptorSums).map(([d, v]) => [d, clamp(v / n)]))
  return {
    families,
    descriptors,
    strength: strengthWeight ? strengthSum / strengthWeight : null,
    logCount: logs.length,
    source: logs.length ? 'logs' : 'empty',
  }
}

/** Translate quiz answers onto the same scale a 5-star log with a plain tag would produce. */
export function profileFromSeed(seed: SeedProfile, taxonomy: Taxonomy): TasteProfile {
  const families = emptyFamilyVector(taxonomy)
  for (const f of seed.likedFamilies) if (f in families) families[f] = 1
  for (const f of seed.dislikedFamilies ?? []) if (f in families) families[f] = -1
  return { families, descriptors: {}, strength: seed.strength, logCount: 0, source: 'seed' }
}

export interface BuildProfileInput {
  logs: Log[]
  items: Item[]
  taxonomy: Taxonomy
  seed?: SeedProfile | null
  coldStartLogs?: number
}

/**
 * The derived taste profile. With a quiz seed and few logs it blends the two, sliding
 * linearly from all-seed (0 logs) to all-logs (coldStartLogs logs).
 */
export function buildProfile({ logs, items, taxonomy, seed, coldStartLogs = DEFAULT_COLD_START_LOGS }: BuildProfileInput): TasteProfile {
  const learned = profileFromLogs(logs, items, taxonomy)
  if (!seed || logs.length >= coldStartLogs) return learned
  const seeded = profileFromSeed(seed, taxonomy)
  if (!logs.length) return seeded

  const alpha = logs.length / coldStartLogs
  const families = emptyFamilyVector(taxonomy)
  for (const f of Object.keys(families)) families[f] = alpha * learned.families[f] + (1 - alpha) * seeded.families[f]
  let strength = learned.strength ?? seeded.strength
  if (learned.strength != null && seeded.strength != null) strength = alpha * learned.strength + (1 - alpha) * seeded.strength
  return { families, descriptors: learned.descriptors, strength, logCount: logs.length, source: 'blended' }
}

/** Families sorted strongest-liked first, positives only. */
export function topFamilies(profile: TasteProfile, limit = 3): FamilyId[] {
  return Object.entries(profile.families)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([f]) => f)
}
