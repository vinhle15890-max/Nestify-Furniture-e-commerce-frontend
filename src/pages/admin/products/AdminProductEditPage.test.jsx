import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminProductEditPage } from './AdminProductEditPage'
import * as productsApi from '../../../features/admin/products/api'
import * as catalogApi from '../../../features/catalog/api'

vi.mock('../../../features/admin/products/api')
vi.mock('../../../features/catalog/api')

// TipTap can't mount in jsdom; swap the editor for a plain labelled textarea so
// the description still participates in the form and stays queryable.
vi.mock('../../../components/admin/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, ariaLabel = 'Mô tả', id }) => (
    <textarea id={id} aria-label={ariaLabel} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
  ),
}))

const baseProduct = {
  id: 1,
  slug: 'ghe-sofa',
  name: 'Ghế Sofa',
  description: 'Mô tả sofa',
  base_price: 5000000,
  status: 'active',
  category: { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
  variants: [
    {
      id: 100,
      sku: 'SOFA-NAU',
      name: 'Nâu',
      price: 5000000,
      available_stock: 5,
      is_active: true,
      model_3d_url: null,
    },
  ],
  media: [
    { id: 10, product_id: 1, url: 'https://example.com/1.jpg', type: 'image', sort_order: 1 },
    { id: 20, product_id: 1, url: 'https://example.com/2.jpg', type: 'image', sort_order: 2 },
  ],
}

const categoriesResponse = {
  data: [{ id: 1, name: 'Phòng khách', slug: 'phong-khach', parent_id: null, children: [] }],
}

function renderPage(product = baseProduct) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: `/admin/products/${product.id}`, state: { product } }]}>
        <Routes>
          <Route path="/admin/products/:id" element={<AdminProductEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminProductEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogApi.getCategories.mockResolvedValue(categoriesResponse)
  })

  it('hydrates product fields from location.state', async () => {
    renderPage()

    expect(await screen.findByLabelText('Tên sản phẩm')).toHaveValue('Ghế Sofa')
    expect(screen.getByLabelText('Slug')).toHaveValue('ghe-sofa')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    expect(screen.getByLabelText('Mô tả')).toHaveValue('Mô tả sofa')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    expect(screen.getByText('SOFA-NAU')).toBeInTheDocument()
  })

  it('fetches the product when deep-linked without router state', async () => {
    productsApi.getProduct.mockResolvedValue({ data: baseProduct })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/products/1']}>
          <Routes>
            <Route path="/admin/products/:id" element={<AdminProductEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByLabelText('Tên sản phẩm')).toHaveValue('Ghế Sofa')
    expect(productsApi.getProduct).toHaveBeenCalledWith(1)
  })

  it('updates product fields', async () => {
    productsApi.updateProduct.mockResolvedValue({ data: { ...baseProduct, name: 'Ghế Sofa Cao Cấp' } })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    const nameInput = screen.getByLabelText('Tên sản phẩm')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Ghế Sofa Cao Cấp')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Ghế Sofa Cao Cấp', slug: 'ghe-sofa', category_id: 1, status: 'active' }),
      ),
    )
  })

  it('fills description and SEO fields from the AI draft', async () => {
    productsApi.generateProductDescription.mockResolvedValue({
      data: {
        description: '<p>Sofa da bò Ý sang trọng.</p>',
        meta_title: 'Sofa da bò Ý 3 chỗ | Nestify',
        meta_description: 'Sofa da bò Ý 3 chỗ khung gỗ sồi. Mua ngay tại Nestify.',
        focus_keyword: 'sofa da bò',
      },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    await userEvent.click(screen.getByRole('button', { name: /Gợi ý bằng AI/ }))

    await waitFor(() => expect(productsApi.generateProductDescription).toHaveBeenCalledTimes(1))
    expect(await screen.findByLabelText('Mô tả')).toHaveValue('<p>Sofa da bò Ý sang trọng.</p>')
    expect(screen.getByLabelText('Tiêu đề SEO')).toHaveValue('Sofa da bò Ý 3 chỗ | Nestify')
    expect(screen.getByLabelText('Từ khóa chính')).toHaveValue('sofa da bò')
  })

  it('adds a new variant', async () => {
    productsApi.createVariant.mockResolvedValue({
      data: { id: 200, sku: 'SOFA-XAM', name: 'Xám', price: 5500000, available_stock: 3, is_active: true, model_3d_url: null },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
    await userEvent.type(screen.getByLabelText('SKU'), 'SOFA-XAM')
    await userEvent.type(screen.getByLabelText('Tên biến thể'), 'Xám')
    await userEvent.type(screen.getByLabelText('Giá'), '5500000')
    await userEvent.type(screen.getByLabelText('Số lượng kho'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))

    await waitFor(() =>
      expect(productsApi.createVariant).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ sku: 'SOFA-XAM', name: 'Xám', price: 5500000, stock_quantity: 3 }),
      ),
    )
    expect(await screen.findByText('SOFA-XAM')).toBeInTheDocument()
  })

  it('omits SKU so the server auto-generates it when left blank', async () => {
    productsApi.createVariant.mockResolvedValue({
      data: { id: 201, sku: 'GHE-SOFA-01', name: 'Be', price: 5000000, available_stock: 2, is_active: true, model_3d_url: null },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
    // SKU left blank on purpose
    await userEvent.type(screen.getByLabelText('Tên biến thể'), 'Be')
    await userEvent.type(screen.getByLabelText('Giá'), '5000000')
    await userEvent.type(screen.getByLabelText('Số lượng kho'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))

    await waitFor(() => expect(productsApi.createVariant).toHaveBeenCalledTimes(1))
    expect(productsApi.createVariant.mock.calls[0][1].sku).toBeUndefined()
    expect(productsApi.createVariant.mock.calls[0][1]).toEqual(expect.objectContaining({ name: 'Be', stock_quantity: 2 }))
  })

  it('edits an existing variant', async () => {
    productsApi.updateVariant.mockResolvedValue({
      data: { id: 100, sku: 'SOFA-NAU', name: 'Nâu đậm', price: 5200000, available_stock: 5, is_active: true, model_3d_url: null },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sửa biến thể' }))

    const nameInput = await screen.findByLabelText('Tên biến thể')
    await waitFor(() => expect(nameInput).toHaveValue('Nâu'))
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Nâu đậm')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() =>
      expect(productsApi.updateVariant).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ name: 'Nâu đậm' }),
      ),
    )
    expect(await screen.findByText('Nâu đậm')).toBeInTheDocument()
  })

  it('uploads a new media file', async () => {
    productsApi.uploadMedia.mockResolvedValue({
      data: { id: 30, product_id: 1, url: 'https://example.com/3.jpg', type: 'image', sort_order: 3 },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh' }))

    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('Tệp'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Tải lên' }))

    await waitFor(() => expect(productsApi.uploadMedia).toHaveBeenCalledTimes(1))
    const [productId, formData] = productsApi.uploadMedia.mock.calls[0]
    expect(productId).toBe(1)
    expect(formData.get('type')).toBe('image')
    expect(formData.get('file').name).toBe(file.name)
  })

  it('deletes a media item', async () => {
    productsApi.deleteMedia.mockResolvedValue({})
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh' }))

    const deleteButtons = screen.getAllByRole('button', { name: 'Xóa' })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => expect(productsApi.deleteMedia).toHaveBeenCalledWith(1, 10))
  })

  it('reorders media when moving an item down', async () => {
    productsApi.reorderMedia.mockResolvedValue({
      data: [
        { id: 20, product_id: 1, url: 'https://example.com/2.jpg', type: 'image', sort_order: 1 },
        { id: 10, product_id: 1, url: 'https://example.com/1.jpg', type: 'image', sort_order: 2 },
      ],
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh' }))

    const moveDownButtons = screen.getAllByRole('button', { name: 'Xuống' })
    await userEvent.click(moveDownButtons[0])

    await waitFor(() => expect(productsApi.reorderMedia).toHaveBeenCalledWith(1, [20, 10]))
  })

  it('switches to the info tab and flags it when a required field is missing on submit', async () => {
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    await userEvent.clear(screen.getByLabelText('Tên sản phẩm'))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))

    expect(await screen.findByText('Vui lòng nhập tên sản phẩm.')).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Thông tin' }).querySelector('[data-error-dot]')).toBeInTheDocument()
  })

  it('shows a not-found message when no product data is available', async () => {
    productsApi.getProduct.mockRejectedValue(new Error('not found'))

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/products/999']}>
          <Routes>
            <Route path="/admin/products/:id" element={<AdminProductEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Không tìm thấy sản phẩm.')).toBeInTheDocument()
  })
})
