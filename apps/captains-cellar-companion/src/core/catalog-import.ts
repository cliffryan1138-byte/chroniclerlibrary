import type { ItemTag, Taxonomy } from './types'

// Shared plumbing for turning a store's public product list into reviewable catalog files.
// Category-free: each branch supplies its own labels, fields and taxonomy.

/** The parts of a Shopify product an importer reads (Shopify's public /products.json). */
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

/**
 * One item in a reviewable catalog file. Facts only: no marketing copy, images, prices or links are
 * kept, and a field the source doesn't state is null, never a guess.
 */
export interface CatalogEntryOf<A> {
  brand: string
  name: string
  attributes: A & { source?: string }
  strength: number | null
  tags: ItemTag[]
  /** What the reviewer should check before loading; not written to the database. */
  review: string[]
  /** Every site that listed this item (domains only). */
  sources?: string[]
  /** The source's own product photos, as addresses for the reviewer to look at. Never downloaded or loaded. */
  reference_images: string[]
}

/** One maker's reviewable catalog file. */
export interface MakerFileOf<E> {
  maker: { name: string; website?: string | null; country?: string | null }
  category: string
  entries: E[]
}

export const tagsOf = (p: ShopifyProduct) => (Array.isArray(p.tags) ? p.tags.join(' ') : p.tags ?? '')

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

export const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s.;,]+$/g, '').trim()

/**
 * "Label: value" lines. Only an explicit label counts, and a value ends where the next known label
 * starts (`stopLabels` are regex fragments). Values over 80 characters are prose, not a fact: null.
 */
export function labelledWith(text: string, labels: string[], stopLabels: string[]): string | null {
  const next = new RegExp(`\\s(?:${stopLabels.join('|')})\\s*:`, 'i')
  for (const label of labels) {
    const m = text.match(new RegExp(`(?:^|\\n|\\s)${label}s?\\s*[:\\-–—]\\s*([^\\n|]{2,200})`, 'i'))
    if (!m) continue
    const value = tidy(m[1].split(next)[0].replace(/[\\"”]+$/, ''))
    if (value) return value.length > 80 ? null : value
  }
  return null
}

/** Notes a description names, mapped through a taxonomy. Named descriptors outrank named families. */
export function tagsFromTextWith(text: string, taxonomy: Taxonomy): ItemTag[] {
  const lower = text.toLowerCase()
  const byFamily = new Map<string, number>()
  const has = (word: string) => new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).test(lower)
  for (const d of taxonomy.descriptors) if (has(d.label.toLowerCase())) byFamily.set(d.family, Math.max(byFamily.get(d.family) ?? 0, 0.6))
  for (const f of taxonomy.families) if (has(f.label.toLowerCase())) byFamily.set(f.id, Math.max(byFamily.get(f.id) ?? 0, 0.5))
  return [...byFamily].map(([family, weight]) => ({ family, weight }))
}

export const makerSlug = (name: string) =>
  name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown'

/** Fills `into`'s blank fields from `from`, and unions tags, sources and reference photos. */
export function fillBlanks<A>(into: CatalogEntryOf<A>, from: CatalogEntryOf<A>, fields: readonly string[], tags: 'union' | 'if-empty') {
  const a = into.attributes as Record<string, unknown>
  const b = from.attributes as Record<string, unknown>
  for (const k of fields) if (a[k] == null && b[k] != null) a[k] = b[k]
  into.strength ??= from.strength
  if (tags === 'if-empty') { if (!into.tags.length) into.tags = from.tags } else {
    for (const t of from.tags) {
      const mine = into.tags.find((x) => x.family === t.family)
      if (!mine) into.tags.push(t)
      else mine.weight = Math.max(mine.weight, t.weight)
    }
  }
  into.sources = [...new Set([...(into.sources ?? []), ...(from.sources ?? [])])]
  into.reference_images = [...new Set([...into.reference_images, ...from.reference_images])].slice(0, 3)
}

/**
 * Folds a fresh fetch into a maker's existing file. What's already in the file was reviewed, so it
 * wins; the fetch only adds new entries, fills fields still blank, and adds its source.
 */
export function mergeIntoMakerFileWith<E extends CatalogEntryOf<unknown>>(
  existing: MakerFileOf<E> | null, maker: MakerFileOf<E>['maker'], category: string, fresh: E[], fields: readonly string[],
): MakerFileOf<E> {
  const file: MakerFileOf<E> = existing
    ? { ...existing, maker: { ...maker, ...existing.maker, website: existing.maker.website ?? maker.website ?? null } }
    : { maker, category, entries: [] }
  const key = (e: E) => e.name.toLowerCase().replace(/\s+/g, ' ')
  const byName = new Map(file.entries.map((e) => [key(e), e]))
  for (const e of fresh) {
    const kept = byName.get(key(e))
    if (!kept) { file.entries.push(e); byName.set(key(e), e); continue }
    fillBlanks(kept, e, fields, 'if-empty')
  }
  return file
}
