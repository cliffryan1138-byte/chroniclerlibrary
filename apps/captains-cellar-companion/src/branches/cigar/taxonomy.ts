import type { Taxonomy } from '../../core'

// Ten families; every descriptor belongs to exactly one. Ids are stable keys stored in log_tags.
const families: [id: string, label: string, blurb: string, descriptors: string[]][] = [
  ['woody', 'Woody', 'Wood notes: from bright cedar to heavy charred oak.', ['cedar', 'oak', 'charred oak', 'sawdust']],
  ['earthy', 'Earthy', 'Ground and forest: damp soil, mushroom, dry hay.', ['soil', 'forest floor', 'mushroom', 'hay']],
  ['spicy', 'Spicy', 'Heat and baking spice, often felt on the nose or tongue tip.', ['black pepper', 'white pepper', 'cinnamon', 'clove', 'nutmeg']],
  ['sweet', 'Sweet', 'Sugary, rounded sweetness on the palate.', ['honey', 'caramel', 'molasses', 'vanilla', 'brown sugar']],
  ['creamy', 'Creamy', 'Soft, rich, dairy-like smoothness.', ['butter', 'cream', 'custard', 'toasted milk']],
  ['roasted', 'Roasted', 'Toasted and roasted: coffee, cocoa, bread crust.', ['espresso', 'dark chocolate', 'cocoa', 'toast', 'malt']],
  ['nutty', 'Nutty', 'Nut-like richness, from sweet almond to oily walnut.', ['almond', 'walnut', 'peanut', 'hazelnut']],
  ['leather', 'Leather', 'Leather and cured tobacco leaf, the barnyard-to-saddle range.', ['leather', 'tobacco leaf', 'saddle', 'cured hide']],
  ['fruity', 'Fruity', 'Fruit notes, mostly dried or dark, sometimes a citrus zip.', ['dried fruit', 'cherry', 'citrus', 'raisin', 'stone fruit']],
  ['floral', 'Floral', 'Light, green, aromatic notes: flowers, herbs, grass, tea.', ['floral', 'herbal', 'grassy', 'tea']],
]

const slug = (s: string) => s.replace(/\s+/g, '-')

export const cigarTaxonomy: Taxonomy = {
  families: families.map(([id, label, blurb]) => ({ id, label, blurb })),
  // "leather" and "floral" are both a family and a descriptor name; descriptor ids get a d: prefix to stay unique.
  descriptors: families.flatMap(([family, , , ds]) =>
    ds.map((label) => ({ id: `d:${slug(label)}`, label: label[0].toUpperCase() + label.slice(1), family })),
  ),
}
