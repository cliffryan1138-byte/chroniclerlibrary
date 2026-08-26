// -----------------------------------------------------------------------------
// GitHub Contents API wrapper.
//
// The dashboard never clones anything. Every read and write is a REST call
// against the four site repos, so a post is a normal commit and the site's
// existing Vercel deploy hook takes it from there.
// -----------------------------------------------------------------------------

const API = 'https://api.github.com';

export interface RepoFile {
  name: string;
  path: string;
  sha: string;
  size: number;
}

export interface CommitAuthor {
  /** Display name of the signed-in dashboard user. */
  name: string;
  username: string;
}

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error('GITHUB_TOKEN is not set. See .env.example.');
  return t;
}

function owner(): string {
  return process.env.GITHUB_OWNER || 'cliffryan1138-byte';
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = parsed.message || text;
    } catch {
      /* keep raw text */
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `GitHub rejected the request (${res.status}). Check that GITHUB_TOKEN is valid and has "Contents: Read and write" on this repo. Detail: ${detail}`,
      );
    }
    if (res.status === 409) {
      throw new Error(
        'This file changed in GitHub since you loaded it. Reload the entry and reapply your edit.',
      );
    }
    throw new Error(`GitHub ${res.status}: ${detail}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** List markdown files in a collection folder. Returns [] if the folder is absent. */
export async function listCollection(repo: string, folder: string): Promise<RepoFile[]> {
  try {
    const items = await gh<
      Array<{ name: string; path: string; sha: string; size: number; type: string }>
    >(`/repos/${owner()}/${repo}/contents/${encodeURI(folder)}`);
    if (!Array.isArray(items)) return [];
    return items
      .filter((i) => i.type === 'file' && /\.mdx?$/.test(i.name))
      .map(({ name, path, sha, size }) => ({ name, path, sha, size }));
  } catch (err) {
    // A collection folder that doesn't exist yet is a normal empty state, not
    // an error worth surfacing — podcast/ won't exist until the first episode.
    if (err instanceof Error && /404/.test(err.message)) return [];
    throw err;
  }
}

export interface FileContent {
  text: string;
  sha: string;
}

export async function readFile(repo: string, path: string): Promise<FileContent | null> {
  try {
    const data = await gh<{ content: string; encoding: string; sha: string }>(
      `/repos/${owner()}/${repo}/contents/${encodeURI(path)}`,
    );
    const text =
      data.encoding === 'base64'
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : data.content;
    return { text, sha: data.sha };
  } catch (err) {
    if (err instanceof Error && /404/.test(err.message)) return null;
    throw err;
  }
}

export interface WriteResult {
  path: string;
  commitUrl: string;
  created: boolean;
}

/** Create or update a file. Pass `sha` when updating an existing one. */
export async function writeFile(opts: {
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
  author: CommitAuthor;
  sha?: string;
}): Promise<WriteResult> {
  const { repo, branch, path, content, message, author, sha } = opts;

  const res = await gh<{ commit: { html_url: string } }>(
    `/repos/${owner()}/${repo}/contents/${encodeURI(path)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch,
        ...(sha ? { sha } : {}),
        // Attributes the commit to whoever is signed in to the dashboard, so
        // the repo history shows who actually posted each piece.
        author: {
          name: author.name,
          email: `${author.username}@users.noreply.github.com`,
        },
      }),
    },
  );

  return { path, commitUrl: res.commit.html_url, created: !sha };
}

export async function deleteFile(opts: {
  repo: string;
  branch: string;
  path: string;
  sha: string;
  message: string;
  author: CommitAuthor;
}): Promise<void> {
  const { repo, branch, path, sha, message, author } = opts;
  await gh(`/repos/${owner()}/${repo}/contents/${encodeURI(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message,
      sha,
      branch,
      author: {
        name: author.name,
        email: `${author.username}@users.noreply.github.com`,
      },
    }),
  });
}

/** Upload an image into the site's public/uploads folder; returns its site path. */
export async function uploadImage(opts: {
  repo: string;
  branch: string;
  filename: string;
  base64: string;
  author: CommitAuthor;
}): Promise<string> {
  const { repo, branch, filename, base64, author } = opts;
  const year = new Date().getFullYear();
  const path = `public/uploads/${year}/${filename}`;

  // If the name is taken, suffix rather than overwrite someone else's image.
  let finalPath = path;
  let n = 1;
  while (await readFile(repo, finalPath)) {
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const ext = dot > 0 ? filename.slice(dot) : '';
    finalPath = `public/uploads/${year}/${stem}-${n}${ext}`;
    n += 1;
    if (n > 50) throw new Error('Could not find a free filename for this upload.');
  }

  await gh(`/repos/${owner()}/${repo}/contents/${encodeURI(finalPath)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Upload ${filename} (via dashboard, ${author.name})`,
      content: base64,
      branch,
      author: {
        name: author.name,
        email: `${author.username}@users.noreply.github.com`,
      },
    }),
  });

  // public/ is served from the site root.
  return `/${finalPath.replace(/^public\//, '')}`;
}
