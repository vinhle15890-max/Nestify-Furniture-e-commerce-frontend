import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleFormDialog } from './RoleFormDialog'
import * as hooks from '../../../features/admin/roles/hooks'
import { ApiError } from '../../../lib/errors'

vi.mock('../../../features/admin/roles/hooks')

const permissions = [
  { slug: 'manage_orders', display_name: 'Manage Orders' },
  { slug: 'view_dashboard', display_name: 'View Admin Dashboard' },
]

beforeEach(() => {
  vi.clearAllMocks()
  hooks.usePermissions.mockReturnValue({ data: { data: permissions }, isLoading: false, isError: false })
  hooks.useUpdateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
})

describe('RoleFormDialog', () => {
  it('tạo role mới gửi display_name + permissions đã tick', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    hooks.useCreateRole.mockReturnValue({ mutateAsync, isPending: false })

    render(<RoleFormDialog open role={null} onOpenChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('Tên hiển thị'), 'Nhân viên kho')
    await userEvent.click(screen.getByLabelText('Quản lý đơn hàng'))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo vai trò' }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ display_name: 'Nhân viên kho', permissions: ['manage_orders'] }),
    )
  })

  it('role locked → chỉ xem, không có nút lưu', () => {
    hooks.useCreateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    render(
      <RoleFormDialog
        open
        role={{ id: 1, name: 'super_admin', display_name: 'Super Admin', locked: true, permissions: ['manage_orders'] }}
        onOpenChange={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /Lưu|Tạo vai trò/ })).toBeNull()
    expect(screen.getByText(/Toàn quyền|hệ thống/i)).toBeInTheDocument()
  })

  it('shows a retry action instead of an empty permission list when loading permissions fails', async () => {
    const refetch = vi.fn()
    hooks.usePermissions.mockReturnValue({ data: undefined, isLoading: false, isError: true, isFetching: false, refetch })
    hooks.useCreateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

    render(<RoleFormDialog open role={null} onOpenChange={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải danh sách quyền')
    expect(screen.queryByRole('button', { name: 'Tạo vai trò' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('maps duplicate-name validation to the name field and focuses it', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', { fields: { display_name: ['Tên vai trò đã tồn tại.'] } }, 422),
    )
    hooks.useCreateRole.mockReturnValue({ mutateAsync, isPending: false })
    render(<RoleFormDialog open role={null} onOpenChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('Tên hiển thị'), 'Nhân viên kho')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo vai trò' }))

    expect(await screen.findByText('Tên vai trò đã tồn tại.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tên hiển thị')).toHaveFocus()
    expect(screen.getByLabelText('Tên hiển thị')).toHaveAttribute('aria-invalid', 'true')
  })
})
