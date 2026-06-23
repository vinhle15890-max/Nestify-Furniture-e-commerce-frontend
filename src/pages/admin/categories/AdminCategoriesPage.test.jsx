import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminCategoriesPage } from './AdminCategoriesPage'
import { Toaster } from '../../../components/Toast'
import * as categoriesApi from '../../../features/admin/categories/api'
import { ApiError } from '../../../lib/errors'

vi.mock('../../../features/admin/categories/api')

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
  })

  it('creates a new category via the modal', async () => {
    categoriesApi.createCategory.mockResolvedValue({ data: { id: 4, name: 'Đèn', slug: 'den', parent_id: null, image_url: null, children: [] } })
    renderPage()
    await screen.findByText('Phòng khách')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))
    await userEvent.type(screen.getByLabelText('Tên danh mục'), 'Đèn')
    await userEvent.type(screen.getByLabelText('Slug'), 'den')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() =>
      expect(categoriesApi.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Đèn', slug: 'den' }),
      ),
    )
  })

  it('edits an existing category pre-filled with its values', async () => {
    categoriesApi.updateCategory.mockResolvedValue({ data: tree[0] })
    renderPage()
    await screen.findByText('Phòng khách')

    await userEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0])

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

    const deleteButtons = screen.getAllByRole('button', { name: 'Xóa' })
    await userEvent.click(deleteButtons[deleteButtons.length - 1])

    await waitFor(() => expect(categoriesApi.deleteCategory).toHaveBeenCalledWith(3))
  })

  it('shows an error toast when deleting a category with active products', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    categoriesApi.deleteCategory.mockRejectedValue(
      new ApiError('HAS_ACTIVE_PRODUCTS', 'Danh mục đang có sản phẩm hoạt động.', null, 409),
    )
    renderPage()
    await screen.findByText('Phòng ngủ')

    const deleteButtons = screen.getAllByRole('button', { name: 'Xóa' })
    await userEvent.click(deleteButtons[deleteButtons.length - 1])

    expect(await screen.findByText('Danh mục đang có sản phẩm hoạt động.')).toBeInTheDocument()
  })
})
