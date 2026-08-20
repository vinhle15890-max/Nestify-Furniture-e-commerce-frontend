import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminRolesPage } from './AdminRolesPage'
import * as usersHooks from '../../../features/admin/users/hooks'
import * as rolesHooks from '../../../features/admin/roles/hooks'
import { ApiError } from '../../../lib/errors'
import { usePreviewStore } from '../../../store/previewStore'

vi.mock('../../../features/admin/users/hooks')
vi.mock('../../../features/admin/roles/hooks')

const roles = [
  { id: 1, name: 'super_admin', display_name: 'Super Admin', locked: true, permissions: [], users_count: 1 },
  { id: 2, name: 'order_staff', display_name: 'Nhân viên đơn', locked: false, permissions: ['manage_orders'], users_count: 3 },
]

beforeEach(() => {
  vi.clearAllMocks()
  usePreviewStore.setState({ previewRole: null })
  usersHooks.useRoles.mockReturnValue({ data: { data: roles }, isLoading: false })
  rolesHooks.usePermissions.mockReturnValue({ data: { data: [] }, isLoading: false })
  rolesHooks.useCreateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  rolesHooks.useUpdateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  rolesHooks.useDeleteRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/roles']}>
      <Routes>
        <Route path="/admin/roles" element={<AdminRolesPage />} />
        <Route path="/admin/orders" element={<div>Trang đơn hàng</div>} />
        <Route path="/admin" element={<div>Trang tổng quan</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRolesPage', () => {
  it('liệt kê role + badge Hệ thống cho role locked', () => {
    renderPage()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText('Nhân viên đơn')).toBeInTheDocument()
    expect(screen.getByText('Hệ thống')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Danh sách vai trò' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Người dùng' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument()
  })

  it('mô tả mục đích khi tạo vai trò mới', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Tạo vai trò' }))
    expect(screen.getByText('Đặt tên và chọn các quyền cho vai trò mới.')).toBeInTheDocument()
  })

  it('xoá role đang dùng → toast đọc users_count từ 409', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(
      new ApiError('ROLE_IN_USE', 'Không thể xoá vai trò đang được gán.', { users_count: 3 }, 409),
    )
    rolesHooks.useDeleteRole.mockReturnValue({ mutateAsync, isPending: false })

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xoá vai trò Nhân viên đơn' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(2))
    expect(screen.getByRole('dialog', { name: 'Xoá vai trò' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Còn 3 nhân viên giữ vai trò này')
  })

  it('toggle sang Ma trận hiển thị lưới, toggle về Bảng quay lại danh sách', async () => {
    renderPage()

    // mặc định là Bảng: có cột "Số quyền"
    expect(screen.getByText('Số quyền')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ma trận' }))
    // matrix-specific: ghi chú bypass của super_admin
    expect(screen.getByText(/bypass/i)).toBeInTheDocument()
    // header bảng list biến mất
    expect(screen.queryByText('Số quyền')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Bảng' }))
    expect(screen.getByText('Số quyền')).toBeInTheDocument()
  })

  it('nút Sửa trong ma trận mở RoleFormDialog cho đúng role', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Ma trận' }))
    // order_staff không locked → nút "Sửa vai trò Nhân viên đơn"
    await userEvent.click(screen.getByRole('button', { name: 'Sửa vai trò Nhân viên đơn' }))
    // RoleFormDialog mở ở chế độ sửa (title "Sửa vai trò")
    expect(screen.getByText('Sửa vai trò')).toBeInTheDocument()
  })

  it('nút Xem thử: đặt previewRole + điều hướng tới mục đầu tiên role đó được vào', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xem thử vai trò Nhân viên đơn' }))

    expect(usePreviewStore.getState().previewRole).toEqual(roles[1])
    // order_staff chỉ có manage_orders → mục đầu hợp lệ là /admin/orders
    expect(await screen.findByText('Trang đơn hàng')).toBeInTheDocument()
  })

  it('role customer không có nút Xem thử (không phải vai trò quản trị)', () => {
    usersHooks.useRoles.mockReturnValue({
      data: { data: [...roles, { id: 3, name: 'customer', display_name: 'Khách hàng', locked: true, permissions: [], users_count: 40 }] },
      isLoading: false,
    })
    renderPage()
    expect(screen.getByRole('button', { name: 'Xem thử vai trò Nhân viên đơn' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xem thử vai trò Khách hàng' })).toBeNull()
  })
})
