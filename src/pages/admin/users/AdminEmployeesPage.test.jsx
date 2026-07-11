import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminEmployeesPage } from './AdminEmployeesPage'
import * as usersApi from '../../../features/admin/users/api'

vi.mock('../../../features/admin/users/api')

const staffResponse = {
  data: [
    {
      id: 1,
      name: 'Bao Le',
      email: 'bao@example.com',
      status: 'active',
      roles: ['admin'],
      role_ids: [10],
      email_verified_at: '2026-01-01T00:00:00+00:00',
    },
  ],
  meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 20 } },
}

const rolesResponse = {
  data: [
    { id: 9, name: 'customer', display_name: 'Khách hàng' },
    { id: 10, name: 'admin', display_name: 'Quản trị viên' },
    { id: 11, name: 'order_staff', display_name: 'Nhân viên xử lý đơn' },
  ],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminEmployeesPage />
    </QueryClientProvider>,
  )
}

describe('AdminEmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usersApi.getUsers.mockResolvedValue(staffResponse)
    usersApi.getRoles.mockResolvedValue(rolesResponse)
    usersApi.assignUserRoles.mockResolvedValue({ data: { ...staffResponse.data[0], roles: ['admin', 'order_staff'], role_ids: [10, 11] } })
  })

  it('lists staff with localized role badges and filters by type=staff', async () => {
    renderPage()

    const row = (await screen.findByText('Bao Le')).closest('tr')
    // Role badge (localized) shows inside the row, distinct from the filter dropdown.
    expect(within(row).getByText('Quản trị viên')).toBeInTheDocument()
    expect(usersApi.getUsers).toHaveBeenCalledWith(expect.objectContaining({ type: 'staff' }))
    expect(screen.getByRole('table', { name: 'Danh sách nhân viên' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Phân quyền cho Bao Le' })).toBeInTheDocument()
  })

  it('assigns roles, hiding the customer role and keeping existing staff roles', async () => {
    const user = userEvent.setup()
    renderPage()

    const row = (await screen.findByText('Bao Le')).closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Phân quyền cho Bao Le' }))

    const dialog = await screen.findByRole('dialog')
    // customer is never an assignable option
    expect(within(dialog).queryByRole('checkbox', { name: /Khách hàng/ })).toBeNull()
    expect(within(dialog).getByRole('checkbox', { name: /Quản trị viên/ })).toBeChecked()

    await user.click(within(dialog).getByRole('checkbox', { name: /Nhân viên xử lý đơn/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }))

    expect(usersApi.assignUserRoles).toHaveBeenCalledWith(1, [10, 11])
  })

  it('opens the add-employee dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Bao Le')
    await user.click(screen.getByRole('button', { name: /Thêm nhân viên/ }))

    expect(await screen.findByText(/Tìm một người dùng hiện có/)).toBeInTheDocument()
  })

  it('renders a lock action for a staff row', async () => {
    renderPage()
    const row = (await screen.findByText('Bao Le')).closest('tr')
    expect(within(row).getByRole('button', { name: 'Khóa tài khoản Bao Le' })).toBeInTheDocument()
  })

  it('shows "Đã khóa" badge for an archived staff user', async () => {
    usersApi.getUsers.mockResolvedValue({
      ...staffResponse,
      data: [{ ...staffResponse.data[0], status: 'archived' }],
    })
    renderPage()
    const row = (await screen.findByText('Bao Le')).closest('tr')
    expect(within(row).getByText('Đã khóa')).toBeInTheDocument()
  })
})
