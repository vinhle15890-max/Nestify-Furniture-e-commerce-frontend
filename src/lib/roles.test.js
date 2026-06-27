import { describe, it, expect } from 'vitest'
import { isStaff } from './roles'

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
