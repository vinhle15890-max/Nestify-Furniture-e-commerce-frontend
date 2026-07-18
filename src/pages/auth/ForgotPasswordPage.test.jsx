import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ApiError } from '../../lib/errors'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a validation error when submitting without an email', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))

    expect(await screen.findByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(authApi.forgotPassword).not.toHaveBeenCalled()
  })

  it('shows the success message returned by the API', async () => {
    authApi.forgotPassword.mockResolvedValue({ data: { message: 'Đã gửi email đặt lại mật khẩu.' } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))

    expect(await screen.findByText('Đã gửi email đặt lại mật khẩu.')).toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    authApi.forgotPassword.mockRejectedValue(new ApiError('RESET_FAILED', 'Email không tồn tại.', null, 422))
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'unknown@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))

    expect(await screen.findByText('Email không tồn tại.')).toBeInTheDocument()
  })

  it('shows a friendly Vietnamese message and retains the email on a network error', async () => {
    authApi.forgotPassword.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))

    expect(await screen.findByText('Đã có lỗi kết nối mạng. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('bao@example.com')
  })

  it('shows pending copy and blocks a duplicate submit while a request is in flight', async () => {
    let resolveRequest
    authApi.forgotPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))

    const pendingButton = await screen.findByRole('button', { name: 'Đang gửi…' })
    expect(pendingButton).toBeDisabled()
    await userEvent.click(pendingButton)
    expect(authApi.forgotPassword).toHaveBeenCalledTimes(1)

    resolveRequest({ data: { message: 'Đã gửi email đặt lại mật khẩu.' } })
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })
})
