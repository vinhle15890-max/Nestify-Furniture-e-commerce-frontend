import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from './Header'
import { Footer } from './Footer'
import { Layout } from './Layout'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import userEvent from '@testing-library/user-event'
import * as cartApi from '../../features/cart/api'

vi.mock('../../features/cart/api')

function renderWithProviders(children) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, user: null })
    useUiStore.setState({ isMobileNavOpen: false, isCartOpen: false })
    cartApi.getCart.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
  })

  it('shows "Đăng nhập" when logged out', () => {
    renderWithProviders(<Header />)
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument()
  })

  it('shows account and logout links when logged in', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    renderWithProviders(<Header />)

    expect(screen.getByLabelText('Tài khoản')).toBeInTheDocument()
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument()
  })

  it('shows the admin link for super_admin users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Admin', roles: ['super_admin'] } })
    renderWithProviders(<Header />)

    expect(screen.getByText('Quản trị')).toBeInTheDocument()
  })

  it('shows the admin link for non-super-admin staff roles', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'NV', roles: ['store_manager'] } })
    renderWithProviders(<Header />)

    expect(screen.getByText('Quản trị')).toBeInTheDocument()
  })

  it('hides the admin link for customer users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    renderWithProviders(<Header />)

    expect(screen.queryByText('Quản trị')).not.toBeInTheDocument()
  })

  it('does not render the removed horizontal category navigation', () => {
    renderWithProviders(<Header />)

    expect(screen.queryByRole('navigation', { name: 'Danh mục sản phẩm' })).not.toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('renders the brand name', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    expect(screen.getAllByText(/Nestify/).length).toBeGreaterThan(0)
  })

  it('states the clarity promise and exposes practical support paths', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>)
    expect(screen.getByText(/Thấy rõ món đồ/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Giao hàng' })).toHaveAttribute('href', expect.stringContaining('mailto:'))
    expect(screen.queryByText('Tham gia Nestify Journal')).not.toBeInTheDocument()
  })
})

describe('Layout', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    useUiStore.setState({ isMobileNavOpen: false, isCartOpen: false })
    cartApi.getCart.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
  })

  it('renders the header, footer, and routed content', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<p>Nội dung trang</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getAllByText('Nestify').length).toBeGreaterThan(0)
    expect(screen.getByText('Nội dung trang')).toBeInTheDocument()
    expect(screen.getByText(/© /)).toBeInTheDocument()
  })

  it('renders a skip-to-content link targeting the main region', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<p>Nội dung trang</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const skipLink = screen.getByRole('link', { name: 'Bỏ qua tới nội dung chính' })
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(document.getElementById('main-content')?.tagName).toBe('MAIN')
  })

  it('opens an accessible mobile navigation dialog and closes it with Escape', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<p>Nội dung trang</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Mở menu' }))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Điều hướng di động' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })
})
