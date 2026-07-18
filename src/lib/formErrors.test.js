import { describe, it, expect, vi } from 'vitest'
import { applyServerErrors, formLevelMessage, NETWORK_ERROR_MESSAGE, focusFirstError } from './formErrors'
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

describe('formLevelMessage', () => {
  it('returns the mapped message for a known code in codeMap', () => {
    const error = new ApiError('RESET_FAILED', 'reset failed raw', null, 422)

    expect(formLevelMessage(error, { RESET_FAILED: 'Không thể đặt lại mật khẩu, vui lòng thử lại.' })).toBe(
      'Không thể đặt lại mật khẩu, vui lòng thử lại.',
    )
  })

  it('returns the friendly network message for NETWORK_ERROR regardless of message', () => {
    const error = new ApiError('NETWORK_ERROR', 'Network Error', null, undefined)

    expect(formLevelMessage(error)).toBe(NETWORK_ERROR_MESSAGE)
  })

  it('returns the backend message (Vietnamese, user-facing) for an unmapped non-network code', () => {
    const error = new ApiError('FORBIDDEN', 'Bạn chỉ được đánh giá sản phẩm đã nhận hàng.', null, 403)

    expect(formLevelMessage(error)).toBe('Bạn chỉ được đánh giá sản phẩm đã nhận hàng.')
  })
})

describe('focusFirstError', () => {
  it('focuses the first aria-invalid control', () => {
    const container = document.createElement('form')
    container.innerHTML = `
      <input id="ok" />
      <input id="bad" aria-invalid="true" />
      <input id="bad2" aria-invalid="true" />
    `
    document.body.appendChild(container)

    const focused = focusFirstError(container)

    expect(focused).toBe(container.querySelector('#bad'))
    expect(document.activeElement).toBe(container.querySelector('#bad'))
    document.body.removeChild(container)
  })

  it('falls back to the first role="alert" when no field is invalid', () => {
    const container = document.createElement('form')
    container.innerHTML = `
      <input id="ok" />
      <p role="alert" tabIndex="-1">form-level error</p>
    `
    document.body.appendChild(container)

    const focused = focusFirstError(container)

    expect(focused).toBe(container.querySelector('[role="alert"]'))
    expect(document.activeElement).toBe(container.querySelector('[role="alert"]'))
    document.body.removeChild(container)
  })

  it('returns null when there is nothing to focus', () => {
    const container = document.createElement('form')
    container.innerHTML = '<input id="ok" />'
    document.body.appendChild(container)

    expect(focusFirstError(container)).toBeNull()
    document.body.removeChild(container)
  })
})
