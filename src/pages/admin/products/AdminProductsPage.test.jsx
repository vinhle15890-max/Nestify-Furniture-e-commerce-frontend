import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminProductsPage } from './AdminProductsPage'
import * as productsApi from '../../../features/admin/products/api'
import * as catalogApi from '../../../features/catalog/api'

vi.mock('../../../features/admin/products/api')
vi.mock('../../../features/catalog/api')

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
  })

  it('requests the next page when pagination changes', async () => {
    renderPage()
    await screen.findByText('Ghế Sofa')

    await userEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => expect(productsApi.getProducts).toHaveBeenCalledWith(2))
  })

  it('navigates to the new-product page when adding a product', async () => {
    renderPage()
    await screen.findByText('Ghế Sofa')

    await userEvent.click(screen.getByRole('button', { name: /Thêm sản phẩm/ }))

    expect(await screen.findByText('Trang tạo sản phẩm')).toBeInTheDocument()
  })
})
