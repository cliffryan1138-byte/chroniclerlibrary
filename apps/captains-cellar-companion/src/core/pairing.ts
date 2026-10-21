import type { ItemVector } from './recommend'

export interface PairingScore {
  score: number | null
  reason: string
}

/** Phase 1 stub. Cross-category pairing (e.g. one branch's item against another's) lands later. */
export function scorePairing(_a: ItemVector, _b: ItemVector): PairingScore {
  return { score: null, reason: 'Pairing suggestions are coming in a later release.' }
}
