import { describe, it, expect } from 'vitest'
import { summarizeItems } from './summary'

const item = (localId, id, name, price) => ({ localId, variant: { id, name, price } })

describe('summarizeItems', () => {
  it('groups repeated variants by count and sums the total', () => {
    const result = summarizeItems([
      item(1, 10, 'Sofa', 5000000),
      item(2, 10, 'Sofa', 5000000),
      item(3, 20, 'Bàn', 2000000),
    ])
    expect(result.lines).toEqual([
      { variantId: 10, name: 'Sofa', price: 5000000, qty: 2, lineTotal: 10000000 },
      { variantId: 20, name: 'Bàn', price: 2000000, qty: 1, lineTotal: 2000000 },
    ])
    expect(result.total).toBe(12000000)
    expect(result.hasUnpriced).toBe(false)
  })

  it('treats a null/NaN price as unpriced: excluded from total, flagged', () => {
    const result = summarizeItems([
      item(1, 10, 'Sofa', 5000000),
      item(2, 30, 'Đèn', null),
    ])
    expect(result.total).toBe(5000000)
    expect(result.hasUnpriced).toBe(true)
    const lamp = result.lines.find((l) => l.variantId === 30)
    expect(lamp.price).toBeNull()
    expect(lamp.lineTotal).toBeNull()
  })

  it('returns an empty summary for no items', () => {
    expect(summarizeItems([])).toEqual({ lines: [], total: 0, hasUnpriced: false })
  })
})
