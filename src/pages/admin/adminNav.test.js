import { describe, it, expect } from 'vitest'
import { visibleGroups, firstAllowedPath } from './adminNav'

const orderStaff = { permissions: ['view_dashboard', 'manage_orders'] }
const moderator = { permissions: ['view_dashboard', 'moderate_reviews'] }
const superAdmin = {
  permissions: [
    'manage_categories', 'manage_products', 'manage_orders', 'manage_vouchers',
    'manage_users', 'moderate_reviews', 'view_audit', 'view_health', 'view_dashboard', 'refund',
  ],
}

function labels(groups) {
  return groups.flatMap((g) => g.items.map((i) => i.label))
}

describe('visibleGroups', () => {
  it('order_staff chỉ thấy Tổng quan + Đơn hàng', () => {
    expect(labels(visibleGroups(orderStaff))).toEqual(['Tổng quan', 'Đơn hàng'])
  })
  it('moderator chỉ thấy Tổng quan + Đánh giá', () => {
    expect(labels(visibleGroups(moderator))).toEqual(['Tổng quan', 'Đánh giá'])
  })
  it('super_admin thấy mọi mục', () => {
    expect(labels(visibleGroups(superAdmin))).toContain('Voucher')
    expect(labels(visibleGroups(superAdmin))).toContain('Nhật ký')
    expect(labels(visibleGroups(superAdmin))).toContain('Thư viện ảnh')
  })
  it('loại bỏ group rỗng (không có tiêu đề mồ côi)', () => {
    const groups = visibleGroups(orderStaff)
    expect(groups.every((g) => g.items.length > 0)).toBe(true)
    expect(groups.some((g) => g.title === 'Nhân sự')).toBe(false)
  })
  it('user không quyền admin nào → rỗng', () => {
    expect(visibleGroups({ permissions: [] })).toEqual([])
  })
})

describe('firstAllowedPath', () => {
  it('order_staff → /admin (Tổng quan trước tiên)', () => {
    expect(firstAllowedPath(orderStaff)).toBe('/admin')
  })
  it('user chỉ có manage_orders (không dashboard) → /admin/orders', () => {
    expect(firstAllowedPath({ permissions: ['manage_orders'] })).toBe('/admin/orders')
  })
  it('không có quyền → null', () => {
    expect(firstAllowedPath({ permissions: [] })).toBe(null)
  })
})
