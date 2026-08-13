import { describe, expect, it } from 'vitest'
import { rankProductsWithJourney } from './rank'

describe('rankProductsWithJourney', () => {
  it('moves explained candidates first without hiding remaining products', () => {
    const products = [{ id: 1 }, { id: 2 }, { id: 3 }]
    expect(rankProductsWithJourney(products, [{ product: { id: 3 } }]).map(({ id }) => id)).toEqual([3, 1, 2])
  })

  it('preserves server order without journey evidence', () => {
    const products = [{ id: 1 }, { id: 2 }]
    expect(rankProductsWithJourney(products, [])).toEqual(products)
  })
})
