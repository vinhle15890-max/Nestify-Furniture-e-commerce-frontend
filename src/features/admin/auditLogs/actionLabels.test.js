import { describe, it, expect } from 'vitest'
import { AUDIT_ACTION_LABELS, labelForAction } from './actionLabels'

describe('labelForAction', () => {
  it('maps known actions to Vietnamese labels', () => {
    expect(labelForAction('access.denied')).toBe('Truy cập bị chặn (403)')
    expect(labelForAction('role.create')).toBe('Tạo vai trò')
    expect(labelForAction('payment.refund')).toBe('Hoàn tiền')
    expect(labelForAction('user.lock')).toBe('Khoá người dùng')
  })

  it('falls back to the raw slug for unknown actions', () => {
    expect(labelForAction('some.new.action')).toBe('some.new.action')
  })

  it('exposes the label map for building filter options', () => {
    expect(AUDIT_ACTION_LABELS['access.denied']).toBe('Truy cập bị chặn (403)')
  })
})
