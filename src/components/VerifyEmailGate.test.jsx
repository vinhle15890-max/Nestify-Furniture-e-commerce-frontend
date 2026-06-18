import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VerifyEmailGate } from './VerifyEmailGate'
import * as authApi from '../features/auth/api'

vi.mock('../features/auth/api')

function renderGate() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <VerifyEmailGate />
    </QueryClientProvider>,
  )
}

describe('VerifyEmailGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the verify-email heading and guidance', () => {
    renderGate()

    expect(screen.getByRole('heading', { name: 'Xác thực email' })).toBeInTheDocument()
  })

  it('resends the verification email when the button is clicked', async () => {
    authApi.resendVerificationEmail.mockResolvedValue({ data: { message: 'sent' } })
    renderGate()

    await userEvent.click(screen.getByRole('button', { name: /gửi lại email/i }))

    await waitFor(() => expect(authApi.resendVerificationEmail).toHaveBeenCalledOnce())
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('shows an error message when resending fails', async () => {
    authApi.resendVerificationEmail.mockRejectedValue(new Error('boom'))
    renderGate()

    await userEvent.click(screen.getByRole('button', { name: /gửi lại email/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
