import type { Item } from '../../core'
import type { CigarAttributes } from './rules'
import { CATEGORY } from './rules'

// SAMPLE DATA ONLY. These are made-up placeholders so the UI has something to show.
// They are not real cigars and their tags are not tasting notes. Replace with the real catalog.

type Sample = [name: string, strength: number, attrs: CigarAttributes, tags: [family: string, weight: number][]]

const samples: Sample[] = [
  ['SAMPLE Morning Cedar Corona', 2, { vitola: 'Corona', ring_gauge: 42, length: 5.5, wrapper: 'Connecticut Shade' }, [['woody', 1], ['creamy', 0.8], ['nutty', 0.5]]],
  ['SAMPLE Velvet Cream Robusto', 1, { vitola: 'Robusto', ring_gauge: 50, length: 5, wrapper: 'Connecticut Shade' }, [['creamy', 1], ['sweet', 0.6], ['nutty', 0.6]]],
  ['SAMPLE Hayfield Petit', 2, { vitola: 'Petit Corona', ring_gauge: 40, length: 4.5, wrapper: 'Sample Natural' }, [['earthy', 0.8], ['floral', 0.8], ['woody', 0.4]]],
  ['SAMPLE Almond Toro', 2, { vitola: 'Toro', ring_gauge: 52, length: 6, wrapper: 'Sample Natural' }, [['nutty', 1], ['creamy', 0.7], ['sweet', 0.4]]],
  ['SAMPLE Garden Lancero', 2, { vitola: 'Lancero', ring_gauge: 38, length: 7, wrapper: 'Sample Natural' }, [['floral', 1], ['spicy', 0.4], ['woody', 0.5]]],
  ['SAMPLE Honey Barrel Robusto', 3, { vitola: 'Robusto', ring_gauge: 50, length: 5, wrapper: 'Sample Rosado' }, [['sweet', 1], ['woody', 0.6], ['fruity', 0.5]]],
  ['SAMPLE Cocoa Box Toro', 3, { vitola: 'Toro', ring_gauge: 54, length: 6, wrapper: 'Sample Maduro' }, [['roasted', 1], ['sweet', 0.7], ['earthy', 0.4]]],
  ['SAMPLE Saddlebag Corona Gorda', 3, { vitola: 'Corona Gorda', ring_gauge: 46, length: 5.6, wrapper: 'Sample Habano' }, [['leather', 1], ['woody', 0.6], ['spicy', 0.5]]],
  ['SAMPLE Orchard Belicoso', 3, { vitola: 'Belicoso', ring_gauge: 52, length: 5.5, wrapper: 'Sample Rosado' }, [['fruity', 1], ['sweet', 0.6], ['floral', 0.4]]],
  ['SAMPLE Toasted Hazel Churchill', 3, { vitola: 'Churchill', ring_gauge: 48, length: 7, wrapper: 'Sample Natural' }, [['nutty', 0.9], ['roasted', 0.7], ['woody', 0.5]]],
  ['SAMPLE Forest Floor Robusto', 3, { vitola: 'Robusto', ring_gauge: 50, length: 5, wrapper: 'Sample Habano' }, [['earthy', 1], ['leather', 0.6], ['woody', 0.5]]],
  ['SAMPLE Cinnamon Road Toro', 4, { vitola: 'Toro', ring_gauge: 52, length: 6, wrapper: 'Sample Habano' }, [['spicy', 1], ['sweet', 0.5], ['woody', 0.6]]],
  ['SAMPLE Espresso Maduro Gordo', 4, { vitola: 'Gordo', ring_gauge: 60, length: 6, wrapper: 'Sample Maduro' }, [['roasted', 1], ['earthy', 0.6], ['sweet', 0.4]]],
  ['SAMPLE Pepper Mill Torpedo', 4, { vitola: 'Torpedo', ring_gauge: 52, length: 6.1, wrapper: 'Sample Habano' }, [['spicy', 1], ['leather', 0.6], ['earthy', 0.5]]],
  ['SAMPLE Dark Cherry Perfecto', 4, { vitola: 'Perfecto', ring_gauge: 54, length: 5, wrapper: 'Sample Maduro' }, [['fruity', 0.9], ['roasted', 0.7], ['sweet', 0.5]]],
  ['SAMPLE Molasses Double Corona', 4, { vitola: 'Double Corona', ring_gauge: 49, length: 7.6, wrapper: 'Sample Maduro' }, [['sweet', 0.9], ['roasted', 0.8], ['leather', 0.4]]],
  ['SAMPLE Charred Oak Robusto', 5, { vitola: 'Robusto', ring_gauge: 52, length: 5, wrapper: 'Sample Oscuro' }, [['woody', 1], ['spicy', 0.8], ['roasted', 0.5]]],
  ['SAMPLE Black Pepper Box-Press', 5, { vitola: 'Box-Pressed Toro', ring_gauge: 54, length: 6, wrapper: 'Sample Oscuro' }, [['spicy', 1], ['earthy', 0.7], ['leather', 0.6]]],
  ['SAMPLE Cured Hide Salomon', 5, { vitola: 'Salomon', ring_gauge: 57, length: 7.2, wrapper: 'Sample Oscuro' }, [['leather', 1], ['earthy', 0.8], ['roasted', 0.5]]],
  ['SAMPLE Midnight Soil Toro', 5, { vitola: 'Toro', ring_gauge: 56, length: 6, wrapper: 'Sample Oscuro' }, [['earthy', 1], ['roasted', 0.8], ['spicy', 0.5]]],
]

/** Deterministic UUID-shaped ids so the seed SQL and the local demo store agree. */
const sampleId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const sampleCatalog: Item[] = samples.map(([name, strength, attrs, tags], i) => ({
  id: sampleId(i + 1),
  category: CATEGORY,
  brand: `SAMPLE House ${String.fromCharCode(65 + (i % 5))}`,
  name,
  attributes: { binder: 'Sample binder', filler: 'Sample filler blend', origin: 'Sample origin', ...attrs },
  strength,
  status: 'curated',
  tags: tags.map(([family, weight]) => ({ family, weight })),
}))
