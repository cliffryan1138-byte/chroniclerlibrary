// Goes down a list of makers' own websites and pulls the catalog from every one that runs on Shopify.
//   npm run catalog:makers                                  # uses catalog/maker-sites.json
//   npm run catalog:makers -- my-list.json --only "Maker"   # another list, or just one maker from it
// For each site: Shopify → reviewable files (catalog/makers/ or catalog/pipe-tobacco/); not Shopify →
// listed at the end as catalog-only, to be entered another way. Nothing is loaded into the database
// here: review the files, then npm run catalog:sql. Facts only, as in catalog-from-shopify.ts.
import { readFileSync } from 'node:fs'
import { fetchProducts, importerFor, importProducts, NotShopify } from './shopify-import'

interface MakerSite { maker: string; site: string; category: string; note?: string }

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const listPath = args.find((a) => a.endsWith('.json')) ?? 'catalog/maker-sites.json'
const only = flag('only')?.toLowerCase()
const list = (JSON.parse(readFileSync(listPath, 'utf8')) as { makers: MakerSite[] }).makers
  .filter((m) => !only || m.maker.toLowerCase().includes(only))

const pulled: string[] = []
const catalogOnly: string[] = []
const touched = new Set<string>()
for (const [i, m] of list.entries()) {
  const importer = importerFor(m.category)
  if (!importer) { catalogOnly.push(`${m.maker}: unknown category "${m.category}"`); continue }
  process.stdout.write(`${m.maker} (${m.site}) … `)
  try {
    const r = importProducts(await fetchProducts(m.site), { site: m.site, importer, maker: m.maker })
    if (!r.entries) { console.log(`Shopify, but no ${importer.noun} found among ${r.products} products`); catalogOnly.push(`${m.maker}: Shopify, nothing that looks like ${importer.noun}`); continue }
    console.log(`${r.entries} ${importer.noun}`)
    for (const f of r.files) { console.log(`    ${f.maker}: ${f.total} in ${f.path} (${f.flagged} with review notes)`); touched.add(f.path) }
    pulled.push(`${m.maker}: ${r.entries} ${importer.noun}`)
  } catch (e) {
    if (!(e instanceof NotShopify)) throw e
    console.log(e.message)
    catalogOnly.push(`${m.maker}: ${e.message}`)
  }
  if (i < list.length - 1) await new Promise((r) => setTimeout(r, 1000)) // one site at a time, gently
}

console.log(`\nPulled from ${pulled.length} of ${list.length} makers.`)
if (catalogOnly.length) console.log(`\nNot pulled (catalog-only sites, or unreachable):\n  ${catalogOnly.join('\n  ')}`)
if (touched.size) console.log(`\nReview the files, then turn them into SQL:\n  npm run catalog:sql -- ${[...touched].join(' ')} > catalog/new-makers.sql`)
