import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { VerifyEmailPage } from './VerifyEmailPage'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderPage(path) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    vi.clearAllMocks()
  })

  it('shows an error when the link has no parameters', () => {
    renderPage('/verify-email')

    expect(screen.getByText('Liên kết xác thực không hợp lệ.')).toBeInTheDocument()
    expect(authApi.verifyEmail).not.toHaveBeenCalled()
  })

  it('shows the success message and marks the stored user as verified', async () => {
    useAuthStore.setState({ token: 'abc123', user: { id: 1, name: 'Bao', email_verified_at: null } })
    authApi.verifyEmail.mockResolvedValue({ data: { message: 'Email đã được xác thực.' } })

    renderPage('/verify-email?id=1&expires=1893456000&signature=abc')

    expect(await screen.findByText('Email đã được xác thực.')).toBeInTheDocument()
    expect(authApi.verifyEmail).toHaveBeenCalledWith({ id: '1', expires: '1893456000', signature: 'abc' })
    expect(useAuthStore.getState().user.email_verified_at).toBeTruthy()
  })

  it('shows an error message for an invalid link', async () => {
    authApi.verifyEmail.mockRejectedValue(new ApiError('INVALID_LINK', 'Liên kết không hợp lệ hoặc đã hết hạn.', null, 403))

    renderPage('/verify-email?id=1&expires=1893456000&signature=abc')

    expect(await screen.findByText('Liên kết không hợp lệ hoặc đã hết hạn.')).toBeInTheDocument()
  })
})
