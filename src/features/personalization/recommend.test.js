import { describe, it, expect } from 'vitest'
import { topCategorySlug } from './recommend'

describe('topCategorySlug', () => {
  it('returns null for empty input', () => {
    expect(topCategorySlug([])).toBeNull()
    expect(topCategorySlug(undefined)).toBeNull()
  })

  it('returns the most frequent category slug', () => {
    const products = [
      { slug: 'a', category: { slug: 'ghe' } },
      { slug: 'b', category: { slug: 'ban' } },
      { slug: 'c', category: { slug: 'ghe' } },
    ]
    expect(topCategorySlug(products)).toBe('ghe')
  })

  it('ignores products without a category', () => {
    const products = [
      { slug: 'a', category: null },
      { slug: 'b', category: { slug: 'ban' } },
    ]
    expect(topCategorySlug(products)).toBe('ban')
  })

  it('breaks ties by first appearance', () => {
    const products = [
      { slug: 'a', category: { slug: 'ghe' } },
      { slug: 'b', category: { slug: 'ban' } },
    ]
    expect(topCategorySlug(products)).toBe('ghe')
  })
})
