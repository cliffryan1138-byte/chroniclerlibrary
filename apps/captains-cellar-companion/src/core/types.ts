// SPARK engine types. Deliberately category-agnostic: an Item can be anything a person
// tastes and rates. Branches supply the vocabulary (families, descriptors, labels).

export type FamilyId = string
export type DescriptorId = string
export type Rating = 1 | 2 | 3 | 4 | 5
export type Intensity = 1 | 2 | 3
export type Third = 1 | 2 | 3

export interface Family {
  id: FamilyId
  label: string
  blurb?: string
}

export interface Descriptor {
  id: DescriptorId
  label: string
  family: FamilyId
}

export interface Taxonomy {
  families: Family[]
  descriptors: Descriptor[]
}

export interface ItemTag {
  family: FamilyId
  descriptor?: DescriptorId | null
  /** Curator's confidence that this note is present, 0-1. */
  weight: number
}

export interface Item {
  id: string
  category: string
  brand: string
  name: string
  attributes: Record<string, unknown>
  /** 1-5, or null when unknown. */
  strength: number | null
  status: 'curated' | 'user_added_pending'
  tags?: ItemTag[]
}

export interface LogTag {
  /** null for a family-level tag (simple mode). */
  descriptor: DescriptorId | null
  family: FamilyId
  /** null when the note applies to the whole session. */
  third: Third | null
  intensity: Intensity
}

export interface Log {
  id: string
  userId: string
  itemId: string
  loggedAt: string
  overallRating: Rating
  wouldBuyAgain: boolean | null
  notes?: string | null
  /** Branch-defined extras (e.g. scores and free-text notes). The engine never reads these. */
  details?: Record<string, unknown>
  tags: LogTag[]
}

/** What an onboarding quiz produces before there are enough logs to learn from. */
export interface SeedProfile {
  likedFamilies: FamilyId[]
  dislikedFamilies?: FamilyId[]
  strength: number | null
}

export interface TasteProfile {
  /** Every taxonomy family, -1 (avoid) .. 1 (love). */
  families: Record<FamilyId, number>
  /** Only descriptors the user has actually tagged, same scale. */
  descriptors: Record<DescriptorId, number>
  /** Preferred strength 1-5, or null if unknown. */
  strength: number | null
  logCount: number
  source: 'empty' | 'seed' | 'blended' | 'logs'
}

/** A branch plugs its vocabulary and display rules into the engine through this shape. */
export interface BranchSpec {
  category: string
  taxonomy: Taxonomy
  strengthLabel: (strength: number) => string
  /** Logs needed before the profile stops leaning on the seed quiz. */
  coldStartLogs: number
}
