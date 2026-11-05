// Phone-width smoke test in light and dark, in demo mode: npm run build && npx vite preview, then
//   npm run screenshots -- http://localhost:4173
// Walks signup → quiz → logs → palate → discover → pipe tobacco and pipes → curation, saving screenshots and
// failing on console errors or horizontal overflow. Set CHROMIUM_PATH if Chromium isn't on the default path.
import { mkdirSync } from 'node:fs'
import { chromium, type Page } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:4173'
const out = 'screenshots'
mkdirSync(out, { recursive: true })

async function noOverflow(page: Page, label: string) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  if (sw > cw) throw new Error(`${label}: horizontal overflow (${sw} > ${cw})`)
}

async function run(scheme: 'light' | 'dark') {
  let current: Page | null = null
  try { await walk(scheme, (p) => { current = p }) } catch (err) {
    if (current) {
      await (current as Page).screenshot({ path: `${out}/${scheme}-FAILED.png`, fullPage: true })
      console.error('localStorage at failure:', await (current as Page).evaluate(() => JSON.stringify({ items: JSON.parse(localStorage.getItem('ccc:items') ?? '[]').map((i: { id: string; name: string; status: string }) => [i.id, i.name, i.status]), logs: JSON.parse(localStorage.getItem('ccc:logs') ?? '[]').map((l: { itemId: string }) => l.itemId) })))
    }
    throw err
  }
}

async function walk(scheme: 'light' | 'dark', expose: (p: Page) => void) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true })
  expose(page)
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('fonts.g') && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  const shot = async (name: string) => {
    await noOverflow(page, `${scheme}/${name}`)
    await page.screenshot({ path: `${out}/${scheme}-${name}.png`, fullPage: true })
  }

  await page.goto(base)
  await page.getByText('Before we pour').waitFor()
  await page.getByPlaceholder('YYYY').fill(String(new Date().getFullYear() - 18))
  await page.getByRole('alert').waitFor()
  await shot('01-age-gate-blocked')
  await page.getByPlaceholder('YYYY').fill('1975')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Enter the cellar' }).click()

  await page.getByText('A quick read on your palate').waitFor()
  for (const f of ['Woody', 'Spicy', 'Leather']) await page.getByRole('button', { name: f, exact: true }).first().click()
  await page.getByRole('button', { name: 'Floral', exact: true }).nth(1).click()
  await page.getByRole('radio', { name: 'Full' }).click()
  await shot('02-quiz')
  await page.getByRole('button', { name: 'Start my journal' }).click()

  await page.getByRole('heading', { name: 'You might like' }).waitFor()
  await shot('03-discover-cold-start')

  await page.getByRole('button', { name: 'Log', exact: true }).click()
  // Band scan: demo mode has no account, so it should explain instead of failing.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  await page.locator('input[type=file]').setInputFiles({ name: 'band.png', mimeType: 'image/png', buffer: png })
  await page.getByText('Band scanning needs an account').waitFor()

  // A cigar the catalog doesn't know: typed straight in, no picking.
  await page.getByLabel('Maker').fill('Test Maker')
  await page.getByLabel('Cigar', { exact: true }).fill('Test Maduro Robusto')
  await page.getByText('New to us.').waitFor()
  // Its size, typed in, travels to the curator. A silly ring is flagged, not saved.
  await page.getByLabel(/Ring gauge/).fill('500')
  await page.getByText('Between 20 and 80').waitFor()
  await page.getByLabel(/Ring gauge/).fill('50')
  await page.getByLabel(/Length/).fill('5')
  await page.getByRole('radio', { name: '5 of 5' }).click()
  await page.getByRole('radio', { name: 'Yes' }).click()
  for (const f of ['Spicy', 'Earthy']) await page.getByRole('button', { name: f, exact: true }).click()
  await shot('04-log-simple')
  await page.getByRole('button', { name: 'Save to journal' }).click()

  await page.getByRole('heading', { name: 'Your palate' }).waitFor()
  await page.getByText('Sessions logged').waitFor()
  await shot('05-palate')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'Detailed' }).click()
  await shot('06-settings')
  await page.getByRole('button', { name: 'Log', exact: true }).click()
  // A catalog cigar typed by hand, in sloppy case: should still match.
  await page.getByLabel('Maker').fill('sample house b')
  await page.getByLabel('Cigar', { exact: true }).fill('sample cocoa box toro')
  await page.getByText('In the catalog').waitFor()
  await page.getByRole('radio', { name: '4 of 5' }).click()
  await page.getByRole('radio', { name: 'First' }).click()
  await page.getByRole('button', { name: 'Roasted', exact: true }).click()
  await page.getByRole('button', { name: 'Espresso' }).click()
  await page.getByRole('button', { name: 'Cocoa', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'Draw' }).getByRole('radio', { name: '4' }).click()
  await shot('07-log-detailed')
  await page.getByRole('button', { name: 'Save to journal' }).click()
  await page.getByText('Specific notes you like').waitFor()
  await page.getByText('Test Maduro Robusto').waitFor()
  await page.getByRole('button', { name: 'Discover' }).click()
  await page.getByText('% match').first().waitFor()
  await shot('08-discover')

  // Pipe tobacco: its own quiz, palate and log form, behind the category switch.
  await page.getByRole('radio', { name: 'Pipe tobacco' }).click()
  await page.getByText('A quick read on your palate').waitFor()
  for (const f of ['Smoky', 'Grassy']) await page.getByRole('button', { name: f, exact: true }).first().click()
  await page.getByRole('radio', { name: 'Medium' }).click()
  await shot('09-pipe-quiz')
  await page.getByRole('button', { name: 'Start my journal' }).click()
  await page.getByRole('heading', { name: 'You might like' }).waitFor()
  await page.locator('ol').getByText('SAMPLE Campfire English').waitFor()
  await page.getByRole('button', { name: 'Log', exact: true }).click()
  await page.getByText('Scan the tin').waitFor()
  await page.getByLabel('Maker').fill('sample blender a')
  await page.getByLabel('Blend', { exact: true }).fill('sample morning virginia flake')
  await page.getByText('In the catalog').waitFor()
  await page.getByRole('radio', { name: '5 of 5' }).click()
  await page.getByRole('radio', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Grassy', exact: true }).click()
  await page.getByRole('button', { name: 'Hay' }).click()
  await page.getByRole('radiogroup', { name: 'Tongue bite' }).getByRole('radio', { name: '1' }).click()
  await shot('10-pipe-log')
  await page.getByRole('button', { name: 'Save to journal' }).click()
  await page.getByText('SAMPLE Morning Virginia Flake').waitFor()
  await shot('11-pipe-palate')

  await page.getByRole('button', { name: 'Discover' }).click()
  await page.getByText('Browse by style').waitFor()
  await page.locator('summary', { hasText: 'English' }).click()
  await page.getByText('Built around Latakia').waitFor()
  await shot('12-pipe-styles')

  // Pipe collection: add a pipe on the palate, smoke a bowl in it, and see the bowl counted.
  await page.getByRole('button', { name: 'Palate' }).click()
  await page.getByRole('button', { name: 'Add a pipe' }).click()
  await page.getByPlaceholder('Who made it').fill('Test Pipe Maker')
  await page.getByLabel('Shape').selectOption('Bent Billiard')
  await page.getByText('A billiard with a curved stem').waitFor()
  await page.getByLabel('Material').selectOption('Briar')
  await page.getByLabel('Dedicated to a blend: Maker').fill('SAMPLE Blender A')
  await page.getByLabel('Dedicated to a blend: Blend').fill('SAMPLE Morning Virginia Flake')
  await page.getByText('In your catalog: SAMPLE Blender A SAMPLE Morning Virginia Flake').waitFor()
  await shot('13-pipe-add')
  await page.getByRole('button', { name: 'Add a pipe' }).last().click()
  await page.getByText('0 bowls').waitFor()
  await page.getByRole('button', { name: 'Log', exact: true }).click()
  await page.getByLabel('Maker').fill('sample blender a')
  await page.getByLabel('Blend', { exact: true }).fill('sample morning virginia flake')
  await page.getByRole('radio', { name: '4 of 5' }).click()
  await page.getByRole('button', { name: 'Grassy', exact: true }).click()
  await page.getByLabel('Smoked in').selectOption({ label: 'Test Pipe Maker (Bent Billiard)' })
  await page.getByRole('button', { name: 'Save to journal' }).click()
  await page.getByText('1 bowl', { exact: true }).waitFor()
  await page.getByText('For SAMPLE Blender A SAMPLE Morning Virginia Flake').waitFor()
  await shot('14-pipe-collection')

  // Switching back keeps the cigar palate separate, and cigars have no style browser.
  await page.getByRole('button', { name: 'Palate' }).click()
  await page.getByRole('radio', { name: 'Cigars' }).click()
  await page.getByText('Test Maduro Robusto').waitFor()
  await page.getByRole('button', { name: 'Discover' }).click()
  if (await page.getByText('Browse by style').count()) throw new Error('cigars should not show the pipe style browser')
  await page.locator('summary', { hasText: 'Thick (52 and up)' }).click()
  await page.getByText('A cooler, slower smoke').waitFor()
  await page.locator('details[open]').getByText(/\d+ ring/).first().waitFor()
  await page.locator('summary', { hasText: 'Thick (52 and up)' }).click() // closed again, so the maker list below is the only one open
  await page.locator('summary', { hasText: 'SAMPLE House B' }).click()
  await page.locator('details[open]').getByText('SAMPLE Cocoa Box Toro').waitFor()
  await page.locator('details[open]').getByText('SAMPLE Cocoa Box', { exact: true }).waitFor() // its line, as a heading
  await shot('15-cigar-makers')

  // A cigar's own card: its facts, your history, the members' block, then "Log this" fills the form.
  await page.locator('details[open]').getByRole('button', { name: /SAMPLE Cocoa Box Toro/ }).click()
  const card = page.getByRole('dialog', { name: /SAMPLE Cocoa Box Toro/ })
  await card.getByText('The facts').waitFor()
  await card.getByText(/times, averaging|Once, averaging/).waitFor()
  await card.getByText('The community view opens once 3 people have logged it.').waitFor()
  await shot('15b-cigar-card')
  await card.getByRole('button', { name: /Log this cigar/ }).click()
  if (await page.getByLabel('Maker').inputValue() !== 'SAMPLE House B') throw new Error('Log this should fill the maker')
  if (await page.getByLabel('Cigar', { exact: true }).inputValue() !== 'SAMPLE Cocoa Box Toro') throw new Error('Log this should fill the cigar')
  await page.getByText('In the catalog').waitFor()
  await page.getByRole('button', { name: 'Discover' }).click()

  // Curation: the demo user curates their own typed-in cigar.
  await page.getByRole('button', { name: 'Curate, 1 waiting' }).waitFor()
  await page.getByRole('button', { name: 'Curate, 1 waiting' }).click()
  await page.getByText('Waiting: 1').waitFor()
  await page.getByText('Logged 1 time by 1 person').waitFor()
  await page.getByText('5" · 50 ring').waitFor() // the size they typed in
  await page.getByLabel('Maker', { exact: true }).fill('SAMPLE House B')
  await page.getByLabel('Cigar', { exact: true }).fill('sample cocoa box toro')
  await page.getByRole('button', { name: 'Approve' }).click()
  await page.getByText('Already in the catalog: merge it instead').waitFor()
  await page.getByRole('button', { name: 'Merge…' }).click()
  await page.getByPlaceholder('Search the catalog').fill('cocoa')
  await page.getByRole('button', { name: /SAMPLE House B SAMPLE Cocoa Box Toro/ }).click()
  await shot('16-curator-merge')
  await page.getByRole('button', { name: 'Merge', exact: true }).click()
  await page.getByText('Nothing waiting. The catalog is all caught up.').waitFor()
  await page.getByRole('button', { name: 'Curate', exact: true }).waitFor()  // the badge is gone
  await shot('17-curator-empty')
  await page.getByRole('button', { name: 'Palate' }).click()
  await page.getByText('Sessions logged').waitFor()
  if (await page.getByText('Test Maduro Robusto').count()) throw new Error('the merged entry should be gone from the palate')
  if ((await page.getByText('SAMPLE Cocoa Box Toro').count()) < 2) throw new Error('both logs should now be on the catalog cigar')

  // Coming back later: the quiz is done, so the app opens straight on the log.
  await page.reload()
  await page.getByRole('button', { name: 'Save to journal' }).waitFor()
  if ((await page.getByRole('button', { name: 'Log', exact: true }).getAttribute('aria-current')) !== 'page') throw new Error('the app should open on Log')

  // Home-screen app: the install file and icons load, Settings explains how to add it, and with the
  // offline cache in place the app still opens with no signal.
  const manifest = await (await page.request.get(`${base}/manifest.webmanifest`)).json() as { display: string; icons: { src: string; sizes: string; purpose: string }[] }
  if (manifest.display !== 'standalone') throw new Error('manifest should open standalone')
  for (const want of ['192x192', '512x512']) if (!manifest.icons.some((i) => i.sizes === want && i.src.endsWith('.png'))) throw new Error(`manifest is missing a ${want} PNG icon`)
  if (!manifest.icons.some((i) => i.purpose === 'maskable')) throw new Error('manifest is missing a maskable icon')
  for (const src of [...manifest.icons.map((i) => i.src), '/apple-touch-icon.png']) {
    const res = await page.request.get(`${base}${src}`)
    if (!res.ok()) throw new Error(`${src} answered ${res.status()}`)
  }
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('heading', { name: 'Add to your Home Screen' }).waitFor()
  await shot('18-install')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload() // now controlled by the service worker, which caches as it goes
  await page.getByRole('button', { name: 'Save to journal' }).waitFor()
  await page.context().setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Save to journal' }).waitFor()
  await page.context().setOffline(false)

  await browser.close()
  if (errors.length) throw new Error(`${scheme}: console errors:\n${errors.join('\n')}`)
  console.log(`${scheme}: ok`)
}

await run('light')
await run('dark')
