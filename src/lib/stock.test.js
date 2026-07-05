import { describe, it, expect } from 'vitest'
import { stockShortfall, cartHasStockShortfall } from './stock'

function item({ available, quantity }) {
  return { id: 1, quantity, variant: { id: 1, available_stock: available } }
}

describe('stockShortfall', () => {
  it('returns null when available stock covers the ordered quantity', () => {
    expect(stockShortfall(item({ available: 5, quantity: 2 }))).toBeNull()
    expect(stockShortfall(item({ available: 2, quantity: 2 }))).toBeNull()
  })

  it('flags an out-of-stock variant', () => {
    expect(stockShortfall(item({ available: 0, quantity: 1 }))).toEqual({ kind: 'out', available: 0 })
  })

  it('flags a quantity that exceeds available stock', () => {
    expect(stockShortfall(item({ available: 1, quantity: 3 }))).toEqual({ kind: 'low', available: 1 })
  })

  it('treats a missing variant / available_stock as out of stock', () => {
    expect(stockShortfall({ quantity: 1 })).toEqual({ kind: 'out', available: 0 })
    expect(stockShortfall({ quantity: 1, variant: {} })).toEqual({ kind: 'out', available: 0 })
  })
})

describe('cartHasStockShortfall', () => {
  it('is false for an all-healthy cart', () => {
    expect(cartHasStockShortfall([item({ available: 5, quantity: 2 }), item({ available: 3, quantity: 3 })])).toBe(false)
  })

  it('is true when any line item is short', () => {
    expect(cartHasStockShortfall([item({ available: 5, quantity: 2 }), item({ available: 1, quantity: 4 })])).toBe(true)
  })

  it('is false for an empty cart', () => {
    expect(cartHasStockShortfall([])).toBe(false)
    expect(cartHasStockShortfall()).toBe(false)
  })
})
