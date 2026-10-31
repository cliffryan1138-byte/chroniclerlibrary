import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cigarTaxonomy } from '../src/branches/cigar'
import { validateTaxonomy } from '../src/core'

const root = resolve(__dirname, '..')
const coreDir = join(root, 'src/core')

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]))

const coreFiles = walk(coreDir).filter((f) => /\.(ts|tsx)$/.test(f))

describe('three-layer rule', () => {
  it('core/ has files to check', () => expect(coreFiles.length).toBeGreaterThan(0))

  it.each(coreFiles.map((f) => [relative(root, f), f]))('%s imports nothing outside core/', (_, file) => {
    const src = readFileSync(file, 'utf8')
    const specifiers = [...src.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2])
    for (const spec of specifiers) {
      expect(spec.startsWith('.'), `${spec}: core/ may only import its own files`).toBe(true)
      const target = resolve(file, '..', spec)
      expect(target.startsWith(coreDir), `${spec} escapes core/`).toBe(true)
    }
  })

  it('core/ contains no category vocabulary', () => {
    const banned = [
      'cigar', 'tobacco', 'humidor', 'vitola', 'wrapper', 'binder', 'filler', 'ring_gauge', 'retrohale', 'draw', 'burn',
      'whiskey', 'bourbon', 'wine', 'beer', 'spirit',
      ...cigarTaxonomy.families.map((f) => f.id),
      ...cigarTaxonomy.descriptors.map((d) => d.label.toLowerCase()),
    ]
    for (const file of coreFiles) {
      const src = readFileSync(file, 'utf8').toLowerCase()
      for (const word of banned) {
        expect(new RegExp(`\\b${word.replace(/[-]/g, '\\-')}\\b`).test(src), `"${word}" found in ${relative(root, file)}`).toBe(false)
      }
    }
  })
})

describe('cigar taxonomy', () => {
  it('is valid: ten families, every descriptor in exactly one', () => {
    expect(() => validateTaxonomy(cigarTaxonomy)).not.toThrow()
    expect(cigarTaxonomy.families).toHaveLength(10)
    expect(cigarTaxonomy.descriptors).toHaveLength(44)
  })
})
