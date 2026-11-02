// Reads a Shopify store's public product list into one reviewable file per maker.
//   npm run catalog:shopify -- https://store.example.com                 # multi-brand store: each product's own maker
//   npm run catalog:shopify -- https://maker.example.com --maker "Maker"  # a maker's own store
// Files land in catalog/makers/<maker>.json. Re-running, or importing another store that carries the same
// maker, adds to that file: what's already there (your review) wins, new cigars are appended.
// Facts only (maker, name, size, leaf, origin, strength, named notes). No copy, images, prices or links.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  CATEGORY, fromShopifyProduct, isCigarProduct, makerSlug, mergeDuplicates, mergeIntoMakerFile,
  type CatalogEntry, type MakerFile, type ShopifyProduct,
} from '../src/branches/cigar'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const site = args.find((a) => /^https?:\/\//.test(a))
if (!site) {
  console.error('usage: npm run catalog:shopify -- https://store.example.com [--maker "Maker"] [--dir catalog/makers]')
  process.exit(1)
}
const forcedMaker = flag('maker') ?? flag('brand')
const origin = new URL(site).origin
const source = new URL(site).hostname.replace(/^www\./, '')
const dir = flag('dir') ?? 'catalog/makers'

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

const cigars = products.filter(isCigarProduct)
const entries = mergeDuplicates(cigars.flatMap((p) => fromShopifyProduct(p, { brand: forcedMaker, source })))

const byMaker = new Map<string, CatalogEntry[]>()
for (const e of entries) {
  const name = e.brand || 'Unknown maker'
  byMaker.set(name, [...(byMaker.get(name) ?? []), e])
}

mkdirSync(dir, { recursive: true })
console.log(`${products.length} products, ${cigars.length} look like cigars, ${entries.length} cigars from ${byMaker.size} maker(s):`)
for (const [name, list] of byMaker) {
  const path = `${dir}/${makerSlug(name)}.json`
  const existing = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as MakerFile) : null
  // A maker's own store is its website; a multi-brand store isn't.
  const website = forcedMaker ? origin : null
  const file = mergeIntoMakerFile(existing, { name, website, country: null }, CATEGORY, list)
  writeFileSync(path, JSON.stringify(file, null, 2) + '\n')
  const flagged = file.entries.filter((e) => e.review.length).length
  console.log(`  ${name}: ${list.length} fetched, ${file.entries.length} in ${path} (${flagged} with review notes)`)
}
for (const p of products.filter((p) => !isCigarProduct(p))) console.log(`  skipped (not a single cigar?): ${p.title}`)
console.log(`Review the files, then: npm run catalog:sql -- ${dir}/<maker>.json > ${dir}/<maker>.sql`)
