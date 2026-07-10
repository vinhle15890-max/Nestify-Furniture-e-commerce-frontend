import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PermissionDenied } from './PermissionDenied'
import { useAuthStore } from '../../store/authStore'

function renderDenied(props, user) {
  useAuthStore.setState({ token: 't', user })
  return render(
    <MemoryRouter>
      <PermissionDenied {...props} />
    </MemoryRouter>,
  )
}

describe('PermissionDenied', () => {
  beforeEach(() => useAuthStore.setState({ token: null, user: null }))

  it('hiện nhãn quyền còn thiếu', () => {
    renderDenied({ missing: 'manage_vouchers' }, { permissions: ['manage_orders'] })
    expect(screen.getByText(/Quản lý voucher/)).toBeInTheDocument()
  })

  it('liệt kê link tới mục user có quyền', () => {
    renderDenied({ missing: 'manage_vouchers' }, { permissions: ['view_dashboard', 'manage_orders'] })
    expect(screen.getByRole('link', { name: 'Đơn hàng' })).toHaveAttribute('href', '/admin/orders')
  })
})
