import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('strips Vietnamese diacritics', () => {
    expect(slugify('Ghế Sofa Da Bò')).toBe('ghe-sofa-da-bo')
  })

  it('maps đ/Đ to d', () => {
    expect(slugify('Đèn bàn gỗ')).toBe('den-ban-go')
  })

  it('collapses spaces and punctuation into single hyphens', () => {
    expect(slugify('Bàn   trà!@#  mới')).toBe('ban-tra-moi')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  -Sofa góc-  ')).toBe('sofa-goc')
  })

  it('returns empty string for empty/nullish input', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
  })
})
