import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminHome } from './AdminHome'
import { useAuthStore } from '../../store/authStore'

vi.mock('./AdminDashboardPage', () => ({ AdminDashboardPage: () => <div>Bảng tổng quan</div> }))

function renderHome(user) {
  useAuthStore.setState({ token: 't', user })
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
  beforeEach(() => useAuthStore.setState({ token: null, user: null }))

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
})
