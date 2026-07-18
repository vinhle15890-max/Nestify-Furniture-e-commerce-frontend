import { describe, it, expect } from 'vitest'
import { baseOffset } from './threeD'

describe('baseOffset', () => {
  it('lifts a model whose base is below local origin', () => {
    // A box spanning y ∈ [-0.4, 0.4] must rise by 0.4 to rest its base at 0.
    expect(baseOffset({ min: { y: -0.4 } })).toBeCloseTo(0.4)
  })

  it('lowers a model whose base floats above origin', () => {
    expect(baseOffset({ min: { y: 0.25 } })).toBeCloseTo(-0.25)
  })

  it('returns 0 for a missing or degenerate box', () => {
    expect(baseOffset(undefined)).toBe(0)
    expect(baseOffset({ min: { y: NaN } })).toBe(0)
  })
})
