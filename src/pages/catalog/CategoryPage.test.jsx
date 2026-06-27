import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CategoryPage } from './CategoryPage'
import * as catalogApi from '../../features/catalog/api'

vi.mock('../../features/catalog/api')

function renderPage(slug = 'phong-khach') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/c/${slug}`]}>
        <Routes>
          <Route path="/c/:categorySlug" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const product = (overrides = {}) => ({
  id: 1,
  slug: 'ghe-sofa',
  name: 'Ghế sofa',
  base_price: 1000000,
  thumbnail: null,
  attributes: { brand: 'IKEA' },
  category: { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
  ...overrides,
})

describe('CategoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogApi.getCategory.mockResolvedValue({
      data: { id: 1, name: 'Phòng khách', slug: 'phong-khach', children: [] },
    })
    catalogApi.getCategories.mockResolvedValue({
      data: [{ id: 1, name: 'Phòng khách', slug: 'phong-khach', children: [] }],
    })
    catalogApi.getProducts.mockResolvedValue({
      data: [product()],
      meta: { pagination: { has_more: false, next_cursor: null, limit: 20 } },
    })
  })

  it('renders the category name and its products', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phòng khách' })).toBeInTheDocument()
    expect(await screen.findByText('Ghế sofa')).toBeInTheDocument()
  })

  it('refetches with the new sort param when the sort filter changes', async () => {
    renderPage()
    await screen.findByText('Ghế sofa')

    await userEvent.selectOptions(screen.getByLabelText('Sắp xếp'), '-created_at')

    await waitFor(() =>
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'phong-khach', sort: '-created_at' }),
      ),
    )
  })

  it('refetches with the brand filter once a brand option is available', async () => {
    renderPage()
    await screen.findByText('Ghế sofa')

    await userEvent.selectOptions(screen.getByLabelText('Thương hiệu'), 'IKEA')

    await waitFor(() =>
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'phong-khach', brand: 'IKEA' }),
      ),
    )
  })

  it('hiển thị breadcrumb với danh mục hiện tại', async () => {
    renderPage()
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/')
    const current = await within(nav).findByText('Phòng khách')
    expect(current).toHaveAttribute('aria-current', 'page')
  })
})
