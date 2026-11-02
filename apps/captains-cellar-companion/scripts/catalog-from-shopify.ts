// Reads a Shopify store's public product list into one reviewable file per maker.
//   npm run catalog:shopify -- https://store.example.com                 # multi-brand store: each product's own maker
//   npm run catalog:shopify -- https://maker.example.com --maker "Maker"  # a maker's own store
//   npm run catalog:shopify -- https://store.example.com --category pipe_tobacco   # blends instead of cigars
// Files land in catalog/makers/<maker>.json (cigars) or catalog/pipe-tobacco/<maker>.json (blends).
// Re-running, or importing another store that carries the same maker, adds to that file: what's already
// there (your review) wins, new entries are appended. For a whole list of makers, see catalog-makers.ts.
// Facts only (maker, name, size or tin, leaf, cut, origin, strength, named notes). No copy, images, prices or links.
import { fetchProducts, importerFor, importProducts, IMPORTERS, NotShopify } from './shopify-import'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const site = args.find((a) => /^https?:\/\//.test(a))
if (!site) {
  console.error('usage: npm run catalog:shopify -- https://store.example.com [--maker "Maker"] [--category cigar|pipe_tobacco] [--dir DIR]')
  process.exit(1)
}
const importer = importerFor(flag('category'))
if (!importer) {
  console.error(`--category must be one of: ${Object.keys(IMPORTERS).join(', ')}`)
  process.exit(1)
}

try {
  const products = await fetchProducts(site)
  const r = importProducts(products, { site, importer, maker: flag('maker') ?? flag('brand'), dir: flag('dir') })
  console.log(`${r.products} products, ${r.kept} look like ${importer.noun}, ${r.entries} ${importer.noun} from ${r.files.length} maker(s):`)
  for (const f of r.files) console.log(`  ${f.maker}: ${f.fetched} fetched, ${f.total} in ${f.path} (${f.flagged} with review notes)`)
  for (const t of r.skipped) console.log(`  skipped (not a single ${importer.noun.replace(/s$/, '')}?): ${t}`)
  console.log(`Review the files, then: npm run catalog:sql -- ${flag('dir') ?? importer.dir}/<maker>.json > out.sql`)
} catch (e) {
  if (e instanceof NotShopify) { console.error(`${new URL(site).origin}: ${e.message}. Not a Shopify store, or its product list is turned off.`); process.exit(1) }
  throw e
}
