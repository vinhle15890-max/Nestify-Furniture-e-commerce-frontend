import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './app/router'
import { Providers } from './app/providers'
import { useAuthStore } from './store/authStore'
import * as catalogApi from './features/catalog/api'
import * as cartApi from './features/cart/api'

vi.mock('./features/catalog/api')
vi.mock('./features/cart/api')

function renderAt(initialPath, user = null) {
  if (user) {
    useAuthStore.setState({ token: 'abc', user })
  }
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
}

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, user: null })
    catalogApi.getCategories.mockResolvedValue({ data: [] })
    catalogApi.getCategory.mockResolvedValue({
      data: { id: 1, name: 'Phòng khách', slug: 'phong-khach', children: [] },
    })
    catalogApi.getProducts.mockResolvedValue({
      data: [],
      meta: { pagination: { has_more: false, next_cursor: null, limit: 20 } },
    })
    catalogApi.getProduct.mockResolvedValue({
      data: {
        id: 1,
        slug: 'ghe-sofa',
        name: 'Ghế sofa',
        description: '',
        base_price: 1000000,
        attributes: {},
        status: 'published',
        thumbnail: null,
        category: null,
        created_at: '2026-01-01T00:00:00Z',
        variants: [],
        media: [],
      },
    })
    catalogApi.getProductReviews.mockResolvedValue({
      data: [],
      meta: { pagination: { has_more: false, next_cursor: null, limit: 20 } },
    })
    cartApi.getCart.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
  })

  it('renders the home page at "/"', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Nestify', level: 1 })).toBeInTheDocument()
  })

  it('renders a category page at "/c/:categorySlug"', async () => {
    renderAt('/c/phong-khach')
    expect(await screen.findByRole('heading', { name: 'Phòng khách' })).toBeInTheDocument()
  })

  it('renders a product page at "/p/:productSlug"', async () => {
    renderAt('/p/ghe-sofa')
    expect(await screen.findByRole('heading', { name: 'Ghế sofa', level: 1 })).toBeInTheDocument()
  })

  it('renders a guest cart shell at "/cart"', () => {
    renderAt('/cart')
    expect(screen.getByRole('heading', { name: 'Giỏ hàng', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/đăng nhập/)).toBeInTheDocument()
  })

  it('redirects /wishlist to /login when not authenticated', () => {
    renderAt('/wishlist')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /checkout to /login when not authenticated', () => {
    renderAt('/checkout')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /checkout/return to /login when not authenticated', () => {
    renderAt('/checkout/return')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /orders to /login when not authenticated', () => {
    renderAt('/orders')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /orders/:id to /login when not authenticated', () => {
    renderAt('/orders/1')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown route', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
  })

  it('redirects /account to /login when not authenticated', () => {
    renderAt('/account')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('renders /account when authenticated', () => {
    renderAt('/account', { id: 1, name: 'Bao', roles: ['customer'], email_verified_at: '2026-01-01T00:00:00Z' })
    expect(screen.getByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument()
  })

  it('redirects /admin to home for a non-admin user', () => {
    renderAt('/admin', { id: 1, name: 'Bao', roles: ['customer'] })
    expect(screen.getByRole('heading', { name: 'Nestify', level: 1 })).toBeInTheDocument()
  })

  it('renders the admin dashboard for a super_admin user', () => {
    renderAt('/admin', { id: 1, name: 'Admin', roles: ['super_admin'] })
    expect(screen.getByRole('heading', { name: 'Quản trị' })).toBeInTheDocument()
  })
})
