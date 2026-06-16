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

  it('creates a product via the modal and navigates to its edit page', async () => {
    productsApi.createProduct.mockResolvedValue({ data: { id: 99, name: 'Đèn bàn', slug: 'den-ban' } })
    renderPage()
    await screen.findByText('Ghế Sofa')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }))
    await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Đèn bàn')
    await userEvent.type(screen.getByLabelText('Slug'), 'den-ban')
    await userEvent.selectOptions(screen.getByLabelText('Danh mục'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))

    await waitFor(() =>
      expect(productsApi.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Đèn bàn', slug: 'den-ban', category_id: 1 }),
      ),
    )
    expect(await screen.findByText('Trang sửa sản phẩm')).toBeInTheDocument()
  })
})
