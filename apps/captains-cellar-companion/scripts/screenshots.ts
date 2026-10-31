// Phone-width smoke test in light and dark, in demo mode: npm run build && npx vite preview, then
//   npm run screenshots -- http://localhost:4173
// Walks signup → quiz → simple log → palate → discover → detailed log, saving screenshots and
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
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true })
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
  await page.getByPlaceholder('Search by name or brand').fill('pepper')
  await page.getByRole('button', { name: /SAMPLE Pepper Mill Torpedo/ }).click()
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
  await page.getByRole('button', { name: /SAMPLE Cocoa Box Toro/ }).click()
  await page.getByRole('radio', { name: '4 of 5' }).click()
  await page.getByRole('radio', { name: 'First' }).click()
  await page.getByRole('button', { name: 'Roasted', exact: true }).click()
  await page.getByRole('button', { name: 'Espresso' }).click()
  await page.getByRole('button', { name: 'Cocoa', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'Draw' }).getByRole('radio', { name: '4' }).click()
  await shot('07-log-detailed')
  await page.getByRole('button', { name: 'Save to journal' }).click()
  await page.getByText('Specific notes you like').waitFor()

  await page.getByRole('button', { name: 'Discover' }).click()
  await page.getByText('% match').first().waitFor()
  await shot('08-discover')

  await browser.close()
  if (errors.length) throw new Error(`${scheme}: console errors:\n${errors.join('\n')}`)
  console.log(`${scheme}: ok`)
}

await run('light')
await run('dark')
