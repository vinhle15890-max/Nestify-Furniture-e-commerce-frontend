import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminProductCreatePage } from './AdminProductCreatePage'
import * as productsApi from '../../../features/admin/products/api'
import * as catalogApi from '../../../features/catalog/api'

vi.mock('../../../features/admin/products/api')
vi.mock('../../../features/catalog/api')

// TipTap can't mount in jsdom — swap the editor for a labelled textarea.
vi.mock('../../../components/admin/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, ariaLabel = 'Mô tả', id }) => (
    <textarea id={id} aria-label={ariaLabel} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
  ),
}))

const categoriesResponse = {
  data: [{ id: 1, name: 'Phòng khách', slug: 'phong-khach', parent_id: null, children: [] }],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/products/new']}>
        <Routes>
          <Route path="/admin/products/new" element={<AdminProductCreatePage />} />
          <Route path="/admin/products/:id" element={<div>Trang sửa sản phẩm</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminProductCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogApi.getCategories.mockResolvedValue(categoriesResponse)
  })

  it('creates a product then navigates into its edit page', async () => {
    productsApi.createProduct.mockResolvedValue({ data: { id: 77, name: 'Đèn bàn', slug: 'den-ban' } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Đèn bàn')
    await userEvent.type(screen.getByLabelText('Slug'), 'den-ban')
    await userEvent.selectOptions(await screen.findByLabelText('Danh mục'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))

    await waitFor(() =>
      expect(productsApi.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Đèn bàn', slug: 'den-ban', category_id: 1 }),
      ),
    )
    expect(await screen.findByText('Trang sửa sản phẩm')).toBeInTheDocument()
  })

  it('fills description and SEO fields from the AI draft', async () => {
    productsApi.generateProductDescription.mockResolvedValue({
      data: {
        description: '<p>Đèn bàn gỗ sồi tối giản.</p>',
        meta_title: 'Đèn bàn gỗ sồi | Nestify',
        meta_description: 'Đèn bàn gỗ sồi tối giản, ánh sáng ấm. Mua tại Nestify.',
        focus_keyword: 'đèn bàn gỗ',
      },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Đèn bàn gỗ')
    await userEvent.click(screen.getByRole('button', { name: /Gợi ý bằng AI/ }))

    await waitFor(() => expect(productsApi.generateProductDescription).toHaveBeenCalledTimes(1))
    expect(await screen.findByLabelText('Mô tả')).toHaveValue('<p>Đèn bàn gỗ sồi tối giản.</p>')
    expect(screen.getByLabelText('Tiêu đề SEO')).toHaveValue('Đèn bàn gỗ sồi | Nestify')
  })
})
