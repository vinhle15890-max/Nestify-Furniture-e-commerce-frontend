import { describe, it, expect } from 'vitest'
import { can, canAny, isStaff } from './roles'

describe('isStaff', () => {
  it('treats super_admin as staff', () => {
    expect(isStaff({ roles: ['super_admin'] })).toBe(true)
  })

  it('treats any non-customer role as staff', () => {
    expect(isStaff({ roles: ['order_staff'] })).toBe(true)
    expect(isStaff({ roles: ['catalog_staff', 'customer'] })).toBe(true)
  })

  it('treats a customer-only user as not staff', () => {
    expect(isStaff({ roles: ['customer'] })).toBe(false)
  })

  it('treats a user with no roles as not staff', () => {
    expect(isStaff({ roles: [] })).toBe(false)
  })

  it('is safe for null/undefined or missing roles', () => {
    expect(isStaff(null)).toBe(false)
    expect(isStaff(undefined)).toBe(false)
    expect(isStaff({})).toBe(false)
  })
})

describe('can', () => {
  it('true khi user có slug', () => {
    expect(can({ permissions: ['manage_orders'] }, 'manage_orders')).toBe(true)
  })
  it('false khi user thiếu slug', () => {
    expect(can({ permissions: ['manage_orders'] }, 'refund')).toBe(false)
  })
  it('false khi user null / thiếu permissions', () => {
    expect(can(null, 'refund')).toBe(false)
    expect(can({}, 'refund')).toBe(false)
    expect(can(undefined, 'refund')).toBe(false)
  })
})

describe('canAny', () => {
  it('true khi có ít nhất 1 slug', () => {
    expect(canAny({ permissions: ['manage_products'] }, ['manage_categories', 'manage_products'])).toBe(true)
  })
  it('false khi không có slug nào', () => {
    expect(canAny({ permissions: ['manage_orders'] }, ['manage_categories', 'manage_products'])).toBe(false)
  })
  it('false khi user null', () => {
    expect(canAny(null, ['manage_products'])).toBe(false)
  })
})

describe('isStaff (không hồi quy)', () => {
  it('true cho role ngoài customer', () => {
    expect(isStaff({ roles: ['order_staff'] })).toBe(true)
  })
  it('false cho customer', () => {
    expect(isStaff({ roles: ['customer'] })).toBe(false)
  })
})
