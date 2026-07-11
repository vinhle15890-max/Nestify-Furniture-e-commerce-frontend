import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminCategoriesPage } from './AdminCategoriesPage'
import { Toaster } from '../../../components/Toast'
import * as categoriesApi from '../../../features/admin/categories/api'
import * as mediaApi from '../../../features/admin/media/api'
import { ApiError } from '../../../lib/errors'

vi.mock('../../../features/admin/categories/api')
vi.mock('../../../features/admin/media/api')

const tree = [
  {
    id: 1,
    name: 'Phòng khách',
    slug: 'phong-khach',
    parent_id: null,
    image_url: null,
    children: [
      {
        id: 2,
        name: 'Sofa',
        slug: 'sofa',
        parent_id: 1,
        image_url: null,
        children: [],
      },
    ],
  },
  {
    id: 3,
    name: 'Phòng ngủ',
    slug: 'phong-ngu',
    parent_id: null,
    image_url: null,
    children: [],
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminCategoriesPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    categoriesApi.getCategories.mockResolvedValue({ data: tree })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the nested category tree', async () => {
    renderPage()

    expect(await screen.findByText('Phòng khách')).toBeInTheDocument()
    expect(screen.getByText('Sofa')).toBeInTheDocument()
    expect(screen.getByText('Phòng ngủ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa danh mục Phòng khách' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa danh mục Sofa' })).toBeInTheDocument()
  })

  it('creates a new category via the modal', async () => {
    categoriesApi.createCategory.mockResolvedValue({ data: { id: 4, name: 'Đèn', slug: 'den', parent_id: null, image_url: null, children: [] } })
    renderPage()
    await screen.findByText('Phòng khách')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))
    expect(screen.getByText('Tạo một mục mới trong cây danh mục sản phẩm.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Tên danh mục'), 'Đèn')
    await userEvent.type(screen.getByLabelText('Slug'), 'den')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() =>
      expect(categoriesApi.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Đèn', slug: 'den' }),
      ),
    )
  })

  it('picks an image from the media library and submits its media_asset_id with the category', async () => {
    mediaApi.listMedia.mockResolvedValue({
      data: [{ id: 5, url: 'https://example.com/lib/ghe.jpg', alt_text: 'Ảnh thư viện', usage_count: 0 }],
      meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 24 } },
    })
    categoriesApi.createCategory.mockResolvedValue({
      data: { id: 5, name: 'Ghế', slug: 'ghe', parent_id: null, image_url: 'https://example.com/lib/ghe.jpg', media_asset_id: 5, children: [] },
    })
    renderPage()
    await screen.findByText('Phòng khách')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))
    await userEvent.type(screen.getByLabelText('Tên danh mục'), 'Ghế')
    await userEvent.type(screen.getByLabelText('Slug'), 'ghe')

    await userEvent.click(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }))

    const image = await screen.findByAltText('Ảnh thư viện')
    await userEvent.click(image.closest('button'))
    await userEvent.click(screen.getByRole('button', { name: /^chọn/i }))

    // The preview image should now be shown in the form.
    expect(await screen.findByAltText('Ảnh đại diện danh mục')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() =>
      expect(categoriesApi.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ghế',
          slug: 'ghe',
          media_asset_id: 5,
        }),
      ),
    )
  })

  it('edits an existing category pre-filled with its values', async () => {
    categoriesApi.updateCategory.mockResolvedValue({ data: tree[0] })
    renderPage()
    await screen.findByText('Phòng khách')

    await userEvent.click(screen.getByRole('button', { name: 'Sửa danh mục Phòng khách' }))

    const nameInput = await screen.findByLabelText('Tên danh mục')
    await waitFor(() => expect(nameInput).toHaveValue('Phòng khách'))

    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Phòng khách mới')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() =>
      expect(categoriesApi.updateCategory).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Phòng khách mới' }),
      ),
    )
  })

  it('deletes a category after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    categoriesApi.deleteCategory.mockResolvedValue({})
    renderPage()
    await screen.findByText('Phòng ngủ')

    await userEvent.click(screen.getByRole('button', { name: 'Xóa danh mục Phòng ngủ' }))

    await waitFor(() => expect(categoriesApi.deleteCategory).toHaveBeenCalledWith(3))
  })

  it('shows an error toast when deleting a category with active products', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    categoriesApi.deleteCategory.mockRejectedValue(
      new ApiError('HAS_ACTIVE_PRODUCTS', 'Danh mục đang có sản phẩm hoạt động.', null, 409),
    )
    renderPage()
    await screen.findByText('Phòng ngủ')

    await userEvent.click(screen.getByRole('button', { name: 'Xóa danh mục Phòng ngủ' }))

    expect(await screen.findByText('Danh mục đang có sản phẩm hoạt động.')).toBeInTheDocument()
  })
})
