import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequirePermission } from './RequirePermission'
import { useAuthStore } from '../store/authStore'
import { usePreviewStore } from '../store/previewStore'

function renderGuarded({ slug, anyOf }, user) {
  useAuthStore.setState({ token: 't', user })
  return render(
    <MemoryRouter initialEntries={['/admin/thing']}>
      <Routes>
        <Route element={<RequirePermission slug={slug} anyOf={anyOf} />}>
          <Route path="/admin/thing" element={<div>Nội dung mật</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequirePermission', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    usePreviewStore.setState({ previewRole: null })
  })

  it('render nội dung khi đủ quyền', () => {
    renderGuarded({ slug: 'manage_orders' }, { permissions: ['manage_orders'] })
    expect(screen.getByText('Nội dung mật')).toBeInTheDocument()
  })

  it('render 403 khi thiếu quyền (không redirect)', () => {
    renderGuarded({ slug: 'manage_orders' }, { permissions: ['view_dashboard'] })
    expect(screen.queryByText('Nội dung mật')).toBeNull()
    expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
  })

  it('anyOf: đủ khi có 1 trong các quyền', () => {
    renderGuarded({ anyOf: ['manage_categories', 'manage_products'] }, { permissions: ['manage_products'] })
    expect(screen.getByText('Nội dung mật')).toBeInTheDocument()
  })

  it('đang xem thử vai trò → gate dùng permissions của role preview, không phải user thật', () => {
    usePreviewStore.setState({ previewRole: { name: 'order_staff', display_name: 'Nhân viên đơn', permissions: ['manage_orders'] } })
    // User thật có manage_orders nhưng role preview thì không → phải bị chặn.
    renderGuarded({ slug: 'manage_vouchers' }, { permissions: ['manage_orders', 'manage_vouchers'] })
    expect(screen.queryByText('Nội dung mật')).toBeNull()
    expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
  })
})
