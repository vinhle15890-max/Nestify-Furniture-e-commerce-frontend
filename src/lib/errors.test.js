import { describe, it, expect } from 'vitest'
import { ApiError, normalizeError } from './errors'

describe('ApiError', () => {
  it('stores code, message, details, and status', () => {
    const err = new ApiError('INSUFFICIENT_STOCK', 'Không đủ hàng', { variant_id: 1, available: 2 }, 409)
    expect(err.code).toBe('INSUFFICIENT_STOCK')
    expect(err.message).toBe('Không đủ hàng')
    expect(err.details).toEqual({ variant_id: 1, available: 2 })
    expect(err.status).toBe(409)
    expect(err).toBeInstanceOf(Error)
  })

  it('defaults details to null when not provided', () => {
    const err = new ApiError('UNAUTHENTICATED', 'Unauthorized', undefined, 401)
    expect(err.details).toBeNull()
  })
})

describe('normalizeError', () => {
  it('maps a BE error envelope to an ApiError', () => {
    const axiosError = {
      response: {
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Dữ liệu không hợp lệ',
            details: { email: ['required'] },
          },
        },
      },
    }

    const result = normalizeError(axiosError)

    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('VALIDATION_FAILED')
    expect(result.message).toBe('Dữ liệu không hợp lệ')
    expect(result.details).toEqual({ email: ['required'] })
    expect(result.status).toBe(422)
  })

  it('falls back to NETWORK_ERROR when there is no error envelope', () => {
    const axiosError = { message: 'Network Error', response: undefined }

    const result = normalizeError(axiosError)

    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toBe('Network Error')
    expect(result.status).toBeUndefined()
  })
})
