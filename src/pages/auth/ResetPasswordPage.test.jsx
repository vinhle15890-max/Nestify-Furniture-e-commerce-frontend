import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ResetPasswordPage } from './ResetPasswordPage'
import { ApiError } from '../../lib/errors'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderPage(path = '/reset-password?token=abc123&email=bao%40example.com') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an error when the link is missing token/email', () => {
    renderPage('/reset-password')

    expect(screen.getByText('Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu liên kết mới.')).toBeInTheDocument()
  })

  it('shows a validation error when the password confirmation does not match', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'password1234')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'somethingelse123')
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument()
    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })

  it('submits the token/email from the link and shows the success message', async () => {
    authApi.resetPassword.mockResolvedValue({ data: { message: 'Đặt lại mật khẩu thành công.' } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'password1234')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'password1234')
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    expect(await screen.findByText('Đặt lại mật khẩu thành công.')).toBeInTheDocument()
    expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: 'abc123',
      email: 'bao@example.com',
      password: 'password1234',
      password_confirmation: 'password1234',
    })
  })

  it('shows an error message when the token is invalid/expired', async () => {
    authApi.resetPassword.mockRejectedValue(new ApiError('RESET_FAILED', 'Liên kết đã hết hạn.', null, 422))
    renderPage()

    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'password1234')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'password1234')
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    expect(await screen.findByText('Liên kết đã hết hạn.')).toBeInTheDocument()
  })

  it('shows a friendly Vietnamese message and retains the password on a network error', async () => {
    authApi.resetPassword.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()

    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'password1234')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'password1234')
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    expect(await screen.findByText('Đã có lỗi kết nối mạng. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('password1234')
  })

  it('shows pending copy and blocks a duplicate submit while a request is in flight', async () => {
    let resolveRequest
    authApi.resetPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    renderPage()

    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'password1234')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'password1234')
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    const pendingButton = await screen.findByRole('button', { name: 'Đang đặt lại…' })
    expect(pendingButton).toBeDisabled()
    await userEvent.click(pendingButton)
    expect(authApi.resetPassword).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveRequest({ data: { message: 'Đặt lại mật khẩu thành công.' } })
    })
  })
})
