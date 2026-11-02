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
A curator reviews the queue in **Settings → Open the curator queue**: approve it (fixing the maker, name or strength),
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

`users`, `items`, `item_tags`, `logs`, `log_tags`, `taste_profiles` (derived cache), `inventory` and `pairings` (tables only, no UI or logic yet).
RLS: users see only their own row, logs, tags, profile, inventory, and pairings. Curated items are readable by everyone.
A user-submitted item is pending and visible only to whoever submitted it. A trigger rejects any user under 21 at the database level.

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


The starter items in `src/branches/cigar/catalog.ts` are clearly labelled **SAMPLE** placeholders, not real products. Once a real catalog is loaded they can be removed with `delete from items where name like 'SAMPLE %';`.
