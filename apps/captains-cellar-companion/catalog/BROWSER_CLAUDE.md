# Catalog from a maker's website, with Claude in Chrome

Use this prompt for makers whose site is a catalog with no Shopify store. `npm run catalog:makers` lists them
under "Not pulled". Open the maker's site in Chrome, start Claude in Chrome, and paste the prompt below with the
first line filled in. Save what it gives you as:

- cigars: `catalog/makers/<maker>.json`
- pipe tobacco: `catalog/pipe-tobacco/<maker>.json`

Then run `npm run catalog:sql -- <that file> > out.sql`. That step checks the file and names anything wrong
before you paste the SQL into Supabase.

---

```text
Maker: <maker name>   Category: <cigar or pipe_tobacco>   Site: <the address you're on>

Go through this maker's own product or blend pages on this site, one product line at a time, and build a
catalog file of FACTS ONLY. Rules:
- Only what a page states. If a page doesn't state a field, leave it out. Never guess or fill from memory.
- No marketing copy, no prices, no links to buy, no reviews. Product names and facts only.
- Stay on this maker's own site. Don't log in, buy, sign up, or fill in any forms. If an age check asks
  for a birth date, stop and ask me.
- Under "review", list anything a reviewer should check (e.g. "no strength stated", "size from a photo
  caption"), and add the page path in "sources" as "<domain><path>".

Return only JSON, in exactly this shape:
{
  "maker": { "name": "<maker>", "website": "<https://site>", "country": null },
  "category": "<cigar or pipe_tobacco>",
  "entries": [
    {
      "brand": "<maker>",
      "name": "<line and size for cigars, e.g. 'Example Maduro Robusto'; blend name for pipe tobacco>",
      "attributes": { ... },
      "strength": <1-5 or null>,
      "tags": [ { "family": "<family id>", "weight": 0.6 } ],
      "review": [],
      "sources": ["<domain/path>"],
      "reference_images": []
    }
  ]
}

For CIGARS, attributes may have: vitola, length (inches, number), ring_gauge (number), wrapper, binder,
filler, origin. Make one entry per size. For a shape with two rings (e.g. "42/49"), put the larger in
ring_gauge and both, as written, in ring_gauge_range: { "ring_gauge": 49, "ring_gauge_range": "42/49" }. Strength: mild 1, mild-medium 2, medium 3, medium-full 4, full 5.
Tag families (only these ids): woody, earthy, spicy, sweet, creamy, roasted, nutty, leather, fruity, floral.

For PIPE TOBACCO, attributes may have: blend_style (one of Virginia, VaPer, VaBur, Burley, English, Balkan,
Scottish, Navy, Oriental, Aromatic, Other: only if the page says it, otherwise leave it out and add
"no style stated" to review), components (list, e.g. ["Virginia", "Perique"]), cut (one of Ribbon, Flake,
Broken flake, Ready rubbed, Plug, Coin, Crumble cake, Rope, Cube cut, Shag), tin_size, origin.
One entry per blend, all tin sizes together. Nicotine strength: mild 2, medium 3, full 4.
Tag families (only these ids): sweet, fruity, grassy, smoky, earthy, woody, spicy, nutty, roasted, floral, creamy.
Use 0.6 for a note the page names directly, 0.5 for a general one ("sweet", "spicy").
```
