import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderLoginPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<p>Trang tài khoản</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    vi.clearAllMocks()
  })

  it('shows the Nestify brand logo linking home', async () => {
    renderLoginPage()

    const logo = screen.getByRole('img', { name: 'Nestify' })
    expect(logo).toBeInTheDocument()
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('shows validation errors when submitting an empty form', async () => {
    renderLoginPage()

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('logs in successfully, stores the session, and redirects to /account', async () => {
    authApi.login.mockResolvedValue({
      data: { token: 'abc123', user: { id: 1, name: 'Bao', email: 'bao@example.com', email_verified_at: '2026-01-01' } },
    })
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await waitFor(() => expect(screen.getByText('Trang tài khoản')).toBeInTheDocument())
    expect(useAuthStore.getState().token).toBe('abc123')
    expect(useAuthStore.getState().user).toEqual({ id: 1, name: 'Bao', email: 'bao@example.com', email_verified_at: '2026-01-01' })
  })

  it('shows a distinct message for wrong credentials (401)', async () => {
    authApi.login.mockRejectedValue(new ApiError('UNAUTHENTICATED', 'Unauthorized', null, 401))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByText('Email hoặc mật khẩu không đúng.')).toBeInTheDocument()
  })

  it('shows a distinct message for an inactive account (403 ACCOUNT_INACTIVE)', async () => {
    authApi.login.mockRejectedValue(new ApiError('ACCOUNT_INACTIVE', 'Account archived', null, 403))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByText('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.')).toBeInTheDocument()
  })

  it('maps 422 VALIDATION_FAILED to field errors', async () => {
    authApi.login.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', { fields: { email: ['Email không hợp lệ.'] } }, 422),
    )
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByText('Email không hợp lệ.')).toBeInTheDocument()
  })

  it('shows a friendly Vietnamese message (not raw axios text) on a network error and retains entered values', async () => {
    authApi.login.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByText('Đã có lỗi kết nối mạng. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('bao@example.com')
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('password123')
  })

  it('shows pending copy and blocks a duplicate submit while a login is in flight', async () => {
    let resolveLogin
    authApi.login.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bao@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByRole('button', { name: 'Đang đăng nhập…' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Đang đăng nhập…' }))
    expect(authApi.login).toHaveBeenCalledTimes(1)

    resolveLogin({ data: { token: 't', user: { id: 1, email: 'bao@example.com' } } })
    await waitFor(() => expect(screen.getByText('Trang tài khoản')).toBeInTheDocument())
  })
})
