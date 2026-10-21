import type { DescriptorId, FamilyId, Taxonomy } from './types'

/** Throws if ids repeat or a descriptor points at a family that doesn't exist. */
export function validateTaxonomy(taxonomy: Taxonomy): void {
  const familyIds = new Set<FamilyId>()
  for (const f of taxonomy.families) {
    if (familyIds.has(f.id)) throw new Error(`Duplicate family id: ${f.id}`)
    familyIds.add(f.id)
  }
  const descriptorIds = new Set<DescriptorId>()
  for (const d of taxonomy.descriptors) {
    if (descriptorIds.has(d.id)) throw new Error(`Duplicate descriptor id: ${d.id}`)
    if (familyIds.has(d.id)) throw new Error(`Descriptor id collides with a family id: ${d.id}`)
    if (!familyIds.has(d.family)) throw new Error(`Descriptor ${d.id} maps to unknown family ${d.family}`)
    descriptorIds.add(d.id)
  }
}

export function familyOf(taxonomy: Taxonomy, descriptor: DescriptorId): FamilyId | null {
  return taxonomy.descriptors.find((d) => d.id === descriptor)?.family ?? null
}

export function familyLabel(taxonomy: Taxonomy, family: FamilyId): string {
  return taxonomy.families.find((f) => f.id === family)?.label ?? family
}

export function emptyFamilyVector(taxonomy: Taxonomy): Record<FamilyId, number> {
  return Object.fromEntries(taxonomy.families.map((f) => [f.id, 0]))
}
