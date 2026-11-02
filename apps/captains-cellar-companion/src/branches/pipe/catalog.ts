import type { Item } from '../../core'
import type { PipeAttributes } from './rules'
import { CATEGORY } from './rules'

// SAMPLE DATA ONLY. Made-up placeholder blends so the UI has something to show. Not real products.

type Sample = [name: string, strength: number, attrs: PipeAttributes, tags: [family: string, weight: number][]]

const samples: Sample[] = [
  ['SAMPLE Morning Virginia Flake', 3, { blend_style: 'Virginia', components: ['Virginia'], cut: 'Flake' }, [['grassy', 1], ['sweet', 0.8], ['fruity', 0.5]]],
  ['SAMPLE Aged Red Virginia', 3, { blend_style: 'Virginia', components: ['Virginia'], cut: 'Broken flake' }, [['fruity', 1], ['sweet', 0.9], ['roasted', 0.4]]],
  ['SAMPLE Harbor Navy Plug', 4, { blend_style: 'Navy', components: ['Virginia', 'Burley'], cut: 'Plug' }, [['sweet', 0.8], ['fruity', 0.7], ['spicy', 0.4]]],
  ['SAMPLE Campfire English', 3, { blend_style: 'English', components: ['Latakia', 'Virginia', 'Oriental'], cut: 'Ribbon' }, [['smoky', 1], ['woody', 0.6], ['earthy', 0.5]]],
  ['SAMPLE Balkan Evening', 3, { blend_style: 'Balkan', components: ['Latakia', 'Oriental', 'Virginia'], cut: 'Ribbon' }, [['smoky', 0.8], ['spicy', 0.7], ['floral', 0.5]]],
  ['SAMPLE Peppered Fig VaPer', 3, { blend_style: 'VaPer', components: ['Virginia', 'Perique'], cut: 'Flake' }, [['fruity', 1], ['spicy', 0.8], ['sweet', 0.5]]],
  ['SAMPLE Burley Nut Brown', 3, { blend_style: 'Burley', components: ['Burley'], cut: 'Ribbon' }, [['nutty', 1], ['roasted', 0.7], ['earthy', 0.4]]],
  ['SAMPLE Cocoa Burley Crumble', 2, { blend_style: 'VaBur', components: ['Virginia', 'Burley'], cut: 'Crumble cake' }, [['roasted', 1], ['nutty', 0.7], ['sweet', 0.5]]],
  ['SAMPLE Vanilla Custard Aromatic', 1, { blend_style: 'Aromatic', components: ['Cavendish', 'Virginia'], cut: 'Ribbon' }, [['creamy', 1], ['sweet', 1]]],
  ['SAMPLE Black Cherry Cavendish', 1, { blend_style: 'Aromatic', components: ['Cavendish', 'Burley'], cut: 'Ribbon' }, [['fruity', 0.9], ['sweet', 0.9], ['creamy', 0.5]]],
  ['SAMPLE Oriental Spice Mixture', 2, { blend_style: 'Oriental', components: ['Oriental', 'Virginia'], cut: 'Ribbon' }, [['spicy', 1], ['woody', 0.7], ['floral', 0.6]]],
  ['SAMPLE Heavy Scottish Flake', 4, { blend_style: 'Scottish', components: ['Virginia', 'Latakia'], cut: 'Flake' }, [['earthy', 0.8], ['smoky', 0.6], ['sweet', 0.5]]],
]

/** Deterministic UUID-shaped ids (a different block from the cigar samples). */
const sampleId = (n: number) => `00000000-0000-4000-8001-${String(n).padStart(12, '0')}`

export const sampleCatalog: Item[] = samples.map(([name, strength, attrs, tags], i) => ({
  id: sampleId(i + 1),
  category: CATEGORY,
  brand: `SAMPLE Blender ${String.fromCharCode(65 + (i % 4))}`,
  name,
  attributes: { origin: 'Sample origin', ...attrs },
  strength,
  status: 'curated',
  tags: tags.map(([family, weight]) => ({ family, weight })),
}))
