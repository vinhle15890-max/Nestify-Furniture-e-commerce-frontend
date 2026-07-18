import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminCustomersPage } from './AdminCustomersPage'
import * as usersApi from '../../../features/admin/users/api'

vi.mock('../../../features/admin/users/api')

const customersResponse = {
  data: [
    {
      id: 2,
      name: 'Mai Anh',
      email: 'mai@example.com',
      status: 'active',
      roles: ['customer'],
      role_ids: [9],
      email_verified_at: null,
    },
  ],
  meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 20 } },
}

const rolesResponse = {
  data: [
    { id: 9, name: 'customer', display_name: 'Khách hàng' },
    { id: 11, name: 'order_staff', display_name: 'Nhân viên xử lý đơn' },
  ],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCustomersPage />
    </QueryClientProvider>,
  )
}

describe('AdminCustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usersApi.getUsers.mockResolvedValue(customersResponse)
    usersApi.getRoles.mockResolvedValue(rolesResponse)
    usersApi.assignUserRoles.mockResolvedValue({ data: { ...customersResponse.data[0], roles: ['order_staff'], role_ids: [11] } })
  })

  it('lists customers and filters by type=customer', async () => {
    renderPage()

    expect(await screen.findByText('Mai Anh')).toBeInTheDocument()
    expect(usersApi.getUsers).toHaveBeenCalledWith(expect.objectContaining({ type: 'customer' }))
    expect(screen.getByRole('table', { name: 'Danh sách khách hàng' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xem chi tiết khách hàng Mai Anh' })).toBeInTheDocument()
  })

  it('promotes a customer to employee, dropping the customer role', async () => {
    const user = userEvent.setup()
    renderPage()

    const row = (await screen.findByText('Mai Anh')).closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Xem chi tiết khách hàng Mai Anh' }))

    // Drawer → promote
    await user.click(await screen.findByRole('button', { name: /Thăng thành nhân viên/ }))

    const dialog = await screen.findByRole('dialog')
    const orderStaff = within(dialog).getByRole('checkbox', { name: /Nhân viên xử lý đơn/ })
    expect(orderStaff).not.toBeChecked()

    await user.click(orderStaff)
    await user.click(within(dialog).getByRole('button', { name: 'Thăng nhân viên' }))

    // Customer role (id 9) is dropped; only the selected staff role is sent.
    expect(usersApi.assignUserRoles).toHaveBeenCalledWith(2, [11])
  })

  it('renders a lock action for a customer row', async () => {
    renderPage()
    const row = (await screen.findByText('Mai Anh')).closest('tr')
    expect(within(row).getByRole('button', { name: 'Khóa tài khoản Mai Anh' })).toBeInTheDocument()
  })
})
