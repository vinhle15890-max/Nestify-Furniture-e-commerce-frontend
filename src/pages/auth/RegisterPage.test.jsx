import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RegisterPage } from './RegisterPage'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderRegisterPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<p>Trang tài khoản</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillForm({ name = 'Bao', email = 'bao@example.com', password = 'password1234', confirmation = password }) {
  await userEvent.type(screen.getByLabelText('Họ tên'), name)
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Mật khẩu'), password)
  await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu'), confirmation)
}

describe('RegisterPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    vi.clearAllMocks()
  })

  it('shows validation errors when submitting an empty form', async () => {
    renderRegisterPage()

    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    expect(await screen.findByText('Vui lòng nhập họ tên.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('shows an error when the password confirmation does not match', async () => {
    renderRegisterPage()

    await fillForm({ confirmation: 'somethingelse123' })
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('registers successfully, stores the session, and redirects to /account', async () => {
    authApi.register.mockResolvedValue({
      data: { token: 'abc123', user: { id: 1, name: 'Bao', email: 'bao@example.com', email_verified_at: null } },
    })
    renderRegisterPage()

    await fillForm({})
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    await waitFor(() => expect(screen.getByText('Trang tài khoản')).toBeInTheDocument())
    expect(useAuthStore.getState().token).toBe('abc123')
  })

  it('maps a 422 duplicate-email error to a field error', async () => {
    authApi.register.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', { fields: { email: ['Email đã được sử dụng.'] } }, 422),
    )
    renderRegisterPage()

    await fillForm({})
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    expect(await screen.findByText('Email đã được sử dụng.')).toBeInTheDocument()
  })
})
