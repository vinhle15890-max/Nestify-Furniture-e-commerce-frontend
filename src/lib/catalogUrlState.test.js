import { describe, expect, it } from 'vitest'
import { readCatalogUrlState, writeCatalogUrlState } from './catalogUrlState'

describe('catalogUrlState', () => {
  it('restores search, price and sort from a URL', () => {
    expect(readCatalogUrlState(new URLSearchParams('search=sofa&price=2-5&sort=-created_at'))).toEqual({ search: 'sofa', price: '2-5', sort: '-created_at' })
  })

  it('updates known filters without dropping unrelated query state', () => {
    expect(writeCatalogUrlState('search=sofa&campaign=summer', { sort: 'name', search: '' }).toString()).toBe('campaign=summer&sort=name')
  })
})
