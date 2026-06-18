import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '../store/authStore'

function renderProtected() {
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [{ path: '/account', element: <p>Trang tài khoản</p> }],
      },
      { path: '/login', element: <p>Trang đăng nhập</p> },
    ],
    { initialEntries: ['/account'] },
  )

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
  })

  it('redirects to /login when there is no token', () => {
    renderProtected()

    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument()
  })

  it('shows a verify-email gate when the user has not verified their email', () => {
    useAuthStore.setState({ token: 'abc123', user: { id: 1, email_verified_at: null } })

    renderProtected()

    expect(screen.getByRole('heading', { name: 'Xác thực email' })).toBeInTheDocument()
    expect(screen.queryByText('Trang tài khoản')).not.toBeInTheDocument()
  })

  it('renders the outlet when the user is authenticated and verified', () => {
    useAuthStore.setState({ token: 'abc123', user: { id: 1, email_verified_at: '2026-06-01T00:00:00Z' } })

    renderProtected()

    expect(screen.getByText('Trang tài khoản')).toBeInTheDocument()
  })
})
