import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from './Header'
import { Footer } from './Footer'
import { Layout } from './Layout'
import { useAuthStore } from '../../store/authStore'
import * as catalogApi from '../../features/catalog/api'
import * as cartApi from '../../features/cart/api'

vi.mock('../../features/catalog/api')
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
    catalogApi.getCategories.mockResolvedValue({ data: [] })
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

  it('shows the admin link only for super_admin users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Admin', roles: ['super_admin'] } })
    renderWithProviders(<Header />)

    expect(screen.getByText('Quản trị')).toBeInTheDocument()
  })

  it('hides the admin link for customer users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    renderWithProviders(<Header />)

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
    catalogApi.getCategories.mockResolvedValue({ data: [] })
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

    expect(screen.getByText('Nestify')).toBeInTheDocument()
    expect(screen.getByText('Nội dung trang')).toBeInTheDocument()
    expect(screen.getByText(/© /)).toBeInTheDocument()
  })
})
