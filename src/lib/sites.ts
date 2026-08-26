// -----------------------------------------------------------------------------
// The Chronicler Library — site + collection registry.
//
// This file is the single source of truth the dashboard uses to build forms and
// to write valid frontmatter. Every field below mirrors the Zod schema in that
// site's `src/content.config.ts`. If a site's schema changes, change it here too
// or the dashboard will commit posts that fail the site's build.
// -----------------------------------------------------------------------------

export type FieldType =
  | 'string'
  | 'text'
  | 'markdown'
  | 'date'
  | 'number'
  | 'select'
  | 'list'
  | 'boolean'
  | 'url'
  | 'image';

export interface FieldDef {
  /** Frontmatter key. The body field uses the reserved name `body`. */
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Options for `select`. */
  options?: string[];
  /** Default applied to a new entry. */
  default?: unknown;
  help?: string;
  /** Integer-only, for `number`. */
  integer?: boolean;
  min?: number;
  max?: number;
}

export interface CollectionDef {
  /** Collection key, matches the Astro collection name. */
  key: string;
  label: string;
  /** Singular noun, used in UI copy. */
  singular: string;
  /** Repo-relative folder holding the markdown. */
  folder: string;
  /** Shown in the composer's content-type picker. */
  icon: string;
  fields: FieldDef[];
}

export interface SiteDef {
  key: string;
  name: string;
  shortName: string;
  domain: string;
  repo: string;
  branch: string;
  /** Tailwind accent classes for the site's badge. */
  accent: string;
  collections: CollectionDef[];
}

// -- Shared field groups ------------------------------------------------------

const TAGS: FieldDef = {
  name: 'tags',
  label: 'Tags',
  type: 'list',
  default: [],
  help: 'Lowercase, hyphenated. Each tag gets its own /tags page.',
};

const DRAFT: FieldDef = {
  name: 'draft',
  label: 'Draft',
  type: 'boolean',
  default: false,
  help: 'Drafts are committed to the repo but never rendered on the live site.',
};

const HERO: FieldDef[] = [
  {
    name: 'heroUrl',
    label: 'Hero image',
    type: 'image',
    help: 'Upload an image or paste a URL.',
  },
  { name: 'heroAlt', label: 'Hero alt text', type: 'string' },
];

const BODY: FieldDef = {
  name: 'body',
  label: 'Body',
  type: 'markdown',
  required: true,
};

/** Blog fields are identical across sites apart from the category options. */
function blogCollection(categories: string[]): CollectionDef {
  return {
    key: 'blog',
    label: 'Blog posts',
    singular: 'Blog post',
    folder: 'src/content/blog',
    icon: 'article',
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true },
      {
        name: 'description',
        label: 'Description',
        type: 'text',
        required: true,
        help: 'One or two sentences. Used on cards, in search results, and in the RSS feed.',
      },
      { name: 'pubDate', label: 'Publish date', type: 'date', required: true },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: categories,
      },
      TAGS,
      ...HERO,
      { name: 'author', label: 'Author', type: 'string' },
      { name: 'sourceUrl', label: 'Source URL', type: 'url' },
      DRAFT,
      BODY,
    ],
  };
}

/** The videos collection is byte-identical across all four sites. */
const VIDEOS: CollectionDef = {
  key: 'videos',
  label: 'Videos',
  singular: 'Video',
  folder: 'src/content/videos',
  icon: 'video',
  fields: [
    { name: 'title', label: 'Title', type: 'string', required: true },
    { name: 'description', label: 'Description', type: 'text', required: true },
    { name: 'pubDate', label: 'Publish date', type: 'date', required: true },
    {
      name: 'youtubeId',
      label: 'YouTube ID',
      type: 'string',
      required: true,
      help: 'Just the ID, not the whole URL. From youtube.com/watch?v=ABC123 the ID is ABC123. Pasting a full URL works too — it gets trimmed on save.',
    },
    {
      name: 'thumbnail',
      label: 'Custom thumbnail URL',
      type: 'url',
      help: 'Optional. Leave blank to use the YouTube thumbnail.',
    },
    TAGS,
    DRAFT,
  ],
};

/** New collection this dashboard introduces to all four sites. */
const PODCAST: CollectionDef = {
  key: 'podcast',
  label: 'Podcast episodes',
  singular: 'Episode',
  folder: 'src/content/podcast',
  icon: 'mic',
  fields: [
    { name: 'title', label: 'Episode title', type: 'string', required: true },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      required: true,
      help: 'The episode summary. Shown on the episode card and in the podcast RSS feed.',
    },
    { name: 'pubDate', label: 'Publish date', type: 'date', required: true },
    {
      name: 'episode',
      label: 'Episode number',
      type: 'number',
      required: true,
      integer: true,
      min: 1,
    },
    { name: 'season', label: 'Season', type: 'number', default: 1, integer: true, min: 1 },
    { name: 'duration', label: 'Duration', type: 'string', help: 'Format: 48:12 or 1:04:30' },
    {
      name: 'audioUrl',
      label: 'Audio file URL',
      type: 'url',
      help: 'Direct link to the .mp3. Required for the podcast RSS feed to work in Apple Podcasts.',
    },
    {
      name: 'spotifyEpisodeId',
      label: 'Spotify episode ID',
      type: 'string',
      help: 'From open.spotify.com/episode/<ID>. Drives the on-page player.',
    },
    { name: 'youtubeId', label: 'YouTube ID', type: 'string', help: 'If the episode is also on video.' },
    { name: 'guests', label: 'Guests', type: 'list', default: [] },
    TAGS,
    ...HERO,
    { name: 'explicit', label: 'Explicit', type: 'boolean', default: false },
    DRAFT,
    { name: 'body', label: 'Show notes', type: 'markdown', required: true },
  ],
};

// -- The four sites -----------------------------------------------------------

export const SITES: SiteDef[] = [
  {
    key: 'war',
    name: "Captain's War Chronicles",
    shortName: 'War',
    domain: 'captainswarchronicles.com',
    repo: 'war-chronicles',
    branch: 'main',
    accent: 'bg-amber-100 text-amber-900 border-amber-300',
    collections: [
      blogCollection(['history', 'leadership', 'campaigns', 'biographies', 'doctrine', 'journal']),
      VIDEOS,
      PODCAST,
      {
        key: 'battles',
        label: 'Battles',
        singular: 'Battle study',
        folder: 'src/content/battles',
        icon: 'swords',
        fields: [
          { name: 'title', label: 'Title', type: 'string', required: true },
          { name: 'description', label: 'Description', type: 'text', required: true },
          { name: 'pubDate', label: 'Publish date', type: 'date', required: true },
          { name: 'war', label: 'War / conflict', type: 'string', required: true },
          {
            name: 'year',
            label: 'Year',
            type: 'number',
            required: true,
            integer: true,
            help: 'Negative for BC. Cannae is -216.',
          },
          { name: 'belligerents', label: 'Belligerents', type: 'list', default: [] },
          { name: 'commanders', label: 'Commanders', type: 'list', default: [] },
          {
            name: 'outcome',
            label: 'Outcome',
            type: 'select',
            required: true,
            options: ['decisive', 'tactical', 'strategic', 'inconclusive', 'pyrrhic'],
          },
          TAGS,
          ...HERO,
          { name: 'author', label: 'Author', type: 'string' },
          { name: 'sourceUrl', label: 'Source URL', type: 'url' },
          DRAFT,
          BODY,
        ],
      },
    ],
  },
  {
    key: 'waterline',
    name: 'The Waterline Chronicles',
    shortName: 'Waterline',
    domain: 'waterlinechronicles.com',
    repo: 'waterline-chronicles',
    branch: 'main',
    accent: 'bg-sky-100 text-sky-900 border-sky-300',
    collections: [
      blogCollection(['maritime', 'rivers', 'boats', 'places', 'stories', 'journal']),
      VIDEOS,
      PODCAST,
      {
        key: 'places',
        label: 'Places',
        singular: 'Place',
        folder: 'src/content/places',
        icon: 'anchor',
        fields: [
          { name: 'title', label: 'Title', type: 'string', required: true },
          { name: 'description', label: 'Description', type: 'text', required: true },
          { name: 'pubDate', label: 'Publish date', type: 'date', required: true },
          { name: 'body_of_water', label: 'Body of water', type: 'string', required: true },
          { name: 'region', label: 'Region', type: 'string', required: true },
          {
            name: 'coordinates',
            label: 'Coordinates',
            type: 'string',
            help: 'Free text, e.g. 36.1627° N, 86.7816° W',
          },
          TAGS,
          ...HERO,
          { name: 'author', label: 'Author', type: 'string' },
          { name: 'sourceUrl', label: 'Source URL', type: 'url' },
          DRAFT,
          BODY,
        ],
      },
    ],
  },
  {
    key: 'cellar',
    name: "The Captain's Cellar",
    shortName: 'Cellar',
    domain: 'thecaptainscellar.com',
    repo: 'captains-cellar',
    branch: 'main',
    accent: 'bg-orange-100 text-orange-900 border-orange-300',
    collections: [
      blogCollection(['history', 'spirits', 'cigars', 'pipes', 'pairings', 'journal']),
      VIDEOS,
      PODCAST,
      {
        key: 'reviews',
        label: 'Reviews',
        singular: 'Review',
        folder: 'src/content/reviews',
        icon: 'star',
        fields: [
          { name: 'title', label: 'Title', type: 'string', required: true },
          {
            name: 'subject_type',
            label: 'Subject type',
            type: 'select',
            required: true,
            options: ['cigar', 'spirit', 'pipe', 'tobacco'],
          },
          { name: 'brand', label: 'Brand', type: 'string', required: true },
          { name: 'origin', label: 'Origin', type: 'string' },
          { name: 'strength', label: 'Strength', type: 'string' },
          {
            name: 'rating',
            label: 'Rating',
            type: 'number',
            required: true,
            min: 1,
            max: 5,
            help: '1 to 5, half steps allowed.',
          },
          { name: 'tasting_notes', label: 'Tasting notes', type: 'list', default: [] },
          TAGS,
          { name: 'pubDate', label: 'Publish date', type: 'date', required: true },
          ...HERO,
          DRAFT,
          BODY,
        ],
      },
    ],
  },
  {
    key: 'fear',
    name: 'The Chronicle of Fear',
    shortName: 'Fear',
    domain: 'chronicleoffear.com',
    repo: 'chronicle-of-fear',
    branch: 'main',
    accent: 'bg-violet-100 text-violet-900 border-violet-300',
    collections: [
      blogCollection(['folklore', 'myth', 'ghost-stories', 'field-notes', 'case-files', 'journal']),
      VIDEOS,
      PODCAST,
      {
        key: 'legends',
        label: 'Legends',
        singular: 'Legend',
        folder: 'src/content/legends',
        icon: 'moon',
        fields: [
          { name: 'title', label: 'Title', type: 'string', required: true },
          { name: 'description', label: 'Description', type: 'text', required: true },
          { name: 'pubDate', label: 'Publish date', type: 'date', required: true },
          { name: 'origin_region', label: 'Origin region', type: 'string', required: true },
          { name: 'era', label: 'Era', type: 'string' },
          { name: 'creature_or_being', label: 'Creature or being', type: 'string' },
          TAGS,
          ...HERO,
          { name: 'author', label: 'Author', type: 'string' },
          { name: 'sourceUrl', label: 'Source URL', type: 'url' },
          DRAFT,
          BODY,
        ],
      },
    ],
  },
];

// -- Lookups ------------------------------------------------------------------

export function getSite(siteKey: string): SiteDef | undefined {
  return SITES.find((s) => s.key === siteKey);
}

export function getCollection(siteKey: string, collectionKey: string): CollectionDef | undefined {
  return getSite(siteKey)?.collections.find((c) => c.key === collectionKey);
}

/**
 * Collection keys that exist on every site, so the composer knows what can be
 * cross-posted. Site-specific collections (battles, places, reviews, legends)
 * are deliberately excluded — their schemas don't line up.
 */
export const CROSS_POSTABLE = ['blog', 'videos', 'podcast'] as const;

export function sitesWithCollection(collectionKey: string): SiteDef[] {
  return SITES.filter((s) => s.collections.some((c) => c.key === collectionKey));
}
