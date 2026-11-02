// The import itself, shared by catalog-from-shopify.ts (one store) and catalog-makers.ts (a list of makers).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { normalizeName } from '../src/app/lib'
import type { CatalogEntryOf, MakerFileOf, ShopifyProduct } from '../src/core'
import * as cigar from '../src/branches/cigar'
import * as pipe from '../src/branches/pipe'

type Entry = CatalogEntryOf<unknown>
export interface Importer {
  category: string; noun: string; dir: string
  accepts: (p: ShopifyProduct) => boolean
  read: (p: ShopifyProduct, opts: { brand?: string; source: string }) => Entry[]
  dedupe: (entries: Entry[]) => Entry[]
  merge: (existing: MakerFileOf<Entry> | null, maker: MakerFileOf<Entry>['maker'], category: string, fresh: Entry[]) => MakerFileOf<Entry>
}
export const IMPORTERS: Record<string, Importer> = {
  [cigar.CATEGORY]: {
    category: cigar.CATEGORY, noun: 'cigars', dir: 'catalog/makers',
    accepts: cigar.isCigarProduct, read: cigar.fromShopifyProduct,
    dedupe: cigar.mergeDuplicates as Importer['dedupe'], merge: cigar.mergeIntoMakerFile as unknown as Importer['merge'],
  },
  [pipe.CATEGORY]: {
    category: pipe.CATEGORY, noun: 'blends', dir: 'catalog/pipe-tobacco',
    accepts: pipe.isPipeTobaccoProduct, read: (p, o) => [pipe.fromShopifyBlend(p, o)],
    dedupe: pipe.mergeDuplicateBlends as Importer['dedupe'], merge: pipe.mergeIntoBlendFile as unknown as Importer['merge'],
  },
}
export const importerFor = (category: string | undefined) => IMPORTERS[(category ?? cigar.CATEGORY).replace('-', '_')]

/** Why a site couldn't be read, in words for the person running the script. */
export class NotShopify extends Error {}

const HEADERS = { accept: 'application/json', 'user-agent': 'CaptainsCellarCompanion-catalog/1.0 (personal tasting journal; facts only)' }

/** Every product in a Shopify store's public list. Throws NotShopify when the site doesn't offer one. */
export async function fetchProducts(site: string): Promise<ShopifyProduct[]> {
  const origin = new URL(site).origin
  const products: ShopifyProduct[] = []
  for (let page = 1; page <= 20; page++) {
    let res: Response
    try {
      res = await fetch(`${origin}/products.json?limit=250&page=${page}`, { headers: HEADERS, redirect: 'follow' })
    } catch (e) {
      throw new NotShopify(`couldn't reach the site (${e instanceof Error ? e.message : e})`)
    }
    if (!res.ok) throw new NotShopify(`no Shopify product list (answered ${res.status})`)
    const body = (await res.json().catch(() => null)) as { products?: ShopifyProduct[] } | null
    if (!body || !Array.isArray(body.products)) throw new NotShopify('no Shopify product list (answered with a web page)')
    products.push(...body.products)
    if (body.products.length < 250) break
  }
  return products
}

export interface ImportResult { products: number; kept: number; entries: number; files: { maker: string; path: string; fetched: number; total: number; flagged: number }[]; skipped: string[] }

/**
 * Reads products into one reviewable file per maker. With `maker` set (a maker's own store), products
 * the store lists under its own name, or under no name, go to that maker; products it lists under another
 * vendor (other brands it carries) go to that vendor's file instead.
 */
export function importProducts(products: ShopifyProduct[], opts: { site: string; importer: Importer; maker?: string; dir?: string }): ImportResult {
  const { importer } = opts
  const source = new URL(opts.site).hostname.replace(/^www\./, '')
  const dir = opts.dir ?? importer.dir
  const own = opts.maker ? normalizeName(opts.maker) : null
  const brandOf = (p: ShopifyProduct) => {
    if (!opts.maker) return undefined
    const vendor = normalizeName(p.vendor ?? '')
    const isOwn = !vendor || vendor === own || vendor.includes(own!) || own!.includes(vendor) || source.replace(/\.[a-z.]+$/, '').includes(vendor.replace(/[^a-z0-9]/g, ''))
    return isOwn ? opts.maker : p.vendor
  }
  const kept = products.filter(importer.accepts)
  const entries = importer.dedupe(kept.flatMap((p) => importer.read(p, { brand: brandOf(p), source })))
  const byMaker = new Map<string, Entry[]>()
  for (const e of entries) {
    const name = e.brand || 'Unknown maker'
    byMaker.set(name, [...(byMaker.get(name) ?? []), e])
  }
  mkdirSync(dir, { recursive: true })
  const files: ImportResult['files'] = []
  for (const [name, list] of byMaker) {
    const path = `${dir}/${cigar.makerSlug(name)}.json`
    const existing = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as MakerFileOf<Entry>) : null
    // A maker's own store is its website; another vendor's products, or a multi-brand store, aren't.
    const website = opts.maker && name === opts.maker ? new URL(opts.site).origin : null
    const file = importer.merge(existing, { name, website, country: null }, importer.category, list)
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n')
    files.push({ maker: name, path, fetched: list.length, total: file.entries.length, flagged: file.entries.filter((e) => e.review.length).length })
  }
  return { products: products.length, kept: kept.length, entries: entries.length, files, skipped: products.filter((p) => !importer.accepts(p)).map((p) => p.title) }
}
