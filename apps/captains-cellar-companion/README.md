# Captain's Cellar Companion

A tasting journal that learns your palate and suggests what to try next. Branches today: **cigars** and **pipe tobacco**, each with its own palate, quiz, suggestions and label scanner. Spirits, beer and wine come next as further branches (cigar-and-spirit pairing is planned on top).
Mobile-first PWA (React + TypeScript + Vite + Tailwind) on Supabase, built to be wrapped for the app stores later.

For adults 21+. It does not promote tobacco use. There are no sales, purchase links, or affiliate links, and logs are private.

## Setup

```bash
cd apps/captains-cellar-companion
npm install
npm run dev            # http://localhost:5174
```

With no environment variables it runs in **demo mode**: one local user, everything stored in this browser's localStorage, using the SAMPLE catalog.

### Using Supabase

1. Create a **new** Supabase project for this app (don't reuse another app's).
2. Apply the schema: `supabase db push`, or paste each file in `supabase/migrations/` into the SQL editor, oldest first.
3. Load the sample catalog: run `supabase/seed.sql` (regenerate it with `npm run seed:sql` after editing the branch catalog).
4. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the legacy `VITE_SUPABASE_ANON_KEY` also works).

### Band scanning (optional)

`api/scan-band.ts` is a Vercel Function behind the "Scan the band" button. It checks the caller's Supabase
session, then forwards the photo to Chronicler Library's SPARK install (`POST /v1/extract`, module `cellar`,
kind `cigar_band`), which reads the band with its vision model and returns the maker and line. The app never
holds a model key: SPARK owns the key, the per-user and daily spending caps, and the audit log.
Setting up that install is in `wastegate-spark-core/docs/CHRONICLER_INSTALL.md`.

Vercel variables (Production and Preview): `SPARK_URL` (the install's public address) and `SPARK_CORE_TOKEN`
(the same value as the install's). Demo mode has no session, so it shows a "needs an account" note instead.
Photos are resized in the browser before upload and are not stored.

### Checks

```bash
npm test               # engine, architecture fence, age gate
npm run lint           # includes the core/ import fence
npm run typecheck
npm run build && npx vite preview --port 4173 &
npm run screenshots -- http://localhost:4173   # phone-width walkthrough, light + dark, into screenshots/
```

## Home-screen app (PWA)

The app installs to a phone's home screen and opens full screen with its own icon. No app store is involved.

- **Install file and icons:** `public/manifest.webmanifest` holds the install details. It points at PNG icons at
  192 and 512, a maskable 512 for Android, and an `apple-touch-icon` for iPhone. `npm run icons` redraws all of
  them from the artwork in `scripts/make-icons.ts`.
- **Offline cache:** `public/sw.js` keeps the app shell, so the app opens with no signal. Pages load from the
  network first, built files from the cache first. `/api` calls are never cached. Bump `CACHE` in `sw.js` when its
  rules change.
- **Install card:** Settings has an "Add to your Home Screen" card. On Android and desktop Chrome it shows an
  Install button. On iPhone it gives the Safari Share steps. It hides once the app is installed.
- **Checked:** the phone walkthrough loads the install file and every icon, then reopens the app offline.

## The three-layer rule

```
src/
  core/                    SPARK engine: profile builder, recommender, pairing scorer (stub)
  branches/cigar/          taxonomy, SAMPLE catalog, strength labels, glossary, cigar-only form fields, catalog importer
  branches/pipe/           pipe tobacco: taxonomy (incl. smoky/grassy), blend styles, cuts, bowl stages, pipe scores
  config/captains-cellar/  app name, palette, fonts, voice and compliance copy
  app/                     screens, state, data layer: wires one config + one branch to the engine
```

- **core/** knows about generic Items, Logs, Tags, Families, and Taxonomies. It holds no category words, no tag lists, no tables, no React, and no Supabase.
  It may import only from itself.
- **branches/<name>/** supplies the vocabulary (a `Taxonomy`), a `BranchSpec` (category, strength labels, cold-start size), catalog data, and any category-specific UI fields.
- **config/<app>/** holds everything brand-specific. A second app instance swaps this folder, not the engine.

Two fences enforce it and fail if `core/` imports from `branches/`, `config/`, or `app/`, or mentions category vocabulary:
`no-restricted-imports` in `eslint.config.js`, and `tests/architecture.test.ts` (which runs with `npm test`, so it holds even when nobody lints).

### How the engine works

- **Profile.** Each log's tags are rolled up to one intensity per family (the max within that log). Each family then gets `ratingWeight × intensity/2`, where `ratingWeight = (rating − 3) / 2`. That means a 5 counts +1, a 3 counts 0, and a 1 counts −1.
  Values are averaged over logs and clamped to −1..1. Simple-mode family taps and detailed-mode descriptors therefore produce the same family vector.
  Strength preference is a rating-weighted average of the strengths of the items you enjoyed.
- **Cold start.** The onboarding quiz becomes a seed profile (liked = +1, disliked = −1). It blends linearly into the learned profile and drops out entirely at `coldStartLogs` (10 for cigars).
- **Recommendations.** These are content-based. The score is `0.75 × flavor + 0.25 × strength fit`.
  Flavor is the cosine similarity between your family vector and the item's vector. The item's vector comes from curated `item_tags`, blended 60/40 with community log tags once at least three different users have logged the item.
  Logged items and pending user submissions are never suggested. Each suggestion carries a one-line reason built from the overlapping families.
- `taste_profiles` is a cache. It's rebuilt after every log, and logs + log_tags remain the source of truth.

## Adding a new branch (e.g. spirits)

`branches/pipe/` is the worked example: it was added without touching `core/`.

1. Create `src/branches/spirits/` with:
   - `taxonomy.ts`: a `Taxonomy` (families and descriptors; every descriptor in exactly one family; ids unique).
   - `rules.ts`: a `BranchSpec` plus any display rules (strength labels, glossary, detail scores).
   - `catalog.ts`: sample or real `Item`s with `category: 'spirits'`.
   - `ui/`: a `DetailFields` and an `AttributeSummary` component.
2. Register it in `src/app/branch.ts` (display name, stages, detail scores, labels, scan kind) and list it in the app config's `branches`. The category switch, a quiz and a palate per branch come for free.
   Label scanning needs a matching `kind` in SPARK's extractor (`cigar_band` and `pipe_tobacco_tin` exist).
3. Add a taxonomy-validity test (see `tests/architecture.test.ts`), and add the branch's distinctive words to the banned list there.
4. No schema change needed: `items.category`, `items.attributes`, and `logs.details` carry the branch-specific bits.

## Curation

Anything a user types in that the catalog doesn't have is saved as pending: visible only to them, never recommended.
A curator gets a **Curate** tab, with a badge counting what is waiting, and reviews the queue there: approve it (fixing the maker, name or strength),
merge it into the right catalog entry (typos and duplicates; every log moves over), or reject it (it leaves the queue
and the catalog but stays with the person who added it). Approving something that already exists is refused with
"merge it instead". Curators see how often an entry was logged and by how many people, never who.

Curators are granted in the Supabase SQL editor only; the app can't set the flag:

```sql
update public.users set is_curator = true where id in (select id from auth.users where email = 'person@example.com');
```

All curation goes through checked database functions (`curator_queue`, `approve_item`, `merge_item`, `reject_item` and
the maker equivalents) in `supabase/migrations/20261103000000_curation.sql`.

## Data model

`users`, `items`, `item_tags`, `logs`, `log_tags`, `taste_profiles` (derived cache), `makers`, `collection_items`, `inventory` and `pairings` (tables only, no UI or logic yet).
RLS: users see only their own row, logs, tags, profile, inventory, and pairings. Curated items are readable by everyone.
A user-submitted item is pending and visible only to whoever submitted it. A trigger rejects any user under 21 at the database level.

## Collections (pipes)

A branch can declare a `collection` in `src/app/branch.ts`: things people own and reuse, rather than items they smoke up.
Pipe tobacco has one: **Your pipes**, shown on the Palate tab.

- Pipes are grouped by shape. Each shape and material comes with a short description (`PIPE_SHAPES` and `PIPE_MATERIALS` in `src/branches/pipe/rules.ts`).
- A pipe can be dedicated to a style, or to a blend in the catalog.
- When you have pipes, the log form asks **Smoked in**. The answer is saved as `details.collection_item_id`, and each pipe shows its bowl count.
- Cigars have no collection (`collection: null`).

The data lives in `collection_items`, migration `20261104000000_collection.sql`. RLS limits it to the owner.
When a curator merges a blend, any pipes dedicated to it follow the merge.

## Catalog

The catalog is organized by **maker** (the `makers` table), not by the store a listing came from. Every item
points at its maker; a maker can make cigars and pipe tobacco alike. Discover has "Browse by maker" for each category.

Real catalogs load in three steps, run from a machine that can reach the site:

```bash
npm run catalog:shopify -- https://maker-site.com --maker "Maker"   # a maker's own store
npm run catalog:shopify -- https://tobacconist.example              # a multi-brand store: each product's own maker
# -> catalog/makers/<maker>.json, one file per maker. Another store carrying the same maker adds to that file;
#    what's already in it (your review) wins. "review" lists what the site didn't say.
npm run catalog:sql -- catalog/makers/<maker>.json > out.sql        # paste into the Supabase SQL editor
```

The importer reads a Shopify store's public product list and keeps facts only: maker, name, vitola, size, wrapper,
binder, filler, origin, a stated strength word, and flavor notes the description names. It keeps no marketing copy,
prices or links, and leaves anything the site doesn't state blank. Products sold in several sizes become one cigar per
size. Re-running the SQL updates the same cigars rather than duplicating them (ids come from maker + name).
`reference_images` in the JSON are the site's own photos, listed for the reviewer only; they are not loaded.

### Many makers at once

`catalog/maker-sites.json` lists makers' own websites. Each entry has a maker, a site and a category.
`npm run catalog:makers` goes down that list one site at a time. Each Shopify site it can read becomes review
files, exactly like `catalog:shopify`. Products a maker's store sells under another brand's name go to that
brand's file. The rest are listed at the end as catalog-only or unreachable, and nothing is loaded into the
database. The list hasn't been checked against the live sites, so edit it as you learn which addresses work.

For catalog-only sites, `catalog/BROWSER_CLAUDE.md` holds a prompt for Claude in Chrome. It reads the maker's
pages and returns the same file format, with facts only and no guessing. `catalog:sql` checks every file before
writing SQL: known flavor families, strength 1-5, names present. A hand-made file with a mistake is refused,
with the reason named.

### Cigar sizes

Cigar cards show length and ring separately, like `Toro · 6⅛" · 52 ring · Habano wrapper`. A two-ring shape
such as a figurado keeps both rings in `ring_gauge_range` (`"42/49"`), with the widest in `ring_gauge`.
Discover has **Browse by ring**: thin (under 44), medium (44 to 51) and thick (52 and up), grouped by the widest
ring. When someone logs a cigar the catalog doesn't know, the log form offers optional Length and Ring boxes.
The curator sees those under "What they told us". The size rules live in `src/branches/cigar/rules.ts`.

### An item's own page

Tapping any cigar or blend opens its card:
- **Header:** the maker and the line. The line is read from the name, before the vitola, so "Hemingway Short Story" belongs to "Hemingway".
- **The facts:** every stored fact, plus the source site as plain text, not a link.
- **Your own history** with it.
- **Members' logs:** how many members logged it, the share who would reach for it again, the average rating, and which flavor families the fans (4–5 stars) and the low raters (1–2 stars) noted most. These are totals only, from `item_card_stats` (migration `20261106000000_item_card_stats.sql`). The app never shows anyone's notes or individual ratings, and the community view stays hidden until 3 different people have logged the item.
- **Other sizes in the same line.**
- **Log this**, which opens the log form already filled in.

Browse by maker groups each maker's items under their lines. There are no buy or store links, by design.

### Pipe tobacco

```bash
npm run catalog:shopify -- https://tobacconist.example --category pipe_tobacco
# -> catalog/pipe-tobacco/<maker>.json
npm run catalog:sql -- catalog/pipe-tobacco/<maker>.json > out.sql
```

This is the same flow with a blend reader (`src/branches/pipe/catalog-import.ts`). It keeps facts only:

- maker and blend name, with tin sizes and words like "tin", "bulk" and "pipe tobacco" moved out of the name
- style, the leaf (Virginia, Burley, Latakia, Perique, Oriental…), cut, tin sizes and origin
- a stated nicotine strength (Mild 2, Medium 3, Full 4) and flavor notes the description names

The reader skips pipes, gear (cleaners, tampers, pouches, jars), cigars and samplers. A blend sold as a tin and in
bulk comes out as one blend, with all its tin sizes listed.

The reader only fills a style when the source states it, as a "Style:" line, the product type or a tag. When none is
given, it suggests one from the leaf (Latakia → English, Virginia + Perique → VaPer, a topping → Aromatic) and marks
the entry "style guessed: check" in `review`. Leaf read from the prose instead of a "Tobaccos:" line is marked too.
Mixtures with no clear lead get no style, so you pick one.

The shared plumbing (Shopify product shape, maker files, review-first merging) lives in `src/core/catalog-import.ts`.
Each branch plugs in its own fields and vocabulary.


The starter items in `src/branches/cigar/catalog.ts` and `src/branches/pipe/catalog.ts` are clearly labelled **SAMPLE** placeholders, not real products. Once a real catalog is loaded for a category, remove its samples. Logs block a plain delete, so remove the logs on them first (set the category to `'cigar'` or `'pipe_tobacco'`):

```sql
begin;
delete from public.logs where item_id in (select id from public.items where name like 'SAMPLE %' and category = 'pipe_tobacco');
delete from public.inventory where item_id in (select id from public.items where name like 'SAMPLE %' and category = 'pipe_tobacco');
delete from public.pairings where item_id in (select id from public.items where name like 'SAMPLE %' and category = 'pipe_tobacco')
  or paired_item_id in (select id from public.items where name like 'SAMPLE %' and category = 'pipe_tobacco');
delete from public.items where name like 'SAMPLE %' and category = 'pipe_tobacco';
delete from public.makers m where m.name like 'SAMPLE %' and not exists (select 1 from public.items i where i.maker_id = m.id);
commit;
```
