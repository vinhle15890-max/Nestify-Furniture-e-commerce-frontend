import { describe, it, expect } from 'vitest'
import { formatPrice } from './format'

describe('formatPrice', () => {
  it('formats a number as Vietnamese currency', () => {
    expect(formatPrice(1500000)).toBe('1.500.000 ₫')
  })

  it('falls back to 0 for non-numeric input', () => {
    expect(formatPrice(undefined)).toBe('0 ₫')
  })
})
