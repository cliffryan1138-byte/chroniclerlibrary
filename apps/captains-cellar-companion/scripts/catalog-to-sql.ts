// Turns a reviewed catalog file into SQL to paste into the Supabase SQL editor.
//   npm run catalog:sql -- catalog/example.json > catalog/example.sql
// Re-running it updates the same cigars instead of duplicating them: each id is derived from maker + name.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { CATEGORY, type CatalogEntry } from '../src/branches/cigar'

const file = process.argv[2]
if (!file) {
  console.error('usage: npm run catalog:sql -- catalog/maker.json > catalog/maker.sql')
  process.exit(1)
}
const { source, entries } = JSON.parse(readFileSync(file, 'utf8')) as { source: string; entries: CatalogEntry[] }

/** Stable UUID from maker + name, so a re-import updates rather than duplicates. */
export function catalogId(brand: string, name: string): string {
  const h = createHash('sha1').update(`${CATEGORY}|${brand}|${name}`.toLowerCase().replace(/\s+/g, ' ')).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`
const lines = [`-- GENERATED from ${file} (${source}) by scripts/catalog-to-sql.ts. Review the JSON, not this file.`, 'begin;']
let count = 0
for (const e of entries) {
  if (!e.brand || !e.name) continue
  const id = catalogId(e.brand, e.name)
  const strength = e.strength != null && e.strength >= 1 && e.strength <= 5 ? Math.round(e.strength) : 'null'
  lines.push(
    `insert into public.items (id, category, brand, name, attributes, strength, status) values (${q(id)}, ${q(CATEGORY)}, ${q(e.brand)}, ${q(e.name)}, ${q(JSON.stringify(e.attributes))}::jsonb, ${strength}, 'curated')`,
    `  on conflict (id) do update set brand = excluded.brand, name = excluded.name, attributes = excluded.attributes, strength = excluded.strength, status = 'curated';`,
    `delete from public.item_tags where item_id = ${q(id)};`,
  )
  for (const t of e.tags ?? []) {
    lines.push(`insert into public.item_tags (item_id, family, descriptor, weight) values (${q(id)}, ${q(t.family)}, ${t.descriptor ? q(t.descriptor) : 'null'}, ${Math.max(0, Math.min(1, t.weight))});`)
  }
  count++
}
lines.push('commit;', `-- ${count} cigars`)
console.log(lines.join('\n'))
