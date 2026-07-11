import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CategoryPage } from './CategoryPage'
import * as catalogApi from '../../features/catalog/api'
import { ApiError } from '../../lib/errors'

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
      data: [
        { id: 1, name: 'Phòng khách', slug: 'phong-khach', children: [] },
        { id: 2, name: 'Phòng ngủ', slug: 'phong-ngu', children: [] },
      ],
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

  it('shows a retryable product failure without claiming the result is empty', async () => {
    catalogApi.getProducts
      .mockRejectedValueOnce(new ApiError('SERVER_ERROR', 'Máy chủ chưa phản hồi.', {}, 500))
      .mockResolvedValueOnce({
        data: [product()],
        meta: { pagination: { has_more: false, next_cursor: null, limit: 20 } },
      })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể tải sản phẩm')
    expect(screen.queryByText(/Căn phòng này còn đang chờ được lấp/)).not.toBeInTheDocument()
    expect(screen.queryByText('0 sản phẩm')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Ghế sofa')).toBeInTheDocument()
    expect(catalogApi.getProducts).toHaveBeenCalledTimes(2)
  })

  it('recovers category metadata independently of loaded products', async () => {
    catalogApi.getCategory
      .mockRejectedValueOnce(new ApiError('SERVER_ERROR', 'Máy chủ chưa phản hồi.', {}, 500))
      .mockResolvedValueOnce({
        data: { id: 1, name: 'Phòng khách', slug: 'phong-khach', children: [] },
      })
    renderPage()

    expect(await screen.findByText('Ghế sofa')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải thông tin danh mục')

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { name: 'Phòng khách' })).toBeInTheDocument()
    expect(catalogApi.getCategory).toHaveBeenCalledTimes(2)
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

  it('chuyển danh mục qua dropdown Danh mục và nạp lại theo danh mục mới', async () => {
    renderPage()
    await screen.findByText('Ghế sofa')

    await userEvent.selectOptions(screen.getByLabelText('Danh mục'), 'phong-ngu')

    await waitFor(() =>
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'phong-ngu' }),
      ),
    )
  })

  it('tìm kiếm thủ công gọi API với filter search (debounced)', async () => {
    renderPage()
    await screen.findByText('Ghế sofa')

    await userEvent.type(screen.getByLabelText('Tìm sản phẩm trong danh mục...'), 'sofa')

    await waitFor(() =>
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'phong-khach', search: 'sofa' }),
      ),
    )
  })

  it('lọc theo khoảng giá gọi API với price_min/price_max', async () => {
    renderPage()
    await screen.findByText('Ghế sofa')

    await userEvent.selectOptions(screen.getByLabelText('Khoảng giá'), '2000000-5000000')

    await waitFor(() =>
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'phong-khach', priceMin: '2000000', priceMax: '5000000' }),
      ),
    )
  })

  it('sắp xếp theo giá gọi API với sort base_price', async () => {
    renderPage()
    await screen.findByText('Ghế sofa')

    await userEvent.selectOptions(screen.getByLabelText('Sắp xếp'), 'base_price')

    await waitFor(() =>
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'phong-khach', sort: 'base_price' }),
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
