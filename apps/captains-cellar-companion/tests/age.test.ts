import { describe, expect, it } from 'vitest'
import { meetsMinimumAge } from '../src/app/lib'

describe('age gate', () => {
  const now = new Date('2026-10-21')
  it('accepts 21+ by birth year', () => expect(meetsMinimumAge(2005, 21, now)).toBe(true))
  it('rejects under 21', () => expect(meetsMinimumAge(2006, 21, now)).toBe(false))
  it('rejects nonsense years', () => {
    expect(meetsMinimumAge(1800, 21, now)).toBe(false)
    expect(meetsMinimumAge(NaN, 21, now)).toBe(false)
  })
})
