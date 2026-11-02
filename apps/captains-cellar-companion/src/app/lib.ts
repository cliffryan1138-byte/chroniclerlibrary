/** Birth year only, so treat anyone turning 21 this calendar year as eligible; the form also requires an explicit attestation. */
export function meetsMinimumAge(birthYear: number, minimumAge: number, now = new Date()): boolean {
  return Number.isInteger(birthYear) && birthYear > 1900 && now.getFullYear() - birthYear >= minimumAge
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Case- and spacing-insensitive key, so "padron  1964" and "Padron 1964" are the same cigar. */
export const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

export function findItem<T extends { brand: string; name: string }>(items: T[], brand: string, name: string): T | undefined {
  const b = normalizeName(brand), n = normalizeName(name)
  if (!b || !n) return undefined
  return items.find((i) => normalizeName(i.brand) === b && normalizeName(i.name) === n)
}
