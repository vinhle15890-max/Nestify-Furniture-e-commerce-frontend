import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RolePermissionMatrix } from './RolePermissionMatrix'
import * as rolesHooks from '../../../features/admin/roles/hooks'

vi.mock('../../../features/admin/roles/hooks')

const permissions = [
  { slug: 'manage_orders', display_name: 'Manage Orders' },
  { slug: 'view_dashboard', display_name: 'View Admin Dashboard' },
]

const roles = [
  { id: 1, name: 'super_admin', display_name: 'Super Admin', locked: true, permissions: ['manage_orders', 'view_dashboard'] },
  { id: 2, name: 'order_staff', display_name: 'Nhân viên đơn', locked: false, permissions: ['manage_orders'] },
  { id: 3, name: 'customer', display_name: 'Khách hàng', locked: true, permissions: [] },
]

beforeEach(() => {
  vi.clearAllMocks()
  rolesHooks.usePermissions.mockReturnValue({ data: { data: permissions }, isLoading: false })
})

describe('RolePermissionMatrix', () => {
  it('render cột theo permission + ẩn customer + ghi chú bypass cho super_admin', () => {
    render(<RolePermissionMatrix roles={roles} onEdit={() => {}} />)

    expect(screen.getByText('Quản lý đơn hàng')).toBeInTheDocument()
    expect(screen.getByText('Xem tổng quan')).toBeInTheDocument()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText('Nhân viên đơn')).toBeInTheDocument()
    expect(screen.queryByText('Khách hàng')).toBeNull()
    expect(screen.getByText(/bypass/i)).toBeInTheDocument()
  })

  it('ô đánh dấu đúng quyền của từng role', () => {
    render(<RolePermissionMatrix roles={roles} onEdit={() => {}} />)

    expect(
      screen.getByRole('img', { name: 'Nhân viên đơn có quyền Quản lý đơn hàng' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Nhân viên đơn có quyền Xem tổng quan' }),
    ).toBeNull()
  })

  it('click Sửa gọi onEdit với đúng role', async () => {
    const onEdit = vi.fn()
    render(<RolePermissionMatrix roles={roles} onEdit={onEdit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sửa vai trò Nhân viên đơn' }))
    expect(onEdit).toHaveBeenCalledWith(roles[1])
  })
})
