import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, adminToken: null, adminUser: null })
    localStorage.clear()
  })

  it('starts with no token and no user', () => {
    const { token, user } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(user).toBeNull()
  })

  it('login sets token and user', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao', roles: ['customer'] })

    const { token, user } = useAuthStore.getState()
    expect(token).toBe('abc123')
    expect(user).toEqual({ id: 1, name: 'Bao', roles: ['customer'] })
  })

  it('logout clears token and user', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao' })
    useAuthStore.getState().logout()

    const { token, user } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(user).toBeNull()
  })

  it('setUser updates the user without touching the token', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao', roles: [] })
    useAuthStore.getState().setUser({ id: 1, name: 'Bao', roles: ['customer'] })

    const { token, user } = useAuthStore.getState()
    expect(token).toBe('abc123')
    expect(user.roles).toEqual(['customer'])
  })

  it('persists state to localStorage under "nestify-auth"', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao' })

    const stored = JSON.parse(localStorage.getItem('nestify-auth'))
    expect(stored.state.token).toBe('abc123')
    expect(stored.state.user).toEqual({ id: 1, name: 'Bao' })
  })

  it('keeps customer and admin sessions independently in the same browser', () => {
    useAuthStore.getState().login('customer-token', { id: 1, roles: ['customer'] })
    useAuthStore.getState().adminLogin('admin-token', { id: 2, roles: ['super_admin'] })

    expect(useAuthStore.getState()).toMatchObject({
      token: 'customer-token',
      user: { id: 1 },
      adminToken: 'admin-token',
      adminUser: { id: 2 },
    })

    useAuthStore.getState().adminLogout()
    expect(useAuthStore.getState().token).toBe('customer-token')
    expect(useAuthStore.getState().adminToken).toBeNull()
  })
})
