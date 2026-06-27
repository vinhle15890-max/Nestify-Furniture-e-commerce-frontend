import { describe, it, expect } from 'vitest'
import { findCategoryPath } from './categoryPath'

const tree = [
  {
    id: 1, name: 'Phòng khách', slug: 'phong-khach',
    children: [
      { id: 2, name: 'Sofa', slug: 'sofa', children: [{ id: 3, name: 'Sofa góc', slug: 'sofa-goc' }] },
      { id: 4, name: 'Bàn trà', slug: 'ban-tra' },
    ],
  },
  { id: 5, name: 'Phòng ngủ', slug: 'phong-ngu' },
]

describe('findCategoryPath', () => {
  it('trả chuỗi gốc → lá (gồm cả node đích)', () => {
    expect(findCategoryPath(tree, 'sofa-goc')).toEqual([
      { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
      { id: 2, name: 'Sofa', slug: 'sofa' },
      { id: 3, name: 'Sofa góc', slug: 'sofa-goc' },
    ])
  })

  it('node cấp 1 trả về chỉ chính nó', () => {
    expect(findCategoryPath(tree, 'phong-ngu')).toEqual([{ id: 5, name: 'Phòng ngủ', slug: 'phong-ngu' }])
  })

  it('slug không tồn tại → []', () => {
    expect(findCategoryPath(tree, 'khong-co')).toEqual([])
  })

  it('tree rỗng / không hợp lệ → []', () => {
    expect(findCategoryPath([], 'sofa')).toEqual([])
    expect(findCategoryPath(undefined, 'sofa')).toEqual([])
  })
})
