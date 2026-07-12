import { describe, it, expect } from 'vitest'
import { visibleWalls } from './roomHelpers'

// R3F meshes aren't assertable via RTL DOM, so the show/hide decision is pulled
// out into a pure helper and tested directly; Room.jsx just reads its result.
describe('visibleWalls', () => {
  it('phản ánh cờ walls khi truyền đủ', () => {
    expect(visibleWalls({ back: true, left: false, right: true })).toEqual({
      back: true,
      left: false,
      right: true,
    })
  })

  it('mặc định true cho mọi mặt khi walls là undefined', () => {
    expect(visibleWalls(undefined)).toEqual({ back: true, left: true, right: true })
  })

  it('mặc định true cho mặt bị thiếu khi walls chỉ định một phần', () => {
    expect(visibleWalls({ left: false })).toEqual({ back: true, left: false, right: true })
  })
})
