import { store } from './data'

export interface ScanResult {
  maker: string | null
  name: string | null
  confidence: 'high' | 'medium' | 'low'
}

/** Longest side in pixels after resizing; plenty for reading a band, small enough to upload fast. */
const MAX_SIDE = 1568

/** Downscale a phone photo to a JPEG under the server's size limit, as base64 without the data: prefix. */
async function toJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

/** Returns null when the band couldn't be read; throws with a user-facing message on other failures. */
export async function scanBand(file: File): Promise<ScanResult | null> {
  const token = await store.accessToken()
  if (!token) throw new Error('demo')
  const res = await fetch('/api/scan-band', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ image: await toJpegBase64(file), mediaType: 'image/jpeg' }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${body.error ?? 'Scan failed.'}${body.code ? ` (${body.code})` : ` (http-${res.status})`}`)
  return body.found && (body.maker || body.name) ? body : null
}
