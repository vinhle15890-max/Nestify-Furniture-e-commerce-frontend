import { describe, it, expect } from 'vitest'
import { toPlaceableItems } from './placeable'

describe('roomPlanner/placeable', () => {
  it('keeps only variants that have a 3D model and carries the product thumbnail', () => {
    const products = [
      {
        id: 1, name: 'Sofa', thumbnail: 'thumb.jpg',
        variants: [
          { id: 11, sku: 'A', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 },
          { id: 12, sku: 'B', name: 'Xanh', model_3d_url: null, price: 120 },
        ],
      },
      { id: 2, name: 'Bàn', thumbnail: null, variants: [{ id: 21, sku: 'C', model_3d_url: '', price: 50 }] },
    ]
    const out = toPlaceableItems(products)
    expect(out).toHaveLength(1)
    expect(out[0].variant).toMatchObject({ id: 11, model_3d_url: 'a.glb', thumbnail: 'thumb.jpg' })
    expect(out[0].product).toEqual({ id: 1, name: 'Sofa', thumbnail: 'thumb.jpg' })
  })

  it('handles missing products/variants', () => {
    expect(toPlaceableItems(undefined)).toEqual([])
    expect(toPlaceableItems([{ id: 1, name: 'X' }])).toEqual([])
  })
})
