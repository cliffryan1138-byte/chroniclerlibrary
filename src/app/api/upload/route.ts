import { getSite } from '@/lib/sites';
import { uploadImage } from '@/lib/github';
import { slugify } from '@/lib/slug';
import { errorResponse, requireSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — comfortably under the Contents API limit
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/** POST /api/upload — multipart image upload; commits into the site's public/uploads. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const form = await req.formData();
    const siteKey = String(form.get('site') ?? '');
    const file = form.get('file');

    const site = getSite(siteKey);
    if (!site) return Response.json({ error: 'Unknown site.' }, { status: 404 });
    if (!(file instanceof File)) {
      return Response.json({ error: 'No file was uploaded.' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return Response.json(
        { error: `Unsupported image type "${file.type || 'unknown'}". Use JPEG, PNG, WebP, GIF, or AVIF.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 8 MB.` },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const dot = file.name.lastIndexOf('.');
    const stem = slugify(dot > 0 ? file.name.slice(0, dot) : file.name) || 'image';
    const ext = (dot > 0 ? file.name.slice(dot) : '.jpg').toLowerCase();

    const url = await uploadImage({
      repo: site.repo,
      branch: site.branch,
      filename: `${stem}${ext}`,
      base64: buf.toString('base64'),
      author: { name: session.name, username: session.username },
    });

    return Response.json({ url });
  } catch (err) {
    return errorResponse(err);
  }
}
