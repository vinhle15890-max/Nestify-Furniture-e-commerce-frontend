import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Layout } from './Layout'
import { useAuthStore } from '../../store/authStore'

describe('Header', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
  })

  it('shows "Đăng nhập" when logged out', () => {
    render(<Header />, { wrapper: MemoryRouter })
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument()
  })

  it('shows account and logout links when logged in', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    render(<Header />, { wrapper: MemoryRouter })

    expect(screen.getByLabelText('Tài khoản')).toBeInTheDocument()
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument()
  })

  it('shows the admin link only for super_admin users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Admin', roles: ['super_admin'] } })
    render(<Header />, { wrapper: MemoryRouter })

    expect(screen.getByText('Quản trị')).toBeInTheDocument()
  })

  it('hides the admin link for customer users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    render(<Header />, { wrapper: MemoryRouter })

    expect(screen.queryByText('Quản trị')).not.toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('renders the brand name', () => {
    render(<Footer />)
    expect(screen.getByText(/Nestify/)).toBeInTheDocument()
  })
})

describe('Layout', () => {
  it('renders the header, footer, and routed content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>Nội dung trang</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Nestify')).toBeInTheDocument()
    expect(screen.getByText('Nội dung trang')).toBeInTheDocument()
    expect(screen.getByText(/© /)).toBeInTheDocument()
  })
})
