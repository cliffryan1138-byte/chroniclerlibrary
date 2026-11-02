import { describe, expect, it } from 'vitest'
import { cleanName, fromShopifyProduct, isCigarProduct, labelled, mergeDuplicates, parseSize, strengthFromWords, stripHtml, tagsFromText } from '../src/branches/cigar'

// A made-up store: shaped like Shopify's /products.json, no real products.
const robusto = {
  title: 'Example House Robusto - Box of 20',
  vendor: 'Example Cigar Co',
  product_type: 'Cigars',
  tags: ['cigars', 'maduro'],
  body_html: '<p>A slow, rich smoke with notes of dark chocolate, cedar and a little black pepper.</p>' +
    '<ul><li>Size: 5 x 50</li><li>Wrapper: Connecticut Broadleaf Maduro</li><li>Binder: Nicaraguan</li>' +
    '<li>Filler: Nicaraguan &amp; Dominican</li><li>Strength: Medium to Full</li><li>Origin: Nicaragua</li></ul>',
  options: [{ name: 'Quantity', values: ['Single', 'Box of 20'] }],
  images: [{ src: 'https://example.com/band.jpg' }],
}

describe('reading a Shopify product into a catalog entry', () => {
  it('keeps the stated facts and drops packaging from the name', () => {
    const [e] = fromShopifyProduct(robusto, { source: 'example.com' })
    expect(e.brand).toBe('Example Cigar Co')
    expect(e.name).toBe('Example House Robusto')
    expect(e.attributes).toEqual({
      source: 'example.com', vitola: 'Robusto', length: 5, ring_gauge: 50,
      wrapper: 'Connecticut Broadleaf Maduro', binder: 'Nicaraguan', filler: 'Nicaraguan & Dominican', origin: 'Nicaragua',
    })
    expect(e.strength).toBe(4)
    expect(e.tags.map((t) => t.family).sort()).toEqual(['roasted', 'spicy', 'woody'])
    expect(e.review).toEqual([])
    expect(e.reference_images).toEqual(['https://example.com/band.jpg'])
  })

  it('splits a product sold in several sizes into one cigar per size', () => {
    const entries = fromShopifyProduct({
      title: 'Example Reserva', vendor: 'Example Cigar Co',
      options: [{ name: 'Size', values: ['Robusto 5 x 50', 'Toro 6 x 52', 'Box of 20'] }],
    }, { source: 'example.com' })
    expect(entries.map((e) => [e.name, e.attributes.vitola, e.attributes.length, e.attributes.ring_gauge])).toEqual([
      ['Example Reserva Robusto 5 x 50', 'Robusto', 5, 50],
      ['Example Reserva Toro 6 x 52', 'Toro', 6, 52],
    ])
  })

  it('never fills in what the page does not say, and lists it for review', () => {
    const [e] = fromShopifyProduct({ title: 'Example Toro', vendor: 'Example Cigar Co', body_html: '<p>Our favorite.</p>' }, { source: 'example.com' })
    expect(e.attributes).toEqual({ source: 'example.com', vitola: 'Toro' })
    expect(e.strength).toBeNull()
    expect(e.tags).toEqual([])
    expect(e.review).toContain('no wrapper stated')
    expect(e.review).toContain('no strength stated')
  })

  it('a --brand override wins over the store vendor', () => {
    expect(fromShopifyProduct(robusto, { brand: 'Example Brand', source: 'x' })[0].brand).toBe('Example Brand')
  })

  it('skips accessories and merch', () => {
    expect(isCigarProduct(robusto)).toBe(true)
    expect(isCigarProduct({ title: 'Double Blade Cutter', product_type: 'Accessories', tags: ['cigars'] })).toBe(false)
    expect(isCigarProduct({ title: 'Logo T-Shirt', product_type: 'Apparel' })).toBe(false)
  })
})

describe('parsing helpers', () => {
  it('reads sizes in the usual forms', () => {
    expect(parseSize('5 1/2 x 52')).toEqual({ length: 5.5, ring_gauge: 52 })
    expect(parseSize('6" x 54')).toEqual({ length: 6, ring_gauge: 54 })
    expect(parseSize('50 x 5')).toEqual({ length: 5, ring_gauge: 50 })
    expect(parseSize('Box of 20')).toEqual({})
  })
  it('maps strength words, and nothing else', () => {
    expect([strengthFromWords('Mild'), strengthFromWords('Mild-Medium'), strengthFromWords('Medium'),
      strengthFromWords('Medium to Full'), strengthFromWords('Full bodied'), strengthFromWords('Bold!')]).toEqual([1, 2, 3, 4, 5, null])
  })
  it('only takes labelled values', () => {
    expect(labelled('Wrapper: Ecuador Habano\nBinder - Nicaragua', ['wrapper'])).toBe('Ecuador Habano')
    expect(labelled('A wrapper from Ecuador', ['wrapper'])).toBeNull()
  })
  it('strips markup', () => expect(stripHtml('<p>a&nbsp;b</p><br>c')).toBe('a b\nc'))
  it('finds named notes through the taxonomy', () => {
    expect(tagsFromText('Hints of espresso and cream').map((t) => t.family).sort()).toEqual(['creamy', 'roasted'])
  })
})

describe('what a real store feed throws at it', () => {
  it('skips merch, coffee, samplers, promos and non-products', () => {
    for (const title of ['House T-Shirts Large', 'Espresso Robusto Ground Coffee Can', 'Espresso Robusto 16oz', 'Big Sampler',
      "Father's Day Sampler Gift Pack", 'Bespoke Cigar Club', 'Two complimentary cigars for orders over $50',
      'Bonus Cigar for every $25', 'Drink Cigar Holders', 'Ybor Cigar Factory Building']) {
      expect(isCigarProduct({ title, product_type: 'Cigars' }), title).toBe(false)
    }
    expect(isCigarProduct({ title: 'Robusto Sweet Lips', product_type: 'Cigars' })).toBe(true)
  })

  it('takes pack counts and sizes out of names', () => {
    expect(cleanName('Barberpole Toro 6"X52 - 25ct Bundle')).toBe('Barberpole Toro')
    expect(cleanName('Toro Habano Sweet Lips 6x52- 5ct Bundle')).toBe('Toro Habano Sweet Lips')
    expect(cleanName('Torpedo Habano 6 1/8 x 52 (25ct Bundle)')).toBe('Torpedo Habano')
    expect(cleanName('OB Mild Corona 42x5” 25ct')).toBe('OB Mild Corona')
    expect(cleanName('Churchill 4 Pack Limited Edition')).toBe('Churchill')
    expect(cleanName('Patriarch Robusto Box Press')).toBe('Patriarch Robusto Box Press')
  })

  it('stops a value where the next label starts on the same line', () => {
    const text = 'Corona — 42 × 5 Wrapper: U.S. Connecticut Filler: Nicaraguan Seco & Colombian Viso Finish: Sweet Tip'
    expect(labelled(text, ['wrapper'])).toBe('U.S. Connecticut')
    expect(labelled(text, ['filler'])).toBe('Nicaraguan Seco & Colombian Viso')
    expect(labelled('Wrapper: Maduro Ecuadorian Habano Seed\\', ['wrapper'])).toBe('Maduro Ecuadorian Habano Seed')
  })

  it('takes the vitola from a real vitola word, not a size line', () => {
    const [e] = fromShopifyProduct({ title: 'Example Robusto Box Press', vendor: 'X', body_html: '<p>Shape: 50x5" box press</p>' }, { source: 's' })
    expect(e.attributes.vitola).toBe('Robusto')
    expect([e.attributes.length, e.attributes.ring_gauge]).toEqual([5, 50])
  })

  it('trims "100% handmade in" from the origin', () => {
    const [e] = fromShopifyProduct({ title: 'Example Toro', vendor: 'X', body_html: '<p>Origin: 100% Handmade In Esteli Nicaragua</p>' }, { source: 's' })
    expect(e.attributes.origin).toBe('Esteli Nicaragua')
  })

  it('merges the same cigar sold in two pack sizes, keeping what either listing stated', () => {
    const a = fromShopifyProduct({ title: 'Example Sweet Lips 6x52- 5ct Bundle', vendor: 'X', body_html: '<p>Wrapper: Connecticut</p>' }, { source: 's' })
    const b = fromShopifyProduct({ title: 'Example Sweet Lips 6x52- 25ct Bundle', vendor: 'X', body_html: '<p>Strength: Mild. Notes of honey.</p>' }, { source: 's' })
    const merged = mergeDuplicates([...a, ...b])
    expect(merged).toHaveLength(1)
    expect(merged[0].name).toBe('Example Sweet Lips')
    expect(merged[0].attributes.wrapper).toBe('Connecticut')
    expect(merged[0].strength).toBe(1)
    expect(merged[0].review).not.toContain('no strength stated')
  })
})
