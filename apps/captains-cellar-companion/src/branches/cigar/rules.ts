import type { BranchSpec } from '../../core'
import { cigarTaxonomy } from './taxonomy'

export const CATEGORY = 'cigar'

/** Simple mode shows strength as three words; the 1-5 scale lives underneath. */
export function strengthLabel(strength: number): 'Mild' | 'Medium' | 'Full' {
  if (strength < 2.5) return 'Mild'
  if (strength < 3.5) return 'Medium'
  return 'Full'
}

export const SIMPLE_STRENGTH_OPTIONS = [
  { label: 'Mild', value: 2 },
  { label: 'Medium', value: 3 },
  { label: 'Full', value: 4 },
] as const

/** Offer detailed mode once, after this many logs. */
export const DETAILED_OFFER_AFTER_LOGS = 15
export const COLD_START_LOGS = 10

export const THIRDS = [
  { value: 1, label: 'First third' },
  { value: 2, label: 'Second third' },
  { value: 3, label: 'Final third' },
] as const

/** 1-5 scores captured in detailed mode, stored in logs.details. */
export const DETAIL_SCORES = [
  { key: 'strength', label: 'Strength', low: 'Mild', high: 'Full' },
  { key: 'body', label: 'Body', low: 'Light', high: 'Heavy' },
  { key: 'finish_length', label: 'Finish length', low: 'Short', high: 'Long' },
  { key: 'draw', label: 'Draw', low: 'Tight', high: 'Open' },
  { key: 'burn', label: 'Burn', low: 'Uneven', high: 'Razor-straight' },
  { key: 'construction', label: 'Construction', low: 'Rough', high: 'Flawless' },
] as const

export const DETAIL_TEXT = [
  { key: 'retrohale', label: 'Retrohale notes', placeholder: 'What came through the nose?' },
  { key: 'finish', label: 'Finish notes', placeholder: 'What lingered after the draw?' },
] as const

/** Keys allowed in items.attributes for a cigar. */
export const ATTRIBUTE_FIELDS = [
  { key: 'vitola', label: 'Vitola' },
  { key: 'ring_gauge', label: 'Ring gauge' },
  { key: 'length', label: 'Length (in)' },
  { key: 'wrapper', label: 'Wrapper' },
  { key: 'binder', label: 'Binder' },
  { key: 'filler', label: 'Filler' },
  { key: 'origin', label: 'Origin' },
] as const

export interface CigarAttributes {
  vitola?: string
  ring_gauge?: number
  length?: number
  wrapper?: string
  binder?: string
  filler?: string
  origin?: string
}

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'Vitola', meaning: 'The size and shape of a cigar, e.g. robusto, toro, churchill.' },
  { term: 'Ring gauge', meaning: 'Diameter in 64ths of an inch. A 50 ring is 50/64".' },
  { term: 'Wrapper', meaning: 'The outer leaf. It drives much of the look and a big share of the flavor.' },
  { term: 'Binder', meaning: 'The leaf that holds the filler together under the wrapper.' },
  { term: 'Filler', meaning: 'The blend of leaves inside. Where most of the strength comes from.' },
  { term: 'Strength', meaning: 'How much nicotine punch you feel. Not the same as flavor.' },
  { term: 'Body', meaning: 'How rich and heavy the smoke feels in the mouth.' },
  { term: 'Draw', meaning: 'How easily air pulls through. Too tight is work; too open burns hot.' },
  { term: 'Burn', meaning: 'How evenly the ash line moves. Canoeing or tunneling means an uneven burn.' },
  { term: 'Thirds', meaning: 'A cigar often changes as it burns. Tasters split it into first, second, and final third.' },
  { term: 'Retrohale', meaning: 'Pushing a little smoke out through the nose to pick up aromas the tongue misses.' },
  { term: 'Finish', meaning: 'The flavor that lingers after you exhale.' },
]

export const cigarBranch: BranchSpec = {
  category: CATEGORY,
  taxonomy: cigarTaxonomy,
  strengthLabel,
  coldStartLogs: COLD_START_LOGS,
}
