// Reads a Shopify store's public product list into one reviewable file per maker.
//   npm run catalog:shopify -- https://store.example.com                 # multi-brand store: each product's own maker
//   npm run catalog:shopify -- https://maker.example.com --maker "Maker"  # a maker's own store
//   npm run catalog:shopify -- https://store.example.com --category pipe_tobacco   # blends instead of cigars
// Files land in catalog/makers/<maker>.json (cigars) or catalog/pipe-tobacco/<maker>.json (blends).
// Re-running, or importing another store that carries the same maker, adds to that file: what's already
// there (your review) wins, new entries are appended.
// Facts only (maker, name, size or tin, leaf, cut, origin, strength, named notes). No copy, images, prices or links.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { CatalogEntryOf, MakerFileOf, ShopifyProduct } from '../src/core'
import * as cigar from '../src/branches/cigar'
import * as pipe from '../src/branches/pipe'

type Entry = CatalogEntryOf<unknown>
interface Importer {
  category: string; noun: string; dir: string
  accepts: (p: ShopifyProduct) => boolean
  read: (p: ShopifyProduct, opts: { brand?: string; source: string }) => Entry[]
  dedupe: (entries: Entry[]) => Entry[]
  merge: (existing: MakerFileOf<Entry> | null, maker: MakerFileOf<Entry>['maker'], category: string, fresh: Entry[]) => MakerFileOf<Entry>
}
const IMPORTERS: Record<string, Importer> = {
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

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const site = args.find((a) => /^https?:\/\//.test(a))
if (!site) {
  console.error('usage: npm run catalog:shopify -- https://store.example.com [--maker "Maker"] [--category cigar|pipe_tobacco] [--dir DIR]')
  process.exit(1)
}
const importer = IMPORTERS[(flag('category') ?? cigar.CATEGORY).replace('-', '_')]
if (!importer) {
  console.error(`--category must be one of: ${Object.keys(IMPORTERS).join(', ')}`)
  process.exit(1)
}
const forcedMaker = flag('maker') ?? flag('brand')
const origin = new URL(site).origin
const source = new URL(site).hostname.replace(/^www\./, '')
const dir = flag('dir') ?? importer.dir

const products: ShopifyProduct[] = []
for (let page = 1; page <= 20; page++) {
  const res = await fetch(`${origin}/products.json?limit=250&page=${page}`, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    console.error(`${origin}/products.json answered ${res.status}. Not a Shopify store, or its product list is turned off.`)
    process.exit(1)
  }
  const batch = ((await res.json()) as { products?: ShopifyProduct[] }).products ?? []
  products.push(...batch)
  if (batch.length < 250) break
}

const kept = products.filter(importer.accepts)
const entries = importer.dedupe(kept.flatMap((p) => importer.read(p, { brand: forcedMaker, source })))

const byMaker = new Map<string, Entry[]>()
for (const e of entries) {
  const name = e.brand || 'Unknown maker'
  byMaker.set(name, [...(byMaker.get(name) ?? []), e])
}

mkdirSync(dir, { recursive: true })
console.log(`${products.length} products, ${kept.length} look like ${importer.noun}, ${entries.length} ${importer.noun} from ${byMaker.size} maker(s):`)
for (const [name, list] of byMaker) {
  const path = `${dir}/${cigar.makerSlug(name)}.json`
  const existing = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as MakerFileOf<Entry>) : null
  // A maker's own store is its website; a multi-brand store isn't.
  const website = forcedMaker ? origin : null
  const file = importer.merge(existing, { name, website, country: null }, importer.category, list)
  writeFileSync(path, JSON.stringify(file, null, 2) + '\n')
  const flagged = file.entries.filter((e) => e.review.length).length
  console.log(`  ${name}: ${list.length} fetched, ${file.entries.length} in ${path} (${flagged} with review notes)`)
}
for (const p of products.filter((p) => !importer.accepts(p))) console.log(`  skipped (not a single ${importer.noun.replace(/s$/, '')}?): ${p.title}`)
console.log(`Review the files, then: npm run catalog:sql -- ${dir}/<maker>.json > ${dir}/<maker>.sql`)
