import { createHash } from 'node:crypto'

/** Stable UUID from category + maker + name, so a re-import updates rather than duplicates. */
export function catalogId(category: string, brand: string, name: string): string {
  const h = createHash('sha1').update(`${category}|${brand}|${name}`.toLowerCase().replace(/\s+/g, ' ')).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export const sqlQuote = (s: string) => `'${s.replace(/'/g, "''")}'`
