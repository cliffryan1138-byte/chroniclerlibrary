import ContentBrowser from '@/components/ContentBrowser';
import { SITES } from '@/lib/sites';

export const dynamic = 'force-dynamic';

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.site;
  const siteKey = (Array.isArray(raw) ? raw[0] : raw) ?? SITES[0].key;

  return (
    <div>
      <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
        Content
      </h1>
      <p className="mt-1 text-sm opacity-70">
        Everything published across the four sites. Edit or remove any of it.
      </p>
      <div className="mt-6">
        <ContentBrowser initialSite={siteKey} />
      </div>
    </div>
  );
}
