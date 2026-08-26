// Verifies buildMarkdown emits frontmatter that satisfies each site's Zod schema.
// Run with: node --experimental-strip-types tests/frontmatter.test.mjs

import { SITES } from '../src/lib/sites.ts';
import { buildMarkdown, normalizeYouTubeId, normalizeSpotifyEpisodeId } from '../src/lib/frontmatter.ts';
import { entryFilename, slugify } from '../src/lib/slug.ts';
import matter from 'gray-matter';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ' — ' + detail : ''}`);
  }
}

/** A filled-in value for every field type, so we exercise the happy path. */
function sampleValue(f) {
  switch (f.type) {
    case 'string': return f.name === 'duration' ? '48:12' : 'Sample ' + f.name;
    case 'text': return 'A sample description sentence.';
    case 'markdown': return '# Heading\n\nBody copy.';
    case 'date': return '2026-08-26';
    case 'number': return f.name === 'rating' ? 4.5 : f.name === 'year' ? -216 : 3;
    case 'select': return f.options[0];
    case 'list': return ['alpha', 'beta'];
    case 'boolean': return false;
    case 'url': return 'https://example.com/thing.mp3';
    case 'image': return '/uploads/2026/photo.jpg';
    default: return 'x';
  }
}

for (const site of SITES) {
  for (const col of site.collections) {
    // --- 1. Fully populated entry -------------------------------------------
    const full = {};
    for (const f of col.fields) full[f.name] = sampleValue(f);
    const built = buildMarkdown(col, full);
    check(`${site.key}/${col.key} full builds`, built.errors.length === 0, built.errors.join(' '));

    let parsed;
    try {
      parsed = matter(built.content);
    } catch (e) {
      check(`${site.key}/${col.key} full parses`, false, e.message);
      continue;
    }
    check(`${site.key}/${col.key} full parses`, true);

    for (const f of col.fields) {
      if (f.type === 'markdown') continue;
      check(
        `${site.key}/${col.key} has ${f.name}`,
        parsed.data[f.name] !== undefined,
        'missing from frontmatter',
      );
    }

    // --- 2. Minimal entry: only required fields ------------------------------
    const min = {};
    for (const f of col.fields) {
      if (f.required) min[f.name] = sampleValue(f);
    }
    const minBuilt = buildMarkdown(col, min);
    check(
      `${site.key}/${col.key} minimal builds`,
      minBuilt.errors.length === 0,
      minBuilt.errors.join(' '),
    );

    const minParsed = matter(minBuilt.content);

    // The critical rule: optional url/string fields must be ABSENT, never "".
    // z.string().url() rejects "" and would break the site build.
    for (const f of col.fields) {
      if (f.required || f.type === 'markdown') continue;
      const v = minParsed.data[f.name];
      if (v === undefined) continue; // omitted, correct
      check(
        `${site.key}/${col.key} ${f.name} not empty string`,
        v !== '',
        'emitted as empty string; z.string().url() would reject this',
      );
    }

    // --- 3. Missing required fields are caught -------------------------------
    const empty = buildMarkdown(col, {});
    const requiredCount = col.fields.filter((f) => f.required).length;
    check(
      `${site.key}/${col.key} rejects empty`,
      empty.errors.length >= requiredCount && requiredCount > 0,
      `got ${empty.errors.length} errors for ${requiredCount} required fields`,
    );

    // --- 4. Bad select value rejected ----------------------------------------
    const sel = col.fields.find((f) => f.type === 'select');
    if (sel) {
      const bad = { ...full, [sel.name]: 'not-a-real-option' };
      const badBuilt = buildMarkdown(col, bad);
      check(
        `${site.key}/${col.key} rejects bad ${sel.name}`,
        badBuilt.errors.some((e) => e.includes(sel.label)),
      );
    }

    // --- 5. Numeric bounds ---------------------------------------------------
    const rating = col.fields.find((f) => f.name === 'rating');
    if (rating) {
      const over = buildMarkdown(col, { ...full, rating: 9 });
      check(`${site.key}/${col.key} rejects rating 9`, over.errors.length > 0);
    }
  }
}

// --- YouTube / Spotify ID normalization ---------------------------------------
const ytCases = [
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', 'dQw4w9WgXcQ'],
  ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
];
for (const [input, expected] of ytCases) {
  check(`youtube "${input}"`, normalizeYouTubeId(input) === expected, `got ${normalizeYouTubeId(input)}`);
}
check(
  'spotify url',
  normalizeSpotifyEpisodeId('https://open.spotify.com/episode/5Xt9tuQ0Q0') === '5Xt9tuQ0Q0',
);

// --- Slug + filename -----------------------------------------------------------
check('slugify accents', slugify('Café Brûlé') === 'cafe-brule', slugify('Café Brûlé'));
check('slugify punctuation', slugify("Grant's War: Part III!") === 'grants-war-part-iii', slugify("Grant's War: Part III!"));
check(
  'blog filename date-prefixed',
  entryFilename('blog', 'Hello World', '2026-08-26') === '2026-08-26-hello-world.md',
  entryFilename('blog', 'Hello World', '2026-08-26'),
);
check(
  'video filename not date-prefixed',
  entryFilename('videos', 'Hello World', '2026-08-26') === 'hello-world.md',
  entryFilename('videos', 'Hello World', '2026-08-26'),
);

// --- Date handling: no timezone drift ------------------------------------------
{
  const col = SITES[0].collections[0];
  const d = {};
  for (const f of col.fields) if (f.required) d[f.name] = sampleValue(f);
  d.pubDate = '2026-01-01';
  const out = matter(buildMarkdown(col, d).content);
  const got = out.data.pubDate instanceof Date
    ? out.data.pubDate.toISOString().slice(0, 10)
    : String(out.data.pubDate).slice(0, 10);
  check('date does not drift', got === '2026-01-01', `got ${got}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
