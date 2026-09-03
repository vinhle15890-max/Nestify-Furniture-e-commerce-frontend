import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminProductEditPage } from './AdminProductEditPage'
import * as productsApi from '../../../features/admin/products/api'
import * as catalogApi from '../../../features/catalog/api'
import * as mediaApi from '../../../features/admin/media/api'

vi.mock('../../../features/admin/products/api')
vi.mock('../../../features/catalog/api')
vi.mock('../../../features/admin/media/api')

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
  productsApi.getProduct.mockResolvedValue({ data: product })
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

  it('marks a legacy model whose real-world dimensions are not confirmed', async () => {
    renderPage({
      ...baseProduct,
      variants: [{ ...baseProduct.variants[0], model_3d_url: 'https://models.test/legacy.glb', model_scaled_at: null }],
    })

    await userEvent.click(await screen.findByRole('tab', { name: 'Biến thể' }))
    expect(screen.getByText('Chưa xác nhận kích thước thật')).toBeInTheDocument()
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

  it('hydrates media from product detail when the list seed omits media', async () => {
    const listSeed = { ...baseProduct }
    delete listSeed.media
    productsApi.getProduct.mockResolvedValue({ data: baseProduct })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/admin/products/1', state: { product: listSeed } }]}>
          <Routes>
            <Route path="/admin/products/:id" element={<AdminProductEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(await screen.findByRole('tab', { name: 'Hình ảnh & Video' }))
    expect(await screen.findByText('Ảnh · Thứ tự 1')).toBeInTheDocument()
    expect(screen.getByText('Ảnh · Thứ tự 2')).toBeInTheDocument()
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

  it('saves staff-curated placement independently from sales ranking', async () => {
    productsApi.updateProduct.mockResolvedValue({ data: { ...baseProduct, is_featured: true, featured_position: 2 } })
    renderPage()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Đưa sản phẩm vào danh sách do Nestify tuyển chọn' }))
    await userEvent.type(screen.getByLabelText('Thứ tự ưu tiên'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))

    await waitFor(() => expect(productsApi.updateProduct).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ is_featured: true, featured_position: 2 }),
    ))
  })

  it('offers AI variations and fills fields from the chosen one', async () => {
    productsApi.generateProductDescription.mockResolvedValue({
      data: {
        drafts: [
          {
            description: '<p>Sofa da bò Ý sang trọng.</p>',
            meta_title: 'Sofa da bò Ý 3 chỗ | Nestify',
            meta_description: 'Sofa da bò Ý 3 chỗ khung gỗ sồi. Mua ngay tại Nestify.',
            focus_keyword: 'sofa da bò',
          },
          {
            description: '<p>Phương án B thân thiện.</p>',
            meta_title: 'Sofa da bò Ý ấm cúng | Nestify',
            meta_description: 'Bản B.',
            focus_keyword: 'sofa da bò',
          },
        ],
      },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    await userEvent.click(screen.getByRole('button', { name: /Gợi ý bằng AI/ }))

    const useButtons = await screen.findAllByRole('button', { name: 'Dùng bản này' })
    expect(useButtons).toHaveLength(2)
    await userEvent.click(useButtons[0])

    expect(await screen.findByLabelText('Mô tả')).toHaveValue('<p>Sofa da bò Ý sang trọng.</p>')
    expect(screen.getByLabelText('Tiêu đề SEO')).toHaveValue('Sofa da bò Ý 3 chỗ | Nestify')
    expect(screen.getByLabelText('Từ khóa chính')).toHaveValue('sofa da bò')
    expect(productsApi.generateProductDescription).toHaveBeenCalledWith(
      expect.objectContaining({ count: 2, tone: 'sang_trong' }),
    )
  })

  it('drafts a single SEO field from its per-field suggest button', async () => {
    productsApi.generateProductDescription.mockResolvedValue({
      data: { meta_description: 'Mô tả SEO mới do AI viết cho sofa da bò cao cấp.' },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))

    // Live SEO score panel is present.
    expect(screen.getByText('Điểm SEO')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Gợi ý mô tả SEO bằng AI' }))

    await waitFor(() =>
      expect(productsApi.generateProductDescription).toHaveBeenCalledWith(
        expect.objectContaining({ field: 'meta_description' }),
      ),
    )
    // Only the meta description is filled; the title is left untouched.
    expect(await screen.findByLabelText('Mô tả SEO')).toHaveValue('Mô tả SEO mới do AI viết cho sofa da bò cao cấp.')
    expect(screen.getByLabelText('Tiêu đề SEO')).toHaveValue('')
    expect(screen.getByLabelText('Tiêu đề SEO')).toHaveAttribute('placeholder', 'Nhập tiêu đề SEO...')
  })

  it('drafts SEO from the product images and opens the variations modal', async () => {
    productsApi.generateProductDescription.mockResolvedValue({
      data: {
        drafts: [
          { description: '<p>Từ ảnh A.</p>', meta_title: 'A', meta_description: 'A', focus_keyword: 'sofa' },
          { description: '<p>Từ ảnh B.</p>', meta_title: 'B', meta_description: 'B', focus_keyword: 'sofa' },
        ],
      },
    })
    renderPage({
      ...baseProduct,
      media: Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        product_id: 1,
        url: `https://example.com/${index + 1}.jpg`,
        type: 'image',
        sort_order: index + 1,
      })),
    })
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gợi ý từ ảnh' }))

    await waitFor(() =>
      expect(productsApi.generateProductDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2,
          image_urls: [
            'https://example.com/1.jpg',
            'https://example.com/2.jpg',
            'https://example.com/3.jpg',
            'https://example.com/4.jpg',
          ],
        }),
      ),
    )
    expect(await screen.findAllByRole('button', { name: 'Dùng bản này' })).toHaveLength(2)
  })

  it('uses the attribute matrix as the only way to add variants', async () => {
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    expect(screen.queryByRole('button', { name: 'Thêm biến thể' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm thuộc tính' })).toBeInTheDocument()
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
    // Scope to the variants table cell — the media "Áp dụng cho" dropdowns also
    // list variant names as <option>s, so a bare text query is now ambiguous.
    expect(await screen.findByRole('cell', { name: 'Nâu đậm' })).toBeInTheDocument()
  })

  it('adjusts stock with the matching inventory operation and refreshes the modal balance', async () => {
    productsApi.adjustVariantStock.mockResolvedValue({
      data: {
        ...baseProduct.variants[0],
        stock_quantity: 8,
        reserved_quantity: 2,
        available_stock: 6,
      },
    })
    renderPage({
      ...baseProduct,
      variants: [{ ...baseProduct.variants[0], stock_quantity: 5, reserved_quantity: 2, available_stock: 3 }],
    })
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sửa biến thể' }))
    await userEvent.type(await screen.findByLabelText('Số lượng tăng/giảm'), '3')
    await userEvent.type(screen.getByLabelText('Lý do kiểm kê'), 'Kiểm kê bổ sung')
    await userEvent.click(screen.getByRole('button', { name: 'Ghi nhận điều chỉnh' }))

    await waitFor(() => expect(productsApi.adjustVariantStock).toHaveBeenCalledWith(100, expect.objectContaining({
      operation: 'inventory_gain',
      quantity_delta: 3,
      reason: 'Kiểm kê bổ sung',
    })))
    expect(await screen.findByText(/On-hand 8 · Đang giữ 2 · Có thể bán 6/)).toBeInTheDocument()
  })

  it('attaches media picked from the library modal', async () => {
    mediaApi.listMedia.mockResolvedValue({
      data: [{ id: 5, url: 'https://example.com/lib.jpg', alt_text: 'Ảnh thư viện', usage_count: 0 }],
      meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 24 } },
    })
    productsApi.attachMedia.mockResolvedValue({
      data: [
        ...baseProduct.media,
        { id: 30, product_id: 1, media_asset_id: 5, url: 'https://example.com/lib.jpg', type: 'image', sort_order: 3 },
      ],
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh & Video' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thêm ảnh / video' }))

    const image = await screen.findByAltText('Ảnh thư viện')
    await userEvent.click(image.closest('button'))
    await userEvent.click(screen.getByRole('button', { name: /^chọn/i }))

    await waitFor(() =>
      expect(productsApi.attachMedia).toHaveBeenCalledWith(1, { media_asset_ids: [5], variant_id: null }),
    )
  })

  it('detaches a media item', async () => {
    productsApi.deleteMedia.mockResolvedValue({})
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh & Video' }))

    const detachButtons = screen.getAllByRole('button', { name: 'Gỡ' })
    await userEvent.click(detachButtons[0])

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

    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh & Video' }))

    const moveDownButtons = screen.getAllByRole('button', { name: 'Xuống' })
    await userEvent.click(moveDownButtons[0])

    await waitFor(() => expect(productsApi.reorderMedia).toHaveBeenCalledWith(1, [20, 10]))
  })

  it('tags a media item to a variant via the per-card dropdown', async () => {
    productsApi.updateMedia.mockResolvedValue({
      data: { id: 10, product_id: 1, variant_id: 100, url: 'https://example.com/1.jpg', type: 'image', sort_order: 1 },
    })
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh & Video' }))

    const selects = screen.getAllByLabelText('Phạm vi ảnh/video')
    await userEvent.selectOptions(selects[0], '100')

    await waitFor(() => expect(productsApi.updateMedia).toHaveBeenCalledWith(1, 10, { variant_id: 100 }))
  })

  it('sets the product thumbnail independently from the media variant scope', async () => {
    productsApi.updateMedia.mockResolvedValue({
      data: { ...baseProduct.media[0], variant_id: null, is_thumbnail: true },
    })
    renderPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Hình ảnh & Video' }))

    await userEvent.click(screen.getAllByRole('button', { name: 'Đặt làm ảnh đại diện' })[0])

    await waitFor(() => expect(productsApi.updateMedia).toHaveBeenCalledWith(1, 10, { is_thumbnail: true }))
    expect((await screen.findAllByText('Ảnh đại diện')).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByLabelText('Phạm vi ảnh/video')[0]).toHaveValue('')
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
