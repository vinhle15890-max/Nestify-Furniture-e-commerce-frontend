import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProfileForm } from './ProfileForm'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')

function renderForm(user = { id: 1, name: 'Bao', email: 'bao@example.com' }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileForm user={user} />
    </QueryClientProvider>,
  )
}

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits the updated name to updateProfile', async () => {
    authApi.updateProfile.mockResolvedValue({ data: { id: 1, name: 'Bao Updated', email: 'bao@example.com' } })

    renderForm()

    const nameInput = screen.getByLabelText('Họ tên')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Bao Updated')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() =>
      expect(authApi.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bao Updated' })),
    )
    expect(await screen.findByText('Đã cập nhật thông tin tài khoản.')).toBeInTheDocument()
  })

  it('requires the current password when changing password', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'new-password-123')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'new-password-123')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(await screen.findByText('Vui lòng nhập mật khẩu hiện tại.')).toBeInTheDocument()
    expect(authApi.updateProfile).not.toHaveBeenCalled()
  })
})
