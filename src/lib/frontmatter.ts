// -----------------------------------------------------------------------------
// Frontmatter build + parse.
//
// The sites validate frontmatter with Zod at build time, so anything this file
// emits has to be valid or the site's Vercel build fails. The two rules that
// matter most:
//
//   1. Optional fields must be OMITTED when empty, never emitted as "". Several
//      schemas use z.string().url() — an empty string fails that, and the build
//      breaks on a field the author left blank on purpose.
//   2. Dates go out as plain YYYY-MM-DD strings for z.coerce.date().
// -----------------------------------------------------------------------------

import matter from 'gray-matter';
import yaml from 'js-yaml';
import type { CollectionDef, FieldDef } from './sites';

export type FieldValue = string | number | boolean | string[] | undefined | null;
export type EntryData = Record<string, FieldValue>;

/** Normalize one form value into what the site's Zod schema expects. */
function coerce(field: FieldDef, raw: FieldValue): FieldValue {
  if (raw === undefined || raw === null) return undefined;

  switch (field.type) {
    case 'list': {
      const arr = Array.isArray(raw)
        ? raw
        : String(raw)
            .split(',')
            .map((s) => s.trim());
      const cleaned = arr.map((s) => String(s).trim()).filter(Boolean);
      // A list with a default of [] is safe to emit empty; the schema allows it.
      return cleaned;
    }

    case 'boolean':
      return raw === true || raw === 'true';

    case 'number': {
      if (raw === '') return undefined;
      const n = Number(raw);
      if (Number.isNaN(n)) return undefined;
      return field.integer ? Math.trunc(n) : n;
    }

    case 'date': {
      if (!raw) return undefined;
      const s = String(raw);
      // Already YYYY-MM-DD, keep as-is rather than round-tripping through Date
      // and risking a timezone shift by a day.
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return undefined;
      return d.toISOString().slice(0, 10);
    }

    case 'string':
    case 'text':
    case 'url':
    case 'image':
    case 'select':
    case 'markdown': {
      const s = String(raw).trim();
      return s === '' ? undefined : s;
    }

    default:
      return raw;
  }
}

/**
 * Strip a full YouTube URL down to its bare video ID. Authors paste the whole
 * URL constantly, and the sites embed `youtube.com/embed/{youtubeId}` directly,
 * so an un-trimmed URL produces a silently broken player.
 */
export function normalizeYouTubeId(input: string): string {
  const s = input.trim();
  if (!s) return s;
  if (!/[/?.]/.test(s)) return s; // already a bare ID

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return s;
}

/** Same idea for a pasted Spotify episode URL. */
export function normalizeSpotifyEpisodeId(input: string): string {
  const s = input.trim();
  if (!s) return s;
  const m = s.match(/episode\/([A-Za-z0-9]+)/);
  return m ? m[1] : s;
}

export interface BuildResult {
  content: string;
  errors: string[];
}

/** Build a complete markdown file (frontmatter + body) for one entry. */
export function buildMarkdown(collection: CollectionDef, data: EntryData): BuildResult {
  const errors: string[] = [];
  const fm: Record<string, unknown> = {};
  let body = '';

  for (const field of collection.fields) {
    let raw = data[field.name];

    if (field.name === 'youtubeId' && typeof raw === 'string') {
      raw = normalizeYouTubeId(raw);
    }
    if (field.name === 'spotifyEpisodeId' && typeof raw === 'string') {
      raw = normalizeSpotifyEpisodeId(raw);
    }

    const value = coerce(field, raw);

    if (field.type === 'markdown') {
      body = typeof value === 'string' ? value : '';
      if (field.required && !body.trim()) {
        errors.push(`${field.label} is required.`);
      }
      continue;
    }

    const isEmpty =
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0 && field.default === undefined);

    if (isEmpty) {
      if (field.required) {
        errors.push(`${field.label} is required.`);
        continue;
      }
      // Emit an explicit default (booleans, empty lists) but never an empty
      // string — see the header note about z.string().url().
      if (field.default !== undefined) {
        fm[field.name] = field.default;
      }
      continue;
    }

    if (field.type === 'select' && field.options && !field.options.includes(String(value))) {
      errors.push(`${field.label} must be one of: ${field.options.join(', ')}.`);
      continue;
    }

    if (field.type === 'number' && typeof value === 'number') {
      if (field.min !== undefined && value < field.min) {
        errors.push(`${field.label} must be at least ${field.min}.`);
        continue;
      }
      if (field.max !== undefined && value > field.max) {
        errors.push(`${field.label} must be at most ${field.max}.`);
        continue;
      }
    }

    fm[field.name] = value;
  }

  const frontmatter = yaml.dump(fm, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  const content = `---\n${frontmatter}---\n\n${body.trim()}\n`;
  return { content, errors };
}

/** Parse a markdown file back into form data. */
export function parseMarkdown(collection: CollectionDef, raw: string): EntryData {
  const { data, content } = matter(raw);
  const out: EntryData = {};

  for (const field of collection.fields) {
    if (field.type === 'markdown') {
      out[field.name] = content.trim();
      continue;
    }
    const value = data[field.name];
    if (value === undefined || value === null) {
      out[field.name] = field.type === 'list' ? [] : field.type === 'boolean' ? false : '';
      continue;
    }
    if (field.type === 'date') {
      out[field.name] =
        value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
      continue;
    }
    if (field.type === 'list') {
      out[field.name] = Array.isArray(value) ? value.map(String) : [String(value)];
      continue;
    }
    if (field.type === 'boolean') {
      out[field.name] = value === true || value === 'true';
      continue;
    }
    if (field.type === 'number') {
      out[field.name] = typeof value === 'number' ? value : Number(value);
      continue;
    }
    out[field.name] = String(value);
  }

  return out;
}

/** Pull just the fields the browse view needs, without a full schema walk. */
export function peekEntry(raw: string): {
  title: string;
  description: string;
  pubDate: string;
  draft: boolean;
} {
  try {
    const { data } = matter(raw);
    const pub = data.pubDate;
    return {
      title: typeof data.title === 'string' ? data.title : '(untitled)',
      description: typeof data.description === 'string' ? data.description : '',
      pubDate:
        pub instanceof Date
          ? pub.toISOString().slice(0, 10)
          : pub
            ? String(pub).slice(0, 10)
            : '',
      draft: data.draft === true,
    };
  } catch {
    return { title: '(unreadable)', description: '', pubDate: '', draft: false };
  }
}
