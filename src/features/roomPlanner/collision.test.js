import { describe, it, expect } from 'vitest'
import { rotatedHalfExtents, itemRect, overlaps, findOverlaps, clampRectToRoom, snapToWalls, WALL_SNAP_THRESHOLD } from './collision'

const item = (over) => ({
  localId: 1,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  footprint: { x: 2, y: 1, z: 1 },
  ...over,
})

describe('rotatedHalfExtents', () => {
  it('không xoay → nửa footprint*scale', () => {
    expect(rotatedHalfExtents({ x: 2, y: 1, z: 4 }, { x: 1, y: 1, z: 1 }, 0)).toEqual({ hx: 1, hz: 2 })
  })
  it('xoay 90° → tráo trục x/z', () => {
    const r = rotatedHalfExtents({ x: 2, y: 1, z: 4 }, { x: 1, y: 1, z: 1 }, Math.PI / 2)
    expect(r.hx).toBeCloseTo(2)
    expect(r.hz).toBeCloseTo(1)
  })
  it('tính cả scale', () => {
    expect(rotatedHalfExtents({ x: 2, y: 1, z: 2 }, { x: 2, y: 1, z: 1 }, 0)).toEqual({ hx: 2, hz: 1 })
  })
})

describe('overlaps (SAT OBB)', () => {
  it('hai hộp chồng nhau → true', () => {
    expect(overlaps(itemRect(item()), itemRect(item({ localId: 2, position: { x: 1, y: 0, z: 0 } })))).toBe(true)
  })
  it('rời hẳn → false', () => {
    expect(overlaps(itemRect(item()), itemRect(item({ localId: 2, position: { x: 5, y: 0, z: 0 } })))).toBe(false)
  })
  it('chỉ chạm mép → false', () => {
    expect(overlaps(itemRect(item()), itemRect(item({ localId: 2, position: { x: 2, y: 0, z: 0 } })))).toBe(false)
  })
  it('hai OBB xoay 45° cài nhau → true', () => {
    const a = itemRect(item({ footprint: { x: 2, y: 1, z: 2 }, rotation: { x: 0, y: Math.PI / 4, z: 0 } }))
    const b = itemRect(item({ localId: 2, footprint: { x: 2, y: 1, z: 2 }, position: { x: 1.2, y: 0, z: 0 } }))
    expect(overlaps(a, b)).toBe(true)
  })
})

describe('findOverlaps', () => {
  it('hai món đè → cả hai localId trong Set', () => {
    const set = findOverlaps([item({ localId: 1 }), item({ localId: 2, position: { x: 1, y: 0, z: 0 } })])
    expect(set.has(1)).toBe(true)
    expect(set.has(2)).toBe(true)
  })
  it('món phẳng (< 0.1m) bị loại — thảm dưới bàn không báo', () => {
    const rug = item({ localId: 9, footprint: { x: 3, y: 0.02, z: 3 } })
    const table = item({ localId: 10 })
    expect(findOverlaps([rug, table]).size).toBe(0)
  })
  it('món rời không vào Set', () => {
    const set = findOverlaps([item({ localId: 1 }), item({ localId: 2, position: { x: 9, y: 0, z: 0 } })])
    expect(set.size).toBe(0)
  })
})

describe('clampRectToRoom', () => {
  const room = { width: 4, depth: 4, height: 3 }
  it('món vừa → kẹp cạnh (không xuyên tường)', () => {
    expect(clampRectToRoom({ x: 5, y: 0, z: 0 }, room, { hx: 1, hz: 1 })).toEqual({ x: 1, y: 0, z: 0 })
  })
  it('món to hơn phòng trên trục x → x về giữa (0), z vẫn kẹp cạnh', () => {
    expect(clampRectToRoom({ x: 5, y: 0, z: 5 }, room, { hx: 3, hz: 1 })).toEqual({ x: 0, y: 0, z: 1 })
  })
})

describe('snapToWalls', () => {
  const room = { width: 4, depth: 4, height: 3 }
  const he = { hx: 0.5, hz: 0.5 } // món 1×1 → flush ±1.5
  it('cạnh gần tường (< ngưỡng) → hút flush', () => {
    expect(snapToWalls({ x: 1.4, y: 0, z: 0 }, room, he, WALL_SNAP_THRESHOLD).x).toBeCloseTo(1.5)
  })
  it('nam châm tầm rộng: thả cách tường 0.4m vẫn hút flush', () => {
    // flush x = 1.5; đặt ở 1.1 → khe 0.4m < 0.5 → hút về 1.5 (cú nhảy thấy được)
    expect(snapToWalls({ x: 1.1, y: 0, z: 0 }, room, he, WALL_SNAP_THRESHOLD).x).toBeCloseTo(1.5)
  })
  it('xa tường (> ngưỡng) → giữ nguyên', () => {
    expect(snapToWalls({ x: 0.5, y: 0, z: 0 }, room, he, WALL_SNAP_THRESHOLD).x).toBeCloseTo(0.5)
  })
  it('hai trục độc lập, cả tường âm', () => {
    const r = snapToWalls({ x: 1.45, y: 0, z: -1.42 }, room, he, WALL_SNAP_THRESHOLD)
    expect(r.x).toBeCloseTo(1.5)
    expect(r.z).toBeCloseTo(-1.5)
  })
  it('giữa phòng không hút', () => {
    expect(snapToWalls({ x: 0, y: 0.3, z: 0 }, room, he, WALL_SNAP_THRESHOLD)).toEqual({ x: 0, y: 0.3, z: 0 })
  })
})
