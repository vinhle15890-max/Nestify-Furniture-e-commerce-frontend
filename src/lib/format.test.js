import { describe, it, expect } from 'vitest'
import { formatPrice, formatDate } from './format'

describe('formatPrice', () => {
  it('formats a number as Vietnamese currency', () => {
    expect(formatPrice(1500000)).toBe('1.500.000 ₫')
  })

  it('falls back to 0 for non-numeric input', () => {
    expect(formatPrice(undefined)).toBe('0 ₫')
  })
})

describe('formatDate', () => {
  it('formats an ISO timestamp as a Vietnamese date and time', () => {
    expect(formatDate('2026-01-15T10:30:00Z')).toBe('17:30 15 thg 1, 2026')
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})
