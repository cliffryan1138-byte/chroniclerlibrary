import type { ItemTag } from '../../core'
import { cigarTaxonomy } from './taxonomy'
import type { CigarAttributes } from './rules'

/**
 * One cigar in a reviewable catalog file (catalog/*.json). Facts only: no marketing copy, images,
 * prices or links are kept, and a field the source doesn't state is null, never a guess.
 */
export interface CatalogEntry {
  brand: string
  name: string
  attributes: CigarAttributes & { source?: string }
  strength: number | null
  tags: ItemTag[]
  /** What the reviewer should check before loading; not written to the database. */
  review: string[]
  /** The source's own product photos, as addresses for the reviewer to look at. Not downloaded or loaded:
   * band-photo matching needs our own (or licensed) reference photos and a SPARK image-match step first. */
  reference_images: string[]
}

/** The parts of a Shopify product the importer reads (Shopify's public /products.json). */
export interface ShopifyProduct {
  title: string
  vendor?: string
  product_type?: string
  tags?: string[] | string
  body_html?: string | null
  options?: { name: string; values: string[] }[]
  variants?: { title: string }[]
  images?: { src: string }[]
}

const VITOLAS = [
  'double corona', 'corona gorda', 'petit corona', 'gran toro', 'box-pressed toro', 'robusto', 'toro', 'churchill',
  'corona', 'lancero', 'torpedo', 'belicoso', 'gordo', 'perfecto', 'figurado', 'salomon', 'lonsdale', 'panatela',
  'petite', 'short robusto', 'gigante', 'presidente', 'piramide', 'pyramid', 'cigarillo',
]
const NOT_CIGARS = /\b(cutter|lighter|humidor|ash ?tray|shirt|t-shirt|hat|cap|hoodie|gift ?card|accessor|case|mug|sticker|lanyard|poster)\b/i
const LOOKS_LIKE_CIGAR = new RegExp(`\\b(cigars?|${VITOLAS.join('|')})\\b`, 'i')
const PACKAGING = /^(single|singles?|each|\d+\s*-?\s*(pack|ct|count)|box( of \d+)?|bundle( of \d+)?|default title)$/i

export function stripHtml(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<(br|\/p|\/li|\/div|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
    .replace(/&times;/g, 'x').replace(/&[a-z]+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim()
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s.;,]+$/g, '').trim()

/** "Wrapper: Ecuadorian Habano" style lines. Only an explicit label counts. */
export function labelled(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const m = text.match(new RegExp(`(?:^|\\n|\\s)${label}s?\\s*[:\\-–—]\\s*([^\\n|]{2,80})`, 'i'))
    if (m) return tidy(m[1]) || null
  }
  return null
}

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

/** Flavor notes the description names, mapped through the taxonomy. Named descriptors outrank named families. */
export function tagsFromText(text: string): ItemTag[] {
  const lower = text.toLowerCase()
  const byFamily = new Map<string, number>()
  const has = (word: string) => new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).test(lower)
  for (const d of cigarTaxonomy.descriptors) if (has(d.label.toLowerCase())) byFamily.set(d.family, Math.max(byFamily.get(d.family) ?? 0, 0.6))
  for (const f of cigarTaxonomy.families) if (has(f.label.toLowerCase())) byFamily.set(f.id, Math.max(byFamily.get(f.id) ?? 0, 0.5))
  return [...byFamily].map(([family, weight]) => ({ family, weight }))
}

function vitolaIn(text: string): string | undefined {
  const lower = text.toLowerCase()
  const hit = VITOLAS.find((v) => new RegExp(`\\b${v}\\b`).test(lower))
  return hit ? hit.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined
}

export function isCigarProduct(p: ShopifyProduct): boolean {
  const tags = Array.isArray(p.tags) ? p.tags.join(' ') : p.tags ?? ''
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
  const origin = labelled(text, ['origin', 'country of origin', 'country', 'made in'])
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
    const title = tidy(p.title.replace(/\s*[-–|(]\s*(box of \d+|single|\d+\s*-?\s*pack|\d+\s*ct)\)?\s*$/i, ''))
    const name = size ? tidy(`${title} ${size}`) : title
    const attributes: CatalogEntry['attributes'] = { ...base, ...parseSize(size ?? `${p.title}\n${text}`) }
    const vitola = vitolaIn(size ?? '') ?? labelled(text, ['vitola', 'shape']) ?? vitolaIn(p.title)
    if (vitola) attributes.vitola = vitola
    const review: string[] = []
    if (!brand) review.push('no maker: pass --brand')
    for (const k of ['vitola', 'length', 'ring_gauge', 'wrapper', 'binder', 'filler', 'origin'] as const) if (attributes[k] == null) review.push(`no ${k.replace('_', ' ')} stated`)
    if (strength == null) review.push('no strength stated')
    if (!tags.length) review.push('no flavor notes named')
    return { brand, name, attributes, strength, tags, review, reference_images: (p.images ?? []).map((i) => i.src).slice(0, 3) }
  })
}
