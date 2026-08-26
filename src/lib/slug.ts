/** Slug + filename helpers. Matches the sites' `{{year}}-{{month}}-{{day}}-{{slug}}` convention. */

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * Build the repo filename for an entry. Blog-style collections are date-prefixed
 * to match what's already committed; videos and podcast episodes are not, since
 * they're ordered by episode number or pubDate in the UI anyway.
 */
export function entryFilename(collectionKey: string, title: string, pubDate: string): string {
  const slug = slugify(title) || 'untitled';
  const datePrefixed = ['blog', 'battles', 'places', 'reviews', 'legends'];
  if (datePrefixed.includes(collectionKey) && /^\d{4}-\d{2}-\d{2}$/.test(pubDate)) {
    return `${pubDate}-${slug}.md`;
  }
  return `${slug}.md`;
}
