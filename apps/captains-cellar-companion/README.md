# Captain's Cellar Companion

A tasting journal that learns your palate and suggests what to try next. Phase 1: cigars only.
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
2. Apply the schema: `supabase db push`, or paste `supabase/migrations/20261021000000_init.sql` into the SQL editor.
3. Load the sample catalog: run `supabase/seed.sql` (regenerate it with `npm run seed:sql` after editing the branch catalog).
4. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the legacy `VITE_SUPABASE_ANON_KEY` also works).

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
  branches/cigar/          taxonomy, SAMPLE catalog, strength labels, glossary, cigar-only form fields
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

1. Create `src/branches/spirits/` with:
   - `taxonomy.ts`: a `Taxonomy` (families and descriptors; every descriptor in exactly one family; ids unique).
   - `rules.ts`: a `BranchSpec` plus any display rules (strength labels, glossary, detail scores).
   - `catalog.ts`: sample or real `Item`s with `category: 'spirits'`.
   - `ui/`: a `DetailFields` and an `AttributeSummary` component.
2. Register it in `src/app/branch.ts` and list it in the app config's `branches`.
3. Add a taxonomy-validity test (see `tests/architecture.test.ts`), and add the branch's distinctive words to the banned list there.
4. No schema change needed: `items.category`, `items.attributes`, and `logs.details` carry the branch-specific bits.

## Data model

`users`, `items`, `item_tags`, `logs`, `log_tags`, `taste_profiles` (derived cache), `inventory` and `pairings` (tables only, no UI or logic yet).
RLS: users see only their own row, logs, tags, profile, inventory, and pairings. Curated items are readable by everyone.
A user-submitted item is pending and visible only to whoever submitted it. A trigger rejects any user under 21 at the database level.

## Catalog

Every item in `src/branches/cigar/catalog.ts` is a clearly labelled **SAMPLE** placeholder, not a real product. Replace it with the real catalog, then regenerate `supabase/seed.sql`.
