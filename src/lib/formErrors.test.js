import { describe, it, expect, vi } from 'vitest'
import { applyServerErrors } from './formErrors'
import { ApiError } from './errors'

describe('applyServerErrors', () => {
  it('sets a field error for each entry in details.fields and returns true', () => {
    const setError = vi.fn()
    const error = new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', {
      fields: { email: ['Email đã được sử dụng.'], password: ['Mật khẩu quá ngắn.'] },
    })

    const applied = applyServerErrors(error, setError)

    expect(applied).toBe(true)
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Email đã được sử dụng.' })
    expect(setError).toHaveBeenCalledWith('password', { type: 'server', message: 'Mật khẩu quá ngắn.' })
  })

  it('returns false and does not call setError for non-validation errors', () => {
    const setError = vi.fn()
    const error = new ApiError('UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng.', null)

    const applied = applyServerErrors(error, setError)

    expect(applied).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it('returns false when details.fields is missing', () => {
    const setError = vi.fn()
    const error = new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', null)

    expect(applyServerErrors(error, setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
