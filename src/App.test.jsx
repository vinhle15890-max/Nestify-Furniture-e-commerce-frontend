import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './app/router'
import { Providers } from './app/providers'
import { useAuthStore } from './store/authStore'

function renderAt(initialPath, user = null) {
  if (user) {
    useAuthStore.setState({ token: 'abc', user })
  }
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
}

describe('App routes', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
  })

  it('renders the home page at "/"', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Nestify', level: 1 })).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown route', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
  })

  it('redirects /account to /login when not authenticated', () => {
    renderAt('/account')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('renders /account when authenticated', () => {
    renderAt('/account', { id: 1, name: 'Bao', roles: ['customer'], email_verified_at: '2026-01-01T00:00:00Z' })
    expect(screen.getByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument()
  })

  it('redirects /admin to home for a non-admin user', () => {
    renderAt('/admin', { id: 1, name: 'Bao', roles: ['customer'] })
    expect(screen.getByRole('heading', { name: 'Nestify', level: 1 })).toBeInTheDocument()
  })

  it('renders the admin dashboard for a super_admin user', () => {
    renderAt('/admin', { id: 1, name: 'Admin', roles: ['super_admin'] })
    expect(screen.getByRole('heading', { name: 'Quản trị' })).toBeInTheDocument()
  })
})
