import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AccountPage } from './AccountPage'
import { useAuthStore } from '../../store/authStore'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApi.logout.mockResolvedValue(undefined)
  })

  it('shows the profile fetched from GET /api/auth/me and syncs the auth store', async () => {
    useAuthStore.setState({
      token: 'abc123',
      user: { id: 1, name: 'Bao', email: 'bao@example.com', email_verified_at: null },
    })
    authApi.getMe.mockResolvedValue({
      data: { id: 1, name: 'Bao', email: 'bao@example.com', email_verified_at: '2026-06-01T00:00:00Z' },
    })

    renderPage()

    expect(await screen.findByDisplayValue('Bao')).toBeInTheDocument()
    expect(screen.getByText('bao@example.com')).toBeInTheDocument()
    expect(await screen.findByText('Đã xác thực')).toBeInTheDocument()
    await waitFor(() => expect(useAuthStore.getState().user.email_verified_at).toBe('2026-06-01T00:00:00Z'))
  })

  it('logs out when the logout button is clicked', async () => {
    useAuthStore.setState({
      token: 'abc123',
      user: { id: 1, name: 'Bao', email: 'bao@example.com', email_verified_at: '2026-06-01T00:00:00Z' },
    })
    authApi.getMe.mockResolvedValue({
      data: { id: 1, name: 'Bao', email: 'bao@example.com', email_verified_at: '2026-06-01T00:00:00Z' },
    })

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }))

    await waitFor(() => expect(useAuthStore.getState().token).toBeNull())
  })
})
