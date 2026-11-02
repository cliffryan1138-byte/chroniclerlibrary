import {
  fillBlanks, labelledWith, makerSlug, mergeIntoMakerFileWith, stripHtml, tagsFromTextWith, tagsOf, tidy,
  type CatalogEntryOf, type MakerFileOf, type ShopifyProduct,
} from '../../core'
import { CUTS, STYLE_GUIDE, type PipeAttributes } from './rules'
import { pipeTaxonomy } from './taxonomy'

/** One blend in a reviewable catalog file (catalog/pipe-tobacco/<maker>.json). */
export type BlendEntry = CatalogEntryOf<PipeAttributes>
export type BlendMakerFile = MakerFileOf<BlendEntry>
export { makerSlug }

const FIELDS = ['blend_style', 'components', 'cut', 'tin_size', 'origin'] as const
const KNOWN_LABELS = ['tobaccos?', 'components?', 'contents', 'leaf', 'blend', 'cut', 'style', 'blend type', 'type', 'category',
  'strength', 'nicotine(?: strength)?', 'flavou?r(?: notes)?', 'taste', 'room note', 'aroma', 'tin note', 'notes?',
  'origin', 'country(?: of origin)?', 'made in', 'manufactured(?: in)?', 'size', 'weight', 'packaging', 'blender', 'brand']
const labelled = (text: string, labels: string[]) => labelledWith(text, labels, KNOWN_LABELS)

const WEIGHT = /(\d+(?:\.\d+)?)\s*(g|gr|grams?|oz|ounces?|lbs?|pounds?)\b\.?/gi
const NOT_BLENDS = new RegExp('\\b(' + [
  // pipes and gear
  'tampers?', 'pipe cleaners?', 'cleaners?', 'filters?', 'lighters?', 'matches', 'racks?', 'stands?', 'reamers?', 'tools?',
  'cases?', 'humidors?', 'ash ?trays?', 'stems?',
  'cigars?', 'cigarillos?', 'rolling papers?', 'papers', 'tubes', 'snuff',
  // merchandise, or more than one blend
  't-?shirts?', 'shirts?', 'hats?', 'caps?', 'hoodies?', 'mugs?', 'stickers?', 'gift ?cards?', 'samplers?', 'sampler packs?',
  'variety', 'assortment', 'club', 'membership', 'subscription', 'bonus', 'free', 'events?', 'tickets?',
].join('|') + ')\\b', 'i')
/** Words that make a product a pipe (the thing smoked from), not a blend. */
const PIPE_WORDS = /\b(pipes?|billiard|churchwarden|meerschaum|corn ?cob|briar|calabash|bent|dublin|poker)\b/i
const LOOKS_LIKE_BLEND = /\b(tobacco|blend|mixture|flake|cavendish|plug|ribbon|curly|navy|latakia|perique|burley|virginia|aromatic)\b/i

/** True for a single pipe tobacco blend; false for pipes, gear, cigars, samplers and merchandise. */
export function isPipeTobaccoProduct(p: ShopifyProduct): boolean {
  const title = p.title
  const type = p.product_type ?? ''
  const hay = `${title} ${type} ${tagsOf(p)}`
  const weighed = new RegExp(WEIGHT.source, 'i').test(`${title} ${(p.options ?? []).flatMap((o) => o.values).join(' ')}`)
  if (NOT_BLENDS.test(`${title} ${type}`.replace(/pipe tobacco/gi, ''))) return false
  if (/\b(pouch(es)?|jars?|bags?)\b/i.test(title) && !weighed) return false // a leather pouch or a storage jar, not tobacco in one
  // "Pipe Tobacco" as the type or tag settles it; otherwise a pipe word without a weight means a pipe.
  if (/pipe tobacco/i.test(`${type} ${tagsOf(p)}`)) return !(/^pipes?$/i.test(type))
  if (PIPE_WORDS.test(title.replace(/pipe tobacco/gi, '')) && !weighed) return false
  return LOOKS_LIKE_BLEND.test(hay) || weighed
}

/** Tin sizes and packaging belong in tin_size, not the blend's name; a leading maker name goes too. */
export function cleanBlendName(title: string, maker: string): string {
  let name = title
    .replace(/\(([^)]*)\)/g, (_, inner) => (new RegExp(WEIGHT.source, 'i').test(inner) || /\b(tin|pouch|bulk|jar)\b/i.test(inner) ? ' ' : `(${inner})`))
    .replace(new RegExp(WEIGHT.source, 'gi'), ' ')
    .replace(/\b(pipe tobacco|tobacco|tins?|pouch(es)?|bulk|jar|by the ounce|per ounce|per oz|sealed|cellared)\b/gi, ' ')
  if (maker) {
    const esc = maker.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+')
    const stripped = name.replace(new RegExp(`^\\s*${esc}\\s*[-–—:|]?\\s*`, 'i'), '')
    if (tidy(stripped)) name = stripped
  }
  return tidy(name.replace(/\s*[-–—|]\s*(?=$|[-–—|])/g, ' ').replace(/\s*[-–—|]\s*$/, ''))
}

/** Every tin size the title or options state, as written ("50g", "1.75 oz"). */
export function tinSizes(p: ShopifyProduct): string | undefined {
  const hay = `${p.title} ${(p.options ?? []).flatMap((o) => o.values).join(' | ')}`
  const seen = new Set<string>()
  for (const m of hay.matchAll(new RegExp(WEIGHT.source, 'gi'))) {
    const unit = m[2].toLowerCase()
    const short = unit.startsWith('g') ? 'g' : unit.startsWith('o') ? ' oz' : ' lb'
    seen.add(`${Number(m[1])}${short}`)
  }
  return seen.size ? [...seen].join(', ') : undefined
}

const LEAVES: [RegExp, string][] = [
  [/\bvirginias?\b/i, 'Virginia'],
  [/\bburleys?\b/i, 'Burley'],
  [/\blatakia\b/i, 'Latakia'],
  [/\bperique\b/i, 'Perique'],
  [/\b(orientals?|turkish|izmir|basma|katerini|yenidje|smyrna|xanthi)\b/i, 'Oriental'],
  [/\bcavendish\b/i, 'Cavendish'],
  [/\b(kentucky|dark[- ]fired)\b/i, 'Kentucky'],
  [/\bmaryland\b/i, 'Maryland'],
  [/\bcigar leaf\b/i, 'Cigar leaf'],
]

/** The leaf a blend names. An explicit "Tobaccos:" line wins; otherwise the description, flagged for review. */
export function componentsFrom(text: string): { components: string[]; fromLabel: boolean } {
  const line = labelled(text, ['tobaccos?', 'components?', 'contents', 'leaf', 'blend'])
  const read = (s: string) => LEAVES.filter(([re]) => re.test(s)).map(([, leaf]) => leaf)
  const fromLine = line ? read(line) : []
  if (fromLine.length) return { components: fromLine, fromLabel: true }
  return { components: read(text), fromLabel: false }
}

const CUT_WORDS: [RegExp, (typeof CUTS)[number]][] = [
  [/\bbroken[- ]flake\b/i, 'Broken flake'],
  [/\bready[- ]rubbed\b/i, 'Ready rubbed'],
  [/\bcrumble[- ]cake\b/i, 'Crumble cake'],
  [/\bcube[- ]?cut\b|\bcubes?\b/i, 'Cube cut'],
  [/\b(coins?|curly|curlies)\b/i, 'Coin'],
  [/\b(rope|twist)\b/i, 'Rope'],
  [/\bshag\b/i, 'Shag'],
  [/\bplug\b/i, 'Plug'],
  [/\bflakes?\b/i, 'Flake'],
  [/\bribbon\b/i, 'Ribbon'],
]
/** The cut, from a "Cut:" line, then the title, then the description. */
export function cutFrom(title: string, text: string): string | undefined {
  for (const hay of [labelled(text, ['cut']) ?? '', title, text]) {
    const hit = CUT_WORDS.find(([re]) => re.test(hay))
    if (hit) return hit[1]
  }
  return undefined
}

const STYLE_IDS = STYLE_GUIDE.map((s) => s.id).filter((s) => s !== 'Other')
/** A style the source states (a "Style:" line, the product type, or a tag). */
export function statedStyle(text: string, p: ShopifyProduct): string | undefined {
  const tags = Array.isArray(p.tags) ? p.tags : (p.tags ?? '').split(',')
  for (const hay of [labelled(text, ['style', 'blend type', 'type', 'category']) ?? '', p.product_type ?? '', ...tags]) {
    const words = hay.replace(/pipe tobacco/gi, '')
    // A whole-word match, longest first, so "VaPer" isn't read as "Virginia".
    const hit = [...STYLE_IDS].sort((a, b) => b.length - a.length).find((s) => new RegExp(`\\b${s}\\b`, 'i').test(words))
    if (hit) return hit
  }
  return undefined
}

/** A suggested style from the leaf and toppings, for the reviewer to confirm. */
export function guessStyle(components: string[], text: string): string | undefined {
  const has = (leaf: string) => components.includes(leaf)
  if (/\b(aromatic|topping|cased with|flavou?red|vanilla|cherry|rum|maple)\b/i.test(text)) return 'Aromatic'
  if (has('Latakia')) return 'English'
  const only = (...leaves: string[]) => components.length === leaves.length && leaves.every(has)
  if (only('Virginia', 'Perique')) return 'VaPer'
  if (only('Virginia', 'Burley')) return 'VaBur'
  for (const leaf of ['Virginia', 'Burley', 'Oriental']) if (only(leaf)) return leaf
  return undefined // a mixture without a clear lead: the reviewer picks
}

const STRENGTHS: [RegExp, number][] = [
  [/\b(very|extra)\s*(mild|light)\b/i, 1],
  [/\b(very|extra)\s*(strong|full)\b/i, 5],
  [/\b(mild|light)\s*(?:to|-|\/)\s*medium\b/i, 2],
  [/\bmedium\s*(?:to|-|\/)\s*(full|strong)\b/i, 4],
  [/\b(full|strong)\b/i, 4],
  [/\bmedium\b/i, 3],
  [/\b(mild|light)\b/i, 2],
]
/** Nicotine strength the source states, on the 1-5 scale (Mild 2, Medium 3, Full 4); null when it states none. */
export function nicotineFromWords(text: string | null): number | null {
  if (!text) return null
  for (const [re, value] of STRENGTHS) if (re.test(text)) return value
  return null
}

function reviewNotes(e: BlendEntry, guessed: { style: boolean; leaf: boolean }): string[] {
  const review: string[] = []
  if (!e.brand) review.push('no maker: pass --maker')
  if (!e.attributes.blend_style) review.push('no style stated')
  else if (guessed.style) review.push(`style guessed from the leaf (${e.attributes.blend_style}): check`)
  if (!e.attributes.components?.length) review.push('no leaf stated')
  else if (guessed.leaf) review.push('leaf read from the description: check')
  if (!e.attributes.cut) review.push('no cut stated')
  if (e.strength == null) review.push('no strength stated')
  if (!e.tags.length) review.push('no flavor notes named')
  return review
}

/** One Shopify product → one blend. Tin sizes are recorded together, not split into separate blends. */
export function fromShopifyBlend(p: ShopifyProduct, opts: { brand?: string; source: string }): BlendEntry {
  const text = stripHtml(p.body_html)
  const brand = tidy(opts.brand || p.vendor || '')
  const { components, fromLabel } = componentsFrom(text)
  const stated = statedStyle(text, p)
  const style = stated ?? guessStyle(components, `${p.title}\n${text}`)
  const attributes: BlendEntry['attributes'] = { source: opts.source }
  if (style) attributes.blend_style = style
  if (components.length) attributes.components = components
  const cut = cutFrom(p.title, text)
  if (cut) attributes.cut = cut
  const size = tinSizes(p)
  if (size) attributes.tin_size = size
  const origin = labelled(text, ['origin', 'country of origin', 'country', 'made in', 'manufactured in'])
  if (origin) attributes.origin = origin
  const tagText = (Array.isArray(p.tags) ? p.tags : (p.tags ?? '').split(',')).map((t) => t.replace(/[_]/g, ': ')).join('\n')
  const strength = nicotineFromWords(labelled(`${text}\n${tagText}`, ['nicotine strength', 'nicotine', 'strength']))
  const e: BlendEntry = {
    brand, name: cleanBlendName(p.title, brand), attributes, strength,
    tags: tagsFromTextWith(text, pipeTaxonomy), review: [], sources: [opts.source],
    reference_images: (p.images ?? []).map((i) => i.src).slice(0, 3),
  }
  e.review = reviewNotes(e, { style: !stated && !!style, leaf: !fromLabel && components.length > 0 })
  return e
}

/** The same blend listed as a 50g tin and as bulk comes out once, with whatever either listing stated. */
export function mergeDuplicateBlends(entries: BlendEntry[]): BlendEntry[] {
  const byKey = new Map<string, BlendEntry>()
  for (const e of entries) {
    const key = `${e.brand}|${e.name}`.toLowerCase().replace(/\s+/g, ' ')
    const seen = byKey.get(key)
    if (!seen) { byKey.set(key, { ...e, attributes: { ...e.attributes }, tags: [...e.tags], review: [...e.review] }); continue }
    const sizes = [seen.attributes.tin_size, e.attributes.tin_size].filter(Boolean).join(', ')
    fillBlanks(seen, e, FIELDS, 'union')
    if (sizes) seen.attributes.tin_size = [...new Set(sizes.split(', '))].join(', ')
    seen.review = seen.review.filter((r) => e.review.includes(r)) // a note stays only if neither listing settled it
  }
  return [...byKey.values()]
}

/** Folds a fresh fetch into a maker's blend file; what's already there was reviewed, so it wins. */
export const mergeIntoBlendFile = (existing: BlendMakerFile | null, maker: BlendMakerFile['maker'], category: string, fresh: BlendEntry[]): BlendMakerFile =>
  mergeIntoMakerFileWith(existing, maker, category, fresh, FIELDS)
