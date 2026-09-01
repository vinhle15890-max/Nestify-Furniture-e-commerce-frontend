import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminProductsPage } from './AdminProductsPage'
import * as productsApi from '../../../features/admin/products/api'
import * as catalogApi from '../../../features/catalog/api'
import * as seoApi from '../../../features/admin/seo/api'

vi.mock('../../../features/admin/products/api')
vi.mock('../../../features/catalog/api')
vi.mock('../../../features/admin/seo/api')

const productsPage1 = {
  data: [
    {
      id: 1,
      slug: 'ghe-sofa',
      name: 'Ghế Sofa',
      base_price: 5000000,
      status: 'active',
      category: { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
      variants: [{ id: 1 }, { id: 2 }],
      media: [],
      is_featured: true,
      featured_position: 2,
    },
  ],
  meta: { total: 30, page: 1, last_page: 3 },
}

const categoriesResponse = {
  data: [
    { id: 1, name: 'Phòng khách', slug: 'phong-khach', parent_id: null, children: [] },
  ],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/products']}>
        <Routes>
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/products/new" element={<div>Trang tạo sản phẩm</div>} />
          <Route path="/admin/products/:id" element={<div>Trang sửa sản phẩm</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    productsApi.getProducts.mockResolvedValue(productsPage1)
    catalogApi.getCategories.mockResolvedValue(categoriesResponse)
  })

  it('renders the paginated product list', async () => {
    renderPage()

    expect(await screen.findByText('Ghế Sofa')).toBeInTheDocument()
    expect(screen.getByText('Phòng khách')).toBeInTheDocument()
    expect(screen.getByText('5.000.000 ₫')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Danh sách sản phẩm' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tuyển chọn' })).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sửa sản phẩm Ghế Sofa' })).toBeInTheDocument()
  })

  it('requests the next page when pagination changes', async () => {
    renderPage()
    await screen.findByText('Ghế Sofa')

    await userEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 2, search: undefined }))
  })

  it('searches products through the server and resets pagination', async () => {
    renderPage()
    await screen.findByText('Ghế Sofa')
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 2, search: undefined }))

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc slug sản phẩm' }), 'sofa')

    await waitFor(() => expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 1, search: 'sofa' }))
  })

  it('navigates to the new-product page when adding a product', async () => {
    renderPage()
    await screen.findByText('Ghế Sofa')

    await userEvent.click(screen.getByRole('button', { name: /Thêm sản phẩm/ }))

    expect(await screen.findByText('Trang tạo sản phẩm')).toBeInTheDocument()
  })

  it('generates SEO for the selected products via the bulk endpoint', async () => {
    seoApi.bulkGenerateSeo.mockResolvedValue({ data: { batch_id: 'b1', queued: 1 } })
    renderPage()
    await screen.findByText('Ghế Sofa')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn Ghế Sofa' }))
    await userEvent.click(screen.getByRole('button', { name: /Sinh SEO/ }))

    await waitFor(() =>
      expect(seoApi.bulkGenerateSeo).toHaveBeenCalledWith({ scope: 'selected', product_ids: [1] }),
    )
  })

  it('shows a branded empty state with an action-oriented message when there are no products', async () => {
    productsApi.getProducts.mockResolvedValue({ data: [], meta: { last_page: 1 } })
    const { container } = renderPage()
    expect(await screen.findByText('Chưa có sản phẩm nào')).toBeInTheDocument()
    expect(screen.getByText('Thêm sản phẩm đầu tiên để bắt đầu bán.')).toBeInTheDocument()
    expect(container.querySelector('svg.animate-rise')).toBeTruthy()
  })
})
