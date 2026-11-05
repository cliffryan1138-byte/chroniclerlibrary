import type { BranchSpec } from '../../core'
import { cigarTaxonomy } from './taxonomy'

export const CATEGORY = 'cigar'
export const DISPLAY_NAME = 'Cigars'

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

export const STAGES = [
  { value: 1, label: 'First third', short: 'First' },
  { value: 2, label: 'Second third', short: 'Second' },
  { value: 3, label: 'Final third', short: 'Final' },
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

/** What the two "what did you have?" lines are called for this category. */
export const ITEM_LABELS = {
  brand: 'Maker',
  brandPlaceholder: 'The name on the band',
  name: 'Cigar',
  namePlaceholder: 'Line and size, e.g. Maduro Robusto',
  scan: 'Scan the band',
  noun: ['cigar', 'cigars'] as [string, string],
} as const

/** Keys allowed in items.attributes for a cigar. */
export const ATTRIBUTE_FIELDS = [
  { key: 'vitola', label: 'Vitola' },
  { key: 'ring_gauge', label: 'Ring gauge' },
  { key: 'ring_gauge_range', label: 'Ring gauge (two-ring shapes)' },
  { key: 'length', label: 'Length (in)' },
  { key: 'wrapper', label: 'Wrapper' },
  { key: 'binder', label: 'Binder' },
  { key: 'filler', label: 'Filler' },
  { key: 'origin', label: 'Origin' },
] as const

export interface CigarAttributes {
  vitola?: string
  /** For a two-ring shape (a figurado, or a tapered head), the widest ring; ring_gauge_range keeps both. */
  ring_gauge?: number
  /** Both rings of a two-ring shape as the maker writes them, e.g. "42/49". */
  ring_gauge_range?: string
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

// ── Size: how ring gauge and length read on a card, and the ring groups Discover browses by ──

const EIGHTHS: Record<number, string> = { 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' }

/** 6.125 → 6⅛", 5 → 5". Lengths that aren't a whole number of eighths keep their decimals. */
export function lengthLabel(inches: number): string {
  const whole = Math.floor(inches)
  const eighths = Math.round((inches - whole) * 8)
  if (Math.abs(inches - whole - eighths / 8) > 0.01) return `${inches}"`
  if (eighths === 8) return `${whole + 1}"`
  return `${whole || ''}${eighths ? EIGHTHS[eighths] : whole ? '' : '0'}"`
}

/** "54 ring", or "42/49 ring" for a two-ring shape; null when the ring isn't known. */
export function ringLabel(a: CigarAttributes): string | null {
  if (a.ring_gauge_range) return `${a.ring_gauge_range} ring`
  return a.ring_gauge != null ? `${a.ring_gauge} ring` : null
}

/** The widest ring a cigar has: its ring gauge, or the larger side of a two-ring range. */
export function widestRing(a: CigarAttributes): number | null {
  const fromRange = a.ring_gauge_range?.match(/\d+/g)?.map(Number) ?? []
  const all = [...fromRange, ...(a.ring_gauge != null ? [a.ring_gauge] : [])]
  return all.length ? Math.max(...all) : null
}

export const RING_GROUPS = [
  { id: 'thin', label: 'Thin (under 44)', description: 'Lanceros, coronas, panatelas. More wrapper in every puff, so the wrapper leads the flavor. Burns a bit warmer and quicker.' },
  { id: 'medium', label: 'Medium (44 to 51)', description: 'Robustos, corona gordas and classic toros. The usual balance of wrapper and filler.' },
  { id: 'thick', label: 'Thick (52 and up)', description: 'Toro grandes, gordos and up. A cooler, slower smoke where the filler blend leads.' },
  { id: 'unknown', label: 'Ring not listed', description: "The maker's page didn't give a ring gauge." },
] as const

/** Which ring group a cigar falls in, by its widest ring. */
export function ringGroupOf(a: CigarAttributes): (typeof RING_GROUPS)[number]['id'] {
  const ring = widestRing(a)
  if (ring == null) return 'unknown'
  return ring < 44 ? 'thin' : ring < 52 ? 'medium' : 'thick'
}

/** Optional size boxes on the log form when a cigar isn't in the catalog yet; they travel to the curator. */
export const NEW_ITEM_FIELDS = [
  { key: 'length', label: 'Length (inches)', placeholder: 'e.g. 6 or 5.5', min: 2, max: 12, step: 0.125 },
  { key: 'ring_gauge', label: 'Ring gauge', placeholder: 'e.g. 52', min: 20, max: 80, step: 1 },
] as const

/**
 * The line a cigar belongs to ("Hemingway" for "Hemingway Short Story"): a stated `line`, or the
 * part of the name before its vitola. Null when the name doesn't contain the vitola.
 */
export function lineOf(item: { name: string; attributes: unknown }): string | null {
  const a = item.attributes as CigarAttributes & { line?: string }
  if (a.line) return a.line
  if (!a.vitola) return null
  const at = item.name.toLowerCase().lastIndexOf(a.vitola.toLowerCase())
  const line = at > 0 ? item.name.slice(0, at).replace(/[\s,–—-]+$/, '').trim() : ''
  return line || null
}
