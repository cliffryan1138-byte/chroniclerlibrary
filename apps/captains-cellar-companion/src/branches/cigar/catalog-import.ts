import {
  fillBlanks, labelledWith, tagsOf, makerSlug, mergeIntoMakerFileWith, stripHtml, tagsFromTextWith, tidy,
  type CatalogEntryOf, type MakerFileOf, type ShopifyProduct,
} from '../../core'
import { cigarTaxonomy } from './taxonomy'
import type { CigarAttributes } from './rules'

/** One cigar in a reviewable catalog file (catalog/makers/<maker>.json). */
export type CatalogEntry = CatalogEntryOf<CigarAttributes>
export type { ShopifyProduct }
export { makerSlug, stripHtml }

const VITOLAS = [
  'double corona', 'corona gorda', 'petit corona', 'gran toro', 'box-pressed toro', 'double robusto', 'robusto', 'toro', 'churchill',
  'corona', 'lancero', 'torpedo', 'belicoso', 'gordo', 'perfecto', 'figurado', 'salomon', 'lonsdale', 'panatela',
  'petite', 'short robusto', 'gigante', 'presidente', 'piramide', 'pyramid', 'cigarillo',
]
const NOT_CIGARS = new RegExp('\\b(' + [
  // merchandise and accessories
  'cutters?', 'lighters?', 'humidors?', 'ash ?trays?', 't-?shirts?', 'shirts?', 'hats?', 'caps?', 'hoodies?', 'mugs?',
  'stickers?', 'lanyards?', 'posters?', 'holders?', 'cases?', 'accessor(y|ies)', 'gift ?cards?', 'coffee', '\\d+ ?oz',
  // more than one cigar, or not a product at all
  'samplers?', 'gift ?packs?', 'gift ?box(es)?', 'variety', 'assortment', 'club', 'membership', 'subscription',
  'complimentary', 'bonus', 'free', 'building', 'tour', 'events?', 'tickets?',
].join('|') + ')\\b', 'i')
const LOOKS_LIKE_CIGAR = new RegExp(`\\b(cigars?|${VITOLAS.join('|')})\\b`, 'i')
const PACKAGING = /^(single|singles?|each|\d+\s*-?\s*(pack|ct|count)|box( of \d+)?|bundle( of \d+)?|default title)$/i

/** Pack counts, sizes and packaging words belong in attributes or nowhere, not in the cigar's name. */
export function cleanName(title: string): string {
  return tidy(title
    .replace(/\(([^)]*)\)/g, (_, inner) => (/\b(ct|count|pack|bundle|box)\b/i.test(inner) ? ' ' : `(${inner})`))
    .replace(/\b\d+\s*-?\s*(ct|count|pk|pack)\b/gi, ' ')
    .replace(/\b(box of \d+|bundle( of \d+)?|single|singles|limited edition)\b/gi, ' ')
    .replace(/\d+(?:\.\d+)?(?:\s+\d\/\d)?\s*(?:"|”|''|in\b)?\s*[x×X]\s*\d+(?:\.\d+)?(?:\s+\d\/\d)?\s*(?:"|”|'')?/g, ' ')
    .replace(/\s*[-–—|]\s*(?=$|[-–—|])/g, ' ')
    .replace(/\s*[-–—|]\s*$/, ''))
}

const KNOWN_LABELS = ['wrapper', 'binder', 'fillers?', 'origin', 'country(?: of origin)?', 'made in', 'strength', 'body',
  'profile', 'size', 'vitola', 'shape', 'length', 'ring(?: gauge)?', 'finish', 'manufactured', 'availability', 'notes?',
  'flavou?r(?: notes)?', 'pairing', 'aroma', 'construction', 'blend']
/** "Wrapper: Ecuadorian Habano" style lines. Only an explicit label counts, and a value ends where the next label starts. */
export const labelled = (text: string, labels: string[]) => labelledWith(text, labels, KNOWN_LABELS)

/** 5 x 50, 5 1/2 x 50, 5.5" x 50, 50 x 5 1/2 → { length, ring_gauge }. */
export function parseSize(text: string): { length?: number; ring_gauge?: number } {
  const num = String.raw`(\d+(?:\.\d+)?(?:\s+\d\/\d)?|\d\/\d)`
  const m = text.match(new RegExp(`${num}\\s*(?:"|''|in(?:ch(?:es)?)?\\.?)?\\s*[x×X]\\s*${num}`))
  if (!m) return {}
  const value = (s: string) => s.split(/\s+/).reduce((sum, part) => {
    const [a, b] = part.split('/')
    return sum + (b ? Number(a) / Number(b) : Number(a))
  }, 0)
  let [a, b] = [value(m[1]), value(m[2])]
  if (a >= 26 && b < 26) [a, b] = [b, a] // ring gauge written first
  if (!(a > 2 && a < 12 && b >= 26 && b <= 80)) return {}
  return { length: Math.round(a * 100) / 100, ring_gauge: Math.round(b) }
}

const STRENGTHS: [RegExp, number][] = [
  [/\bmild\s*(?:to|-|\/)\s*medium\b/i, 2],
  [/\bmedium\s*(?:to|-|\/)\s*full\b/i, 4],
  [/\bmedium\s*plus\b|\bmedium\+/i, 4],
  [/\bfull(?:[- ]bodied| strength)?\b/i, 5],
  [/\bmedium\b/i, 3],
  [/\bmild\b/i, 1],
]

/** A strength word the source states, on the 1-5 scale; null when it states none. */
export function strengthFromWords(text: string | null): number | null {
  if (!text) return null
  for (const [re, value] of STRENGTHS) if (re.test(text)) return value
  return null
}

/** Flavor notes the description names, mapped through the cigar taxonomy. */
export const tagsFromText = (text: string) => tagsFromTextWith(text, cigarTaxonomy)

function vitolaIn(text: string): string | undefined {
  const lower = text.toLowerCase()
  const hit = VITOLAS.find((v) => new RegExp(`\\b${v}\\b`).test(lower))
  return hit ? hit.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined
}

export function isCigarProduct(p: ShopifyProduct): boolean {
  const tags = tagsOf(p)
  const hay = `${p.title} ${p.product_type ?? ''} ${tags}`
  return !NOT_CIGARS.test(`${p.title} ${p.product_type ?? ''}`) && LOOKS_LIKE_CIGAR.test(hay)
}

/** One Shopify product → one entry per size it is sold in (packaging options like "Box of 20" are ignored). */
export function fromShopifyProduct(p: ShopifyProduct, opts: { brand?: string; source: string }): CatalogEntry[] {
  const text = stripHtml(p.body_html)
  const brand = tidy(opts.brand || p.vendor || '')
  const base: CatalogEntry['attributes'] = { source: opts.source }
  const wrapper = labelled(text, ['wrapper'])
  const binder = labelled(text, ['binder'])
  const filler = labelled(text, ['filler', 'fillers'])
  const origin = labelled(text, ['origin', 'country of origin', 'country', 'made in'])?.replace(/^100%\s*hand\s*-?\s*made\s+in\s+/i, '') ?? null
  if (wrapper) base.wrapper = wrapper
  if (binder) base.binder = binder
  if (filler) base.filler = filler
  if (origin) base.origin = origin
  const strength = strengthFromWords(labelled(text, ['strength', 'body', 'profile']))
  const tags = tagsFromText(text)

  // Size options with more than one real value become separate cigars.
  const sizeOption = (p.options ?? []).find((o) => /size|vitola|shape|length/i.test(o.name) && o.values.filter((v) => !PACKAGING.test(v)).length > 0)
  const sizes = sizeOption ? sizeOption.values.filter((v) => !PACKAGING.test(v)) : []
  const variants = sizes.length > 1 ? sizes : [null]

  return variants.map((size) => {
    const title = cleanName(p.title)
    const name = size ? tidy(`${title} ${size}`) : title
    const attributes: CatalogEntry['attributes'] = { ...base, ...parseSize(size ?? `${p.title}\n${text}`) }
    const vitola = vitolaIn(size ?? '') ?? vitolaIn(p.title) ?? vitolaIn(labelled(text, ['vitola', 'shape']) ?? '')
    if (vitola) attributes.vitola = vitola
    const review: string[] = []
    if (!brand) review.push('no maker: pass --brand')
    for (const k of ['vitola', 'length', 'ring_gauge', 'wrapper', 'binder', 'filler', 'origin'] as const) if (attributes[k] == null) review.push(`no ${k.replace('_', ' ')} stated`)
    if (strength == null) review.push('no strength stated')
    if (!tags.length) review.push('no flavor notes named')
    return { brand, name, attributes, strength, tags, review, sources: [opts.source], reference_images: (p.images ?? []).map((i) => i.src).slice(0, 3) }
  })
}

const FIELDS = ['vitola', 'length', 'ring_gauge', 'wrapper', 'binder', 'filler', 'origin'] as const

/** The same cigar sold as a 5-pack and a 25-ct bundle comes out once, with whatever either listing stated. */
export function mergeDuplicates(entries: CatalogEntry[]): CatalogEntry[] {
  const byKey = new Map<string, CatalogEntry>()
  for (const e of entries) {
    const key = `${e.brand}|${e.name}`.toLowerCase().replace(/\s+/g, ' ')
    const seen = byKey.get(key)
    if (!seen) { byKey.set(key, { ...e, attributes: { ...e.attributes }, tags: [...e.tags] }); continue }
    fillBlanks(seen, e, FIELDS, 'union')
  }
  for (const e of byKey.values()) {
    e.review = []
    if (!e.brand) e.review.push('no maker: pass --brand')
    for (const k of FIELDS) if (e.attributes[k] == null) e.review.push(`no ${k.replace('_', ' ')} stated`)
    if (e.strength == null) e.review.push('no strength stated')
    if (!e.tags.length) e.review.push('no flavor notes named')
  }
  return [...byKey.values()]
}

/** One maker's reviewable catalog file: catalog/makers/<slug>.json. */
export type MakerFile = MakerFileOf<CatalogEntry>

/** Folds a fresh fetch into a maker's file; what's already there was reviewed, so it wins. */
export const mergeIntoMakerFile = (existing: MakerFile | null, maker: MakerFile['maker'], category: string, fresh: CatalogEntry[]): MakerFile =>
  mergeIntoMakerFileWith(existing, maker, category, fresh, FIELDS)
