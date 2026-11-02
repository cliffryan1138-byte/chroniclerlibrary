import type { BranchSpec } from '../../core'
import { pipeTaxonomy } from './taxonomy'

export const CATEGORY = 'pipe_tobacco'
export const DISPLAY_NAME = 'Pipe tobacco'

/** Strength here means nicotine, shown as three words over the 1-5 scale. */
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

export const DETAILED_OFFER_AFTER_LOGS = 15
export const COLD_START_LOGS = 10

/** A bowl changes as it burns down, like a cigar's thirds. */
export const STAGES = [
  { value: 1, label: 'Start of the bowl', short: 'Start' },
  { value: 2, label: 'Middle of the bowl', short: 'Middle' },
  { value: 3, label: 'End of the bowl', short: 'End' },
] as const

export const DETAIL_SCORES = [
  { key: 'strength', label: 'Nicotine', low: 'Mild', high: 'Full' },
  { key: 'body', label: 'Body', low: 'Light', high: 'Heavy' },
  { key: 'tongue_bite', label: 'Tongue bite', low: 'None', high: 'Harsh' },
  { key: 'room_note', label: 'Room note', low: 'Pleasant', high: 'Overpowering' },
  { key: 'moisture', label: 'Moisture', low: 'Dry', high: 'Wet' },
  { key: 'burn', label: 'Burn', low: 'Constant relights', high: 'Stays lit' },
] as const

export const DETAIL_TEXT = [
  { key: 'tin_note', label: 'Tin note', placeholder: 'What did it smell like in the tin?' },
  { key: 'finish', label: 'Finish notes', placeholder: 'What lingered after the bowl?' },
] as const

export const ITEM_LABELS = {
  brand: 'Maker',
  brandPlaceholder: 'The name on the tin',
  name: 'Blend',
  namePlaceholder: 'The blend name on the tin',
  scan: 'Scan the tin',
  noun: ['blend', 'blends'] as [string, string],
  smokedIn: 'Smoked in',
} as const

/** Pipe smokers choose by style first. Each style gets one plain-English line for the browse view. */
export const STYLE_GUIDE = [
  { id: 'Virginia', label: 'Virginia', description: 'Bright and naturally sweet. Grassy and citrusy when young, deeper and fruitier with age. Often pressed into flakes.' },
  { id: 'VaPer', label: 'VaPer', description: 'Virginia with a measure of Perique: sweet and fig-like with a peppery edge.' },
  { id: 'VaBur', label: 'VaBur', description: 'Virginia and Burley together: sweet top notes over a nutty, cocoa-like body. An easy everyday smoke.' },
  { id: 'Burley', label: 'Burley', description: 'Low in sugar, nutty and cocoa-like. Plenty of body and usually gentle on the tongue.' },
  { id: 'English', label: 'English', description: 'Built around Latakia: smoky and campfire-like, with Virginia and often some Oriental leaf.' },
  { id: 'Balkan', label: 'Balkan', description: 'A cousin of English with more Oriental leaf: smoky, spicy and a little floral.' },
  { id: 'Scottish', label: 'Scottish', description: 'Dark, rich Virginias, sometimes with a touch of Latakia: full, earthy and sweet.' },
  { id: 'Navy', label: 'Navy', description: 'Pressed Virginia, sometimes with Burley or Perique, in the old sailor\'s way. Usually plug or flake, often with a light rum or fig note.' },
  { id: 'Oriental', label: 'Oriental', description: 'Small-leaf tobaccos from the eastern Mediterranean: spicy, woody, sometimes floral or slightly sour.' },
  { id: 'Aromatic', label: 'Aromatic', description: 'A blend with an added flavoring such as vanilla, cherry or rum. Often Cavendish-based, with a pleasant room note.' },
  { id: 'Other', label: 'Other', description: "Blends that don't sit neatly in one style." },
] as const

export const BLEND_STYLES = STYLE_GUIDE.map((s) => s.id)
export const CUTS = ['Ribbon', 'Flake', 'Broken flake', 'Ready rubbed', 'Plug', 'Coin', 'Crumble cake', 'Rope', 'Cube cut', 'Shag'] as const

export interface PipeAttributes {
  blend_style?: string
  components?: string[]
  cut?: string
  tin_size?: string
  origin?: string
}

export const ATTRIBUTE_FIELDS = [
  { key: 'blend_style', label: 'Blend style' },
  { key: 'components', label: 'Leaf' },
  { key: 'cut', label: 'Cut' },
  { key: 'tin_size', label: 'Tin size' },
  { key: 'origin', label: 'Made in' },
] as const

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'Virginia', meaning: 'Bright, naturally sweet leaf. Grassy and citrusy when young, deeper and fruitier with age.' },
  { term: 'Burley', meaning: 'Air-cured leaf with little sugar. Nutty and cocoa-like; often the body of a blend.' },
  { term: 'Latakia', meaning: 'Leaf cured over aromatic wood fires. Smoky, campfire, the heart of English blends.' },
  { term: 'Perique', meaning: 'Pressure-fermented Louisiana leaf. Peppery, fig-like tang; used sparingly as a spice.' },
  { term: 'Oriental', meaning: 'Small-leaf tobaccos from the eastern Mediterranean. Spicy, woody, sometimes floral.' },
  { term: 'Cavendish', meaning: 'A process, not a leaf: tobacco pressed and heated until dark and mellow. Often sweet.' },
  { term: 'Aromatic', meaning: 'A blend with an added flavoring (a topping or casing), such as vanilla, cherry or rum.' },
  { term: 'English / Balkan', meaning: 'Blends built around Latakia. Balkan usually carries more Oriental leaf.' },
  { term: 'VaPer', meaning: 'Virginia and Perique together: sweet and fruity with a peppery edge.' },
  { term: 'Flake', meaning: 'Pressed tobacco sliced into thin sheets. Fold it or rub it out before packing.' },
  { term: 'Ribbon', meaning: 'Long, thin strands, ready to pack straight from the tin.' },
  { term: 'Plug', meaning: 'A pressed block you slice yourself.' },
  { term: 'Tongue bite', meaning: 'Heat or harshness on the tongue, usually from smoking too fast or too wet.' },
  { term: 'Room note', meaning: 'How the smoke smells to the people around you.' },
  { term: 'Tin note', meaning: 'The smell of the tobacco in the tin, before you light it.' },
  { term: 'Charring light', meaning: 'The first, gentle light that settles the bowl before the true light.' },
]

export const pipeBranch: BranchSpec = {
  category: CATEGORY,
  taxonomy: pipeTaxonomy,
  strengthLabel,
  coldStartLogs: COLD_START_LOGS,
}

// ── The pipe collection: pipes are kept, not smoked up, so they live in a collection, not the palate ──

/** Shapes, grouped the way pipe smokers talk about them, each with one plain line. */
export const PIPE_SHAPES = [
  { id: 'Billiard', label: 'Billiard', description: 'The classic: a straight, cylindrical bowl on a straight shank. The shape most others are measured against.' },
  { id: 'Bent Billiard', label: 'Bent Billiard', description: 'A billiard with a curved stem, so it hangs from the teeth more easily.' },
  { id: 'Apple', label: 'Apple', description: 'A rounded, apple-shaped bowl. Sits comfortably in the palm.' },
  { id: 'Dublin', label: 'Dublin', description: 'A bowl that flares wider toward the rim, often a little forward-canted.' },
  { id: 'Pot', label: 'Pot', description: 'A short, wide, straight-walled bowl: big chamber, short height.' },
  { id: 'Prince', label: 'Prince', description: 'A low, squat, rounded bowl on a long shank with a gently bent stem. Light and elegant.' },
  { id: 'Bulldog', label: 'Bulldog', description: 'A bowl with a cut ridge (a "coronet") near the top, on a diamond-shaped shank.' },
  { id: 'Rhodesian', label: 'Rhodesian', description: 'A bulldog with a round shank and usually a slight bend.' },
  { id: 'Canadian', label: 'Canadian', description: 'A billiard bowl on an extra-long oval shank with a short stem.' },
  { id: 'Lovat', label: 'Lovat', description: 'Like a Canadian but with a round shank and a saddle stem.' },
  { id: 'Liverpool', label: 'Liverpool', description: 'Like a Canadian but with a round shank and a tapered stem.' },
  { id: 'Poker', label: 'Poker', description: 'A flat-bottomed, cylindrical bowl that stands up on its own: a "sitter".' },
  { id: 'Calabash', label: 'Calabash', description: 'A deep curve ending in a wide bowl, traditionally a gourd with a meerschaum cup; smokes cool and dry.' },
  { id: 'Churchwarden', label: 'Churchwarden', description: 'Any bowl on a very long stem (9 inches or more), for a cooler smoke held away from the face.' },
  { id: 'Author', label: 'Author', description: 'A heavy, bent, pear-shaped bowl that fills the hand.' },
  { id: 'Freehand', label: 'Freehand', description: 'Carved to follow the grain rather than a standard shape; often with a rough, plateau rim.' },
  { id: 'Other', label: 'Other', description: "Shapes that don't sit neatly in one family." },
] as const

export const PIPE_MATERIALS = [
  { id: 'Briar', label: 'Briar', description: 'Burl from the root of the heath tree. Hard, heat-resistant, and the standard for good pipes.' },
  { id: 'Meerschaum', label: 'Meerschaum', description: 'A soft white mineral, often carved. Smokes cool and dry, and colors to honey and amber with use. Block is carved whole; pressed is bonded dust.' },
  { id: 'Corn cob', label: 'Corn cob', description: 'Light, cheap and honest. Many prefer it for Virginias and aromatics.' },
  { id: 'Clay', label: 'Clay', description: 'The oldest kind. Neutral-tasting but fragile, and it runs hot.' },
  { id: 'Morta', label: 'Morta', description: 'Bog oak, fossilized for thousands of years. Light, dark and dry-smoking.' },
  { id: 'Olivewood', label: 'Olivewood', description: 'Beautifully grained and dense; a little sweetness at first.' },
  { id: 'Cherrywood', label: 'Cherrywood', description: 'Often with the bark left on. A traditional, rustic look.' },
  { id: 'Other', label: 'Other', description: 'Anything else: horn, glass, metal-lined and so on.' },
] as const

export const PIPE_FINISHES = ['Smooth', 'Sandblast', 'Rusticated', 'Carved', 'Natural'] as const
export const PIPE_FILTERS = ['None', '6mm', '9mm', 'Other'] as const

export interface PipeFields {
  shape?: string
  material?: string
  finish?: string
  filter?: string
  dedicated_style?: string
}
