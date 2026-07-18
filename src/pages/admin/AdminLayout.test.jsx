import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminLayout } from './AdminLayout'
import { useAuthStore } from '../../store/authStore'
import { usePreviewStore } from '../../store/previewStore'

const { mockUseMe } = vi.hoisted(() => ({ mockUseMe: vi.fn(() => ({ data: undefined })) }))

vi.mock('../../features/auth/hooks', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
  useMe: mockUseMe,
}))

function renderLayout(user) {
  useAuthStore.setState({ token: 't', user })
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminLayout />
    </MemoryRouter>,
  )
}

describe('AdminLayout sidebar gating', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    usePreviewStore.setState({ previewRole: null })
    mockUseMe.mockReturnValue({ data: undefined })
  })

  it('order_staff không thấy Voucher / Nhân viên', () => {
    renderLayout({ permissions: ['view_dashboard', 'manage_orders'] })
    expect(screen.getAllByText('Đơn hàng').length).toBeGreaterThan(0)
    expect(screen.queryByText('Voucher')).toBeNull()
    expect(screen.queryByText('Nhân viên')).toBeNull()
  })

  it('super_admin thấy Voucher và Nhật ký', () => {
    renderLayout({
      permissions: [
        'manage_categories', 'manage_products', 'manage_orders', 'manage_vouchers',
        'manage_users', 'moderate_reviews', 'view_audit', 'view_health', 'view_dashboard', 'refund',
      ],
    })
    expect(screen.getAllByText('Voucher').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nhật ký').length).toBeGreaterThan(0)
  })

  it('đồng bộ permissions mới từ /auth/me vào store khi vào admin (phiên cũ)', () => {
    mockUseMe.mockReturnValue({ data: { data: { permissions: ['view_dashboard', 'manage_vouchers'] } } })
    renderLayout({ permissions: [] })
    expect(screen.getAllByText('Voucher').length).toBeGreaterThan(0)
  })

  it('không preview → không có banner "Xem thử"', () => {
    renderLayout({ permissions: ['view_dashboard', 'manage_orders'] })
    expect(screen.queryByText(/Đang xem thử giao diện/)).toBeNull()
  })

  it('đang preview → banner hiện tên vai trò + sidebar lọc theo quyền của role preview, không phải user thật', () => {
    usePreviewStore.setState({
      previewRole: { name: 'order_staff', display_name: 'Nhân viên đơn', permissions: ['view_dashboard', 'manage_orders'] },
    })
    // User thật là super_admin (đủ mọi quyền) — sidebar phải theo role preview, không phải user thật.
    renderLayout({
      permissions: [
        'manage_categories', 'manage_products', 'manage_orders', 'manage_vouchers',
        'manage_users', 'moderate_reviews', 'view_audit', 'view_health', 'view_dashboard', 'refund',
      ],
    })
    expect(screen.getByText(/Nhân viên đơn/)).toBeInTheDocument()
    expect(screen.getAllByText('Đơn hàng').length).toBeGreaterThan(0)
    expect(screen.queryByText('Voucher')).toBeNull()
    expect(screen.queryByText('Nhân viên')).toBeNull()
  })

  it('bấm "Thoát xem thử" → xoá preview khỏi store', async () => {
    usePreviewStore.setState({
      previewRole: { name: 'order_staff', display_name: 'Nhân viên đơn', permissions: ['manage_orders'] },
    })
    renderLayout({ permissions: ['view_dashboard', 'manage_orders'] })

    await userEvent.click(screen.getByRole('button', { name: /Thoát xem thử/ }))

    expect(usePreviewStore.getState().previewRole).toBeNull()
  })
})
