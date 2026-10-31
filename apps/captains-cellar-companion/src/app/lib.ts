/** Birth year only, so treat anyone turning 21 this calendar year as eligible; the form also requires an explicit attestation. */
export function meetsMinimumAge(birthYear: number, minimumAge: number, now = new Date()): boolean {
  return Number.isInteger(birthYear) && birthYear > 1900 && now.getFullYear() - birthYear >= minimumAge
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
