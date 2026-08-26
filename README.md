# Chronicler Dashboard

One place to post blogs, videos, and podcast episodes to all four Chronicles
sites. Sign in, write, pick which sites it goes to, publish. Each publish is a
normal git commit to that site's repo, so the site's existing Vercel deploy
takes it live a minute or two later.

| Site | Repo | Collections |
|---|---|---|
| Captain's War Chronicles | `war-chronicles` | blog, videos, podcast, battles |
| The Waterline Chronicles | `waterline-chronicles` | blog, videos, podcast, places |
| The Captain's Cellar | `captains-cellar` | blog, videos, podcast, reviews |
| The Chronicle of Fear | `chronicle-of-fear` | blog, videos, podcast, legends |

## What it does

- **Write once, post to several sites.** Blog posts, videos, and podcast
  episodes exist on all four sites, so any of them can be cross-posted in one
  go. Site-specific types (battles, places, reviews, legends) post to their own
  site only — their schemas don't line up.
- **Forms built from each site's real schema.** Every field mirrors that site's
  `content.config.ts`, including the per-site blog categories, so a post can't
  be saved in a shape that breaks the site's build.
- **Edit and delete what's already published**, across every site, from the
  Content tab.
- **Image uploads** commit into the site's `public/uploads/<year>/` — both the
  hero image and images inside the body. In the Body editor, **Insert image**
  uploads a file and drops the markdown at your cursor; pasting an image from
  the clipboard does the same thing.
- **Two sign-ins.** Each person gets their own login, and their name is stamped
  on the post's `author` field and into the git commit, so the history shows who
  posted what.
- **Drafts** are committed but stay off the live site until `draft` is unticked.

## Setup

### 1. Create the GitHub token

A fine-grained personal access token is what lets the dashboard commit.

1. GitHub → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token.
2. **Repository access** → Only select repositories → pick all four:
   `war-chronicles`, `waterline-chronicles`, `captains-cellar`,
   `chronicle-of-fear`.
3. **Permissions** → Repository permissions → **Contents: Read and write**.
4. Generate, and copy the token. It's shown once.

### 2. Create the logins

For each person, generate a password hash:

```bash
npm run hash -- "the-password-they-will-use"
```

That prints a `scrypt$…` string. Never put the raw password in the environment —
only the hash.

### 3. Set the environment variables

Copy `.env.example` to `.env.local` for local use, or paste the same values into
Vercel → Project → Settings → Environment Variables.

| Variable | What it is |
|---|---|
| `GITHUB_TOKEN` | The token from step 1 |
| `GITHUB_OWNER` | `cliffryan1138-byte` |
| `SESSION_SECRET` | A long random string — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DASHBOARD_USERS` | JSON array of `{username, name, passwordHash}` |

`DASHBOARD_USERS` looks like this, on one line:

```json
[{"username":"cliff","name":"Cliff Ryan","passwordHash":"scrypt$…"},{"username":"rebecca","name":"Rebecca","passwordHash":"scrypt$…"}]
```

To add or remove someone later, edit that variable and redeploy. There's no
database to migrate.

### 4. Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

### 5. Deploy

Vercel → Add New → Project → import this repo. Framework preset is Next.js and
needs no changes. Add the four environment variables above, then deploy. Use a
Vercel Authentication or password setting on the project as a second layer if you
want one; the app's own login is already required either way.

## How posting works

1. **Compose** → pick the site and content type.
2. Fill in the fields. Required ones are marked; optional ones left blank are
   omitted from the frontmatter rather than written as empty values, which is
   what keeps the sites' schema validation happy.
3. For blogs, videos, and podcast episodes, tick **Also post to** for any other
   site that should get the same entry. Blog categories differ per site, so check
   the category field when cross-posting.
4. **Publish**. You get a link to each commit. The site rebuilds on its own.

Tick **Draft** to commit without going live.

## Podcast episodes

Episodes are a content collection on each site — added by the
`claude/podcast-collection` branch in each site repo, which needs to be merged
before episodes will render. Once merged, each site gets:

- `/podcast` — the episode index, with the Spotify show embed on top if
  `SPOTIFY_SHOW_ID` is set in that site's `src/site.config.ts`
- `/podcast/<slug>` — episode pages, with a player that prefers Spotify, then
  YouTube, then a direct audio file
- `/podcast/rss.xml` — a podcast feed carrying the iTunes tags Apple Podcasts
  requires

For an episode to be playable in Apple Podcasts, fill in **Audio file URL** with
a direct link to the `.mp3`. Spotify and YouTube IDs drive the on-page player but
don't feed the RSS enclosure.

## Tests

```bash
npm test
```

Builds a sample entry for every collection on every site and checks the emitted
frontmatter against each site's schema rules — required fields present, optional
empties omitted rather than written as `""`, select values valid, numeric bounds
enforced, dates not drifting by a day across timezones, and pasted YouTube and
Spotify URLs trimmed to bare IDs.

## Notes

- The dashboard holds no content of its own. Every read and write is a GitHub API
  call against the site repos, so the repos stay the source of truth and nothing
  needs syncing.
- Commits are attributed to the signed-in user via the GitHub API's author field.
  They're pushed by the token, so GitHub shows the token's account as committer.
- Deleting an entry commits a deletion. It comes off the live site but stays in
  the git history.
