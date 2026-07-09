import { describe, it, expect } from 'vitest'
import { summarizeItems } from './summary'

it('line mang slug + productName của variant', () => {
  const { lines } = summarizeItems([{ variant: { id: 9, name: 'Đỏ', price: 100, product_slug: 'ghe', product_name: 'Ghế' } }])
  expect(lines[0].slug).toBe('ghe')
  expect(lines[0].productName).toBe('Ghế')
})

const item = (localId, id, name, price) => ({ localId, variant: { id, name, price } })

describe('summarizeItems', () => {
  it('groups repeated variants by count and sums the total', () => {
    const result = summarizeItems([
      item(1, 10, 'Sofa', 5000000),
      item(2, 10, 'Sofa', 5000000),
      item(3, 20, 'Bàn', 2000000),
    ])
    expect(result.lines).toEqual([
      { variantId: 10, name: 'Sofa', price: 5000000, qty: 2, lineTotal: 10000000, slug: null, productName: null },
      { variantId: 20, name: 'Bàn', price: 2000000, qty: 1, lineTotal: 2000000, slug: null, productName: null },
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
