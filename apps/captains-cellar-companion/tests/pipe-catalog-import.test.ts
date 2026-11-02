import { describe, expect, it } from 'vitest'
import {
  cleanBlendName, componentsFrom, cutFrom, fromShopifyBlend, guessStyle, isPipeTobaccoProduct, mergeDuplicateBlends,
  mergeIntoBlendFile, nicotineFromWords, tinSizes,
} from '../src/branches/pipe'

// A made-up blender's store, shaped like Shopify's /products.json. No real products.
const flake = {
  title: 'Example Blending Co - Harbour Flake 50g Tin',
  vendor: 'Example Blending Co',
  product_type: 'Pipe Tobacco',
  tags: ['VaPer', 'Strength_Medium'],
  body_html: '<p>Aged red Virginias pressed with a measure of Perique. Notes of fig, raisin and a little black pepper.</p>' +
    '<ul><li>Tobaccos: Virginia, Perique</li><li>Cut: Broken Flake</li><li>Made in: Denmark</li></ul>',
  options: [{ name: 'Size', values: ['50g', '100g'] }],
  images: [{ src: 'https://example.com/tin.jpg' }],
}

describe('reading a Shopify product into a blend', () => {
  it('keeps the stated facts and moves the tin size out of the name', () => {
    const e = fromShopifyBlend(flake, { source: 'example.com' })
    expect(e.brand).toBe('Example Blending Co')
    expect(e.name).toBe('Harbour Flake')
    expect(e.attributes).toEqual({
      source: 'example.com', blend_style: 'VaPer', components: ['Virginia', 'Perique'], cut: 'Broken flake', tin_size: '50g, 100g', origin: 'Denmark',
    })
    expect(e.strength).toBe(3)
    expect(e.tags.map((t) => t.family).sort()).toEqual(['fruity', 'spicy'])
    expect(e.review).toEqual([])
    expect(e.reference_images).toEqual(['https://example.com/tin.jpg'])
  })

  it('flags what it had to guess, and names what is missing', () => {
    const e = fromShopifyBlend({ title: 'Example Campfire Mixture 2 oz', vendor: 'Example Blending Co', body_html: 'Smoky Latakia over sweet Virginia.' }, { source: 'example.com' })
    expect(e.name).toBe('Example Campfire Mixture')
    expect(e.attributes.blend_style).toBe('English')
    expect(e.attributes.tin_size).toBe('2 oz')
    expect(e.review).toEqual(['style guessed from the leaf (English): check', 'leaf read from the description: check', 'no cut stated', 'no strength stated'])
  })
})

describe('telling blends from everything else a pipe shop sells', () => {
  const p = (title: string, product_type = '', tags: string[] = []) => ({ title, product_type, tags })
  it.each([
    [p('Harbour Flake 50g', 'Pipe Tobacco'), true],
    [p('Old Port Navy Plug'), true],
    [p('Morning Ribbon 16 oz Bulk Bag'), true],
    [p('Example Cherry Cavendish 1 lb jar'), true],
    [p('Example Bent Billiard Briar Pipe', 'Pipes'), false],
    [p('Example Corn Cob Pipe'), false],
    [p('Pipe Cleaners, 100 count'), false],
    [p('Leather Tobacco Pouch'), false],
    [p('Glass Tobacco Jar'), false],
    [p('Example Robusto Cigar', 'Cigars'), false],
    [p('Pipe Tobacco Sampler 5 x 50g', 'Pipe Tobacco'), false],
    [p('Example Pipe Tamper'), false],
  ])('%o → %s', (product, expected) => expect(isPipeTobaccoProduct(product)).toBe(expected))
})

describe('the small readers', () => {
  it('cleans names', () => {
    expect(cleanBlendName('Example Co: Morning Virginia (100g tin)', 'Example Co')).toBe('Morning Virginia')
    expect(cleanBlendName('Pipe Tobacco - Old Port Navy Plug 1.75oz', 'Someone Else')).toBe('Old Port Navy Plug')
    expect(cleanBlendName('Example Co', 'Example Co')).toBe('Example Co') // never strips the name to nothing
  })
  it('reads tin sizes from the title and options', () => {
    expect(tinSizes({ title: 'X 1.75oz', options: [{ name: 'Size', values: ['1.75 oz', '8 oz', '1 lb'] }] })).toBe('1.75 oz, 8 oz, 1 lb')
    expect(tinSizes({ title: 'X' })).toBeUndefined()
  })
  it('prefers a labelled leaf line, and says when it read the prose instead', () => {
    expect(componentsFrom('Tobaccos: Burley, Kentucky\nUnlike our Latakia blends…')).toEqual({ components: ['Burley', 'Kentucky'], fromLabel: true })
    expect(componentsFrom('Turkish and Izmir leaf with Cyprian Latakia')).toEqual({ components: ['Latakia', 'Oriental'], fromLabel: false })
  })
  it('reads cuts', () => {
    expect(cutFrom('Example Ready Rubbed', '')).toBe('Ready rubbed')
    expect(cutFrom('Example', 'Cut: Curly coins')).toBe('Coin')
    expect(cutFrom('Example Flake', 'Cut: Ribbon')).toBe('Ribbon') // the label wins
  })
  it('guesses styles only from clear signals', () => {
    expect(guessStyle(['Virginia', 'Burley'], '')).toBe('VaBur')
    expect(guessStyle(['Virginia'], 'topped with vanilla')).toBe('Aromatic')
    expect(guessStyle(['Virginia', 'Oriental', 'Burley'], '')).toBeUndefined()
  })
  it('reads nicotine words', () => {
    expect(nicotineFromWords('Mild to Medium')).toBe(2)
    expect(nicotineFromWords('Very strong')).toBe(5)
    expect(nicotineFromWords('Full')).toBe(4)
    expect(nicotineFromWords(null)).toBeNull()
  })
})

describe('merging', () => {
  it('folds a tin and a bulk listing of one blend together', () => {
    const tin = fromShopifyBlend(flake, { source: 'a.example' })
    const bulk = fromShopifyBlend({ ...flake, title: 'Harbour Flake 16 oz Bulk', options: [], body_html: 'Tobaccos: Virginia, Perique' }, { source: 'b.example' })
    const [one, ...rest] = mergeDuplicateBlends([tin, bulk])
    expect(rest).toEqual([])
    expect(one.attributes.tin_size).toBe('50g, 100g, 16 oz')
    expect(one.sources).toEqual(['a.example', 'b.example'])
  })
  it('keeps your reviewed file over a fresh fetch', () => {
    const reviewed = { ...fromShopifyBlend(flake, { source: 'a.example' }), attributes: { blend_style: 'Virginia' } }
    const file = mergeIntoBlendFile({ maker: { name: 'Example Blending Co' }, category: 'pipe_tobacco', entries: [reviewed] },
      { name: 'Example Blending Co', website: 'https://example.com' }, 'pipe_tobacco', [fromShopifyBlend(flake, { source: 'b.example' })])
    expect(file.entries).toHaveLength(1)
    expect(file.entries[0].attributes.blend_style).toBe('Virginia')
    expect(file.entries[0].attributes.cut).toBe('Broken flake') // blank before, filled now
    expect(file.maker.website).toBe('https://example.com')
  })
})
