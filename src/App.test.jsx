import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './app/router'
import { Providers } from './app/providers'
import { useAuthStore } from './store/authStore'
import * as catalogApi from './features/catalog/api'
import * as cartApi from './features/cart/api'
import { isStaff } from './lib/roles'

vi.mock('./features/catalog/api')
vi.mock('./features/cart/api')

function renderAt(initialPath, user = null) {
  if (user) {
    useAuthStore.setState(isStaff(user)
      ? { adminToken: 'admin-abc', adminUser: user }
      : { token: 'customer-abc', user })
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
    useAuthStore.setState({ token: null, user: null, adminToken: null, adminUser: null })
    catalogApi.getCategories.mockResolvedValue({ data: [] })
    catalogApi.getBestSellers.mockResolvedValue({ data: [] })
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

  // Pages are lazy-loaded (route-level code splitting), so assertions await the chunk.

  it('renders the home page at "/"', async () => {
    renderAt('/')
    expect(
      await screen.findByRole('heading', { name: 'Điều gì phù hợp với căn phòng của bạn?', level: 1 }),
    ).toBeInTheDocument()
  })

  it('keeps the domain root as storefront when only an admin session exists', async () => {
    renderAt('/', {
      id: 1,
      name: 'NV',
      roles: ['order_staff'],
      permissions: ['view_dashboard'],
    })

    expect(
      await screen.findByRole('heading', { name: 'Điều gì phù hợp với căn phòng của bạn?', level: 1 }),
    ).toBeInTheDocument()
  })

  it('keeps the root as storefront when customer and admin sessions coexist', async () => {
    useAuthStore.setState({
      token: 'customer-token',
      user: { id: 1, roles: ['customer'] },
      adminToken: 'admin-token',
      adminUser: { id: 2, roles: ['super_admin'] },
    })
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Điều gì phù hợp với căn phòng của bạn?', level: 1 })).toBeInTheDocument()
  })

  it('renders a category page at "/c/:categorySlug"', async () => {
    renderAt('/c/phong-khach')
    expect(await screen.findByRole('heading', { name: 'Phòng khách' })).toBeInTheDocument()
  })

  it('renders a product page at "/p/:productSlug"', async () => {
    renderAt('/p/ghe-sofa')
    expect(await screen.findByRole('heading', { name: 'Ghế sofa', level: 1 })).toBeInTheDocument()
  })

  it('renders a guest cart shell at "/cart"', async () => {
    renderAt('/cart')
    expect(await screen.findByRole('heading', { name: 'Giỏ hàng', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Đăng nhập để xem giỏ hàng/ })).toHaveAttribute('href', '/login')
  })

  it('redirects /wishlist to /login when not authenticated', async () => {
    renderAt('/wishlist')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /checkout to /login when not authenticated', async () => {
    renderAt('/checkout')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /checkout/return to /login when not authenticated', async () => {
    renderAt('/checkout/return')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /orders to /login when not authenticated', async () => {
    renderAt('/orders')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('redirects /orders/:id to /login when not authenticated', async () => {
    renderAt('/orders/1')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown route', async () => {
    renderAt('/does-not-exist')
    expect(await screen.findByRole('heading', { name: 'Căn phòng này chưa được dựng.' })).toBeInTheDocument()
  })

  it('redirects /account to /login when not authenticated', async () => {
    renderAt('/account')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('renders /account when authenticated', async () => {
    renderAt('/account', { id: 1, name: 'Bao', roles: ['customer'], email_verified_at: '2026-01-01T00:00:00Z' })
    expect(await screen.findByRole('heading', { name: 'Xin chào, Bao' })).toBeInTheDocument()
  })

  it('redirects /admin to the staff login for a customer', async () => {
    renderAt('/admin', { id: 1, name: 'Bao', roles: ['customer'] })
    expect(await screen.findByRole('heading', { name: 'Đăng nhập quản trị' })).toBeInTheDocument()
  })

  it('does not expose a public admin registration route', async () => {
    renderAt('/admin/register')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập quản trị' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Đăng ký' })).toBeNull()
  })

  it('renders the admin dashboard for a super_admin user', async () => {
    renderAt('/admin', { id: 1, name: 'Admin', roles: ['super_admin'] })
    // The admin shell's top bar shows the active section title.
    expect(await screen.findByRole('heading', { name: 'Tổng quan', level: 1 })).toBeInTheDocument()
  })

  it('renders the admin dashboard for a non-super-admin staff user', async () => {
    renderAt('/admin', { id: 1, name: 'NV', roles: ['order_staff'], permissions: ['view_dashboard'] })
    expect(await screen.findByRole('heading', { name: 'Tổng quan', level: 1 })).toBeInTheDocument()
  })
})
