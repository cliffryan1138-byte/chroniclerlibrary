// Reads a Shopify store's public product list into a catalog file for review.
//   npm run catalog:shopify -- https://example-cigars.com --brand "Example" --out catalog/example.json
// Facts only (maker, name, size, leaf, origin, strength, named notes). No copy, images, prices or links.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fromShopifyProduct, isCigarProduct, mergeDuplicates, type CatalogEntry, type ShopifyProduct } from '../src/branches/cigar/catalog-import'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const site = args.find((a) => /^https?:\/\//.test(a))
if (!site) {
  console.error('usage: npm run catalog:shopify -- https://store.example.com [--brand "Maker"] [--out catalog/maker.json]')
  process.exit(1)
}
const origin = new URL(site).origin
const source = new URL(site).hostname.replace(/^www\./, '')
const out = flag('out') ?? `catalog/${source.split('.')[0]}.json`

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
const entries: CatalogEntry[] = mergeDuplicates(cigars.flatMap((p) => fromShopifyProduct(p, { brand: flag('brand'), source })))
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ source, fetched_at: new Date().toISOString(), entries }, null, 2) + '\n')

const flagged = entries.filter((e) => e.review.length).length
console.log(`${products.length} products, ${cigars.length} look like cigars, ${entries.length} catalog entries -> ${out}`)
console.log(`${flagged} entries have review notes. Open the file, fix or fill what's wrong, then: npm run catalog:sql -- ${out}`)
for (const p of products.filter((p) => !isCigarProduct(p))) console.log(`  skipped (not a cigar?): ${p.title}`)
