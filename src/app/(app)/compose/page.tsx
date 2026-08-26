import ComposerForm from '@/components/ComposerForm';
import { SITES, getCollection, getSite } from '@/lib/sites';

export const dynamic = 'force-dynamic';

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const siteKey = one(params.site) ?? SITES[0].key;
  const site = getSite(siteKey) ?? SITES[0];
  const requested = one(params.collection) ?? 'blog';
  const collectionKey = getCollection(site.key, requested) ? requested : site.collections[0].key;
  const file = one(params.file);

  return (
    <div>
      <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
        {file ? 'Edit' : 'Compose'}
      </h1>
      <p className="mt-1 text-sm opacity-70">
        {file
          ? 'Changes commit straight to the site repo.'
          : 'Write once, publish to one site or several.'}
      </p>

      <div className="mt-6">
        <ComposerForm
          key={`${site.key}-${collectionKey}-${file ?? 'new'}`}
          initialSite={site.key}
          initialCollection={collectionKey}
          editFile={file}
        />
      </div>
    </div>
  );
}
