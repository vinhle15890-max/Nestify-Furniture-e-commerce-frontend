import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminLayout } from './AdminLayout'
import { useAuthStore } from '../../store/authStore'

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
})
