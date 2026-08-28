import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminHome } from './AdminHome'
import { useAuthStore } from '../../store/authStore'
import { usePreviewStore } from '../../store/previewStore'

vi.mock('./AdminDashboardPage', () => ({ AdminDashboardPage: () => <div>Bảng tổng quan</div> }))

function renderHome(user) {
  useAuthStore.setState({ adminToken: 't', adminUser: user })
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/orders" element={<div>Trang đơn hàng</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminHome', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, adminToken: null, adminUser: null })
    usePreviewStore.setState({ previewRole: null })
  })

  it('có view_dashboard → hiện bảng tổng quan', () => {
    renderHome({ permissions: ['view_dashboard'] })
    expect(screen.getByText('Bảng tổng quan')).toBeInTheDocument()
  })

  it('thiếu view_dashboard nhưng có mục khác → redirect tới mục đầu hợp lệ', () => {
    renderHome({ permissions: ['manage_orders'] })
    expect(screen.getByText('Trang đơn hàng')).toBeInTheDocument()
  })

  it('không có quyền nào → trang 403', () => {
    renderHome({ permissions: [] })
    expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
  })

  it('đang xem thử vai trò → index dùng permissions của role preview', () => {
    usePreviewStore.setState({ previewRole: { name: 'order_staff', display_name: 'Nhân viên đơn', permissions: ['manage_orders'] } })
    // User thật có view_dashboard nhưng role preview thì không, chỉ có manage_orders.
    renderHome({ permissions: ['view_dashboard'] })
    expect(screen.getByText('Trang đơn hàng')).toBeInTheDocument()
  })
})
