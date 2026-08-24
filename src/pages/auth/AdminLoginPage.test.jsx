import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminLoginPage } from './AdminLoginPage'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin/login']}><Routes>
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route path="/admin" element={<p>Admin home</p>} />
  </Routes></MemoryRouter></QueryClientProvider>)
}

describe('AdminLoginPage', () => {
  beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ token: null, user: null }) })

  it('uses the staff endpoint and redirects a successful staff login to /admin', async () => {
    authApi.adminLogin.mockResolvedValue({ data: { token: 'staff-token', user: { id: 2, roles: ['order_staff'] } } })
    renderPage()
    await userEvent.type(screen.getByLabelText('Email nhân viên'), 'staff@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Vào trang quản trị' }))
    await waitFor(() => expect(screen.getByText('Admin home')).toBeInTheDocument())
    expect(authApi.adminLogin).toHaveBeenCalledWith({ email: 'staff@example.com', password: 'password123' })
  })

  it('shows one generic error for invalid credentials or access intent', async () => {
    authApi.adminLogin.mockRejectedValue(new ApiError('UNAUTHENTICATED', 'invalid', null, 401))
    renderPage()
    await userEvent.type(screen.getByLabelText('Email nhân viên'), 'customer@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Vào trang quản trị' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email, mật khẩu hoặc quyền truy cập không hợp lệ.')
  })
})
