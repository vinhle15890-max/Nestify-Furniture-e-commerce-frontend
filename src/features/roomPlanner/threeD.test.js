import { describe, it, expect } from 'vitest'
import { makeLocalId, clamp, snapToFloor, clampToRoom } from './threeD'

describe('roomPlanner/threeD', () => {
  it('makeLocalId returns increasing unique ids', () => {
    const a = makeLocalId()
    const b = makeLocalId()
    expect(b).toBeGreaterThan(a)
  })

  it('clamp bounds a value', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })

  it('snapToFloor sets y to the resting height', () => {
    expect(snapToFloor({ x: 1, y: 9, z: 2 }, 0.5)).toEqual({ x: 1, y: 0.5, z: 2 })
  })

  it('clampToRoom keeps the centre inside the footprint and preserves y', () => {
    const room = { width: 4, depth: 6, height: 2.8 }
    expect(clampToRoom({ x: 10, y: 0.5, z: -10 }, room)).toEqual({ x: 2, y: 0.5, z: -3 })
    expect(clampToRoom({ x: -10, y: 0.5, z: 9 }, room)).toEqual({ x: -2, y: 0.5, z: 3 })
    expect(clampToRoom({ x: 1, y: 0.5, z: 1 }, room)).toEqual({ x: 1, y: 0.5, z: 1 })
  })
})
