import type { Taxonomy } from '../../core'

// Flavor families for pipe tobacco. Some carry over from cigars; smoky (Latakia) and grassy
// (young Virginias) are the pipe-specific ones. Every descriptor belongs to exactly one family.
const families: [id: string, label: string, blurb: string, descriptors: string[]][] = [
  ['sweet', 'Sweet', 'Natural sugar from Virginias, or added toppings: honey, toffee, vanilla.', ['honey', 'brown sugar', 'molasses', 'toffee', 'vanilla']],
  ['fruity', 'Fruity', 'Dark and dried fruit, plus the fermented tang Perique brings.', ['fig', 'raisin', 'plum', 'citrus', 'fermented tang']],
  ['grassy', 'Grassy', 'Bright, green notes, mostly from young or lightly aged Virginias.', ['hay', 'fresh grass', 'green tea', 'herbal']],
  ['smoky', 'Smoky', 'The campfire side of a blend, almost always from Latakia.', ['campfire', 'peat smoke', 'incense', 'smoked wood']],
  ['earthy', 'Earthy', 'Soil, mushroom and musty cellar notes.', ['earth', 'forest floor', 'mushroom', 'musty']],
  ['woody', 'Woody', 'Wood notes, from cedar to resinous, often from Orientals.', ['cedar', 'oak', 'sandalwood', 'resin']],
  ['spicy', 'Spicy', 'Pepper and baking spice; Perique and Orientals add most of it.', ['black pepper', 'clove', 'cinnamon', 'nutmeg']],
  ['nutty', 'Nutty', 'Nut-like richness, common in Burley.', ['almond', 'walnut', 'peanut', 'chestnut']],
  ['roasted', 'Roasted', 'Toasted and roasted notes: bread crust, cocoa, coffee.', ['toast', 'bread', 'cocoa', 'coffee']],
  ['floral', 'Floral', 'Perfumed, flowery notes, often from Orientals or a floral topping.', ['floral', 'lavender', 'rose', 'potpourri']],
  ['creamy', 'Creamy', 'Soft, rich smoothness, often from Cavendish.', ['cream', 'butter', 'custard']],
]

const slug = (s: string) => s.replace(/\s+/g, '-')

export const pipeTaxonomy: Taxonomy = {
  families: families.map(([id, label, blurb]) => ({ id, label, blurb })),
  // "floral" is both a family and a descriptor name; descriptor ids get a d: prefix to stay unique.
  descriptors: families.flatMap(([family, , , ds]) =>
    ds.map((label) => ({ id: `d:${slug(label)}`, label: label[0].toUpperCase() + label.slice(1), family })),
  ),
}
