// Renders the home-screen icons from the artwork below: npm run icons
// iPhones ignore SVG icons and want a full square (they round the corners themselves); Android wants PNGs at
// 192 and 512, plus a "maskable" one with the art inside the middle 80% so any mask shape leaves it whole.
import { chromium } from 'playwright-core'

const art = (scale: number) => `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
  <circle cx="256" cy="256" r="150" fill="none" stroke="#C2912E" stroke-width="22"/>
  <path d="M256 150c40 50 40 160 0 212c-40-52-40-162 0-212z" fill="#E69637"/></g>`
const svg = (rounded: boolean, scale: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" ${rounded ? 'rx="96"' : ''} fill="#2B1D14"/>${art(scale)}</svg>`

const icons: [file: string, size: number, rounded: boolean, scale: number][] = [
  ['icon-192.png', 192, true, 1],
  ['icon-512.png', 512, true, 1],
  ['icon-maskable-512.png', 512, false, 0.8],
  ['apple-touch-icon.png', 180, false, 0.9],
]

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' })
for (const [file, size, rounded, scale] of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(rounded, scale).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: `public/${file}`, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
  console.log(`public/${file}`)
}
await browser.close()
