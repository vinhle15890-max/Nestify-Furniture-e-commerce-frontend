import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from './apiClient'
import { useAuthStore } from '../store/authStore'
import { ApiError } from './errors'

describe('apiClient', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    useAuthStore.setState({ token: null, user: null })
  })

  afterEach(() => {
    mock.restore()
  })

  it('attaches an Authorization header when a token is present', async () => {
    useAuthStore.setState({ token: 'abc123' })
    mock.onGet('/account').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer abc123')
      return [200, { data: { id: 1 } }]
    })

    const result = await apiClient.get('/account')
    expect(result).toEqual({ data: { id: 1 } })
  })

  it('omits the Authorization header when there is no token', async () => {
    mock.onGet('/categories').reply((config) => {
      expect(config.headers.Authorization).toBeUndefined()
      return [200, { data: [] }]
    })

    await apiClient.get('/categories')
  })

  it('normalizes a BE error envelope into an ApiError', async () => {
    mock.onPost('/cart/items').reply(409, {
      error: { code: 'INSUFFICIENT_STOCK', message: 'Không đủ hàng', details: { available: 2 } },
    })

    await expect(apiClient.post('/cart/items')).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      message: 'Không đủ hàng',
      details: { available: 2 },
      status: 409,
    })
  })

  it('clears auth on 401 for non-/auth/* routes', async () => {
    useAuthStore.setState({ token: 'abc123', user: { id: 1 } })
    mock.onGet('/orders').reply(401, {
      error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' },
    })

    await expect(apiClient.get('/orders')).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('does not clear auth on 401 from /auth/* routes', async () => {
    useAuthStore.setState({ token: 'abc123', user: { id: 1 } })
    mock.onPost('/auth/login').reply(401, {
      error: { code: 'UNAUTHENTICATED', message: 'Email hoặc mật khẩu không đúng.' },
    })

    await expect(apiClient.post('/auth/login')).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().token).toBe('abc123')
  })
})
