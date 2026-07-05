import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminSeoReviewPage } from './AdminSeoReviewPage'
import * as seoApi from '../../../features/admin/seo/api'

vi.mock('../../../features/admin/seo/api')

const pendingDraft = {
  id: 10,
  product_id: 5,
  product_name: 'Bàn gỗ sồi',
  thumbnail: null,
  status: 'pending',
  description: '<p>Bàn gỗ sồi tối giản.</p><h2>Đặc điểm</h2><ul><li>Gỗ sồi</li></ul>',
  meta_title: 'Bàn gỗ sồi tự nhiên cao cấp bền đẹp | Nestify Furniture',
  meta_description:
    'Bàn gỗ sồi tự nhiên, khung chắc chắn, phù hợp phòng ăn hiện đại. Bảo hành 5 năm, giao nhanh toàn quốc. Mua ngay tại Nestify hôm nay.',
  focus_keyword: 'bàn gỗ sồi',
  error: null,
  generated_at: '2026-07-04T00:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/products/seo']}>
        <Routes>
          <Route path="/admin/products/seo" element={<AdminSeoReviewPage />} />
          <Route path="/admin/products/:id" element={<div>Trang sửa sản phẩm</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminSeoReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seoApi.getSeoDrafts.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'pending'
          ? { data: [pendingDraft], meta: { last_page: 1 } }
          : { data: [], meta: { last_page: 1 } },
      ),
    )
    seoApi.getSeoBatch.mockResolvedValue({ data: { id: 'b1', total: 1, processed: 1, failed: 0, finished: true } })
  })

  it('renders a pending draft with its SEO score', async () => {
    renderPage()
    expect(await screen.findByText('Bàn gỗ sồi')).toBeInTheDocument()
    expect(screen.getByText(/SEO \d+/)).toBeInTheDocument()
  })

  it('applies a draft via the apply endpoint', async () => {
    seoApi.applySeoDraft.mockResolvedValue({ data: { product_id: 5, status: 'applied' } })
    renderPage()
    await screen.findByText('Bàn gỗ sồi')

    await userEvent.click(screen.getByRole('button', { name: /Áp dụng/ }))

    await waitFor(() => expect(seoApi.applySeoDraft).toHaveBeenCalledWith(5))
  })

  it('dismisses a draft via the dismiss endpoint', async () => {
    seoApi.dismissSeoDraft.mockResolvedValue({ data: { product_id: 5, status: 'dismissed' } })
    renderPage()
    await screen.findByText('Bàn gỗ sồi')

    await userEvent.click(screen.getByRole('button', { name: /Bỏ bản nháp/ }))

    await waitFor(() => expect(seoApi.dismissSeoDraft).toHaveBeenCalledWith(5))
  })

  it('queues generation for products missing SEO', async () => {
    seoApi.bulkGenerateSeo.mockResolvedValue({ data: { batch_id: 'b1', queued: 3 } })
    renderPage()
    await screen.findByText('Bàn gỗ sồi')

    await userEvent.click(screen.getByRole('button', { name: /Sinh cho SP thiếu SEO/ }))

    await waitFor(() => expect(seoApi.bulkGenerateSeo).toHaveBeenCalledWith({ scope: 'missing' }))
  })

  it('retries a failed draft from the Lỗi tab', async () => {
    const failedDraft = { ...pendingDraft, id: 11, status: 'failed', error: 'Gemini quá tải' }
    seoApi.getSeoDrafts.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'failed'
          ? { data: [failedDraft], meta: { last_page: 1 } }
          : { data: [], meta: { last_page: 1 } },
      ),
    )
    seoApi.bulkGenerateSeo.mockResolvedValue({ data: { batch_id: 'b2', queued: 1 } })
    renderPage()

    await userEvent.click(screen.getByRole('tab', { name: 'Lỗi' }))
    expect(await screen.findByText('Gemini quá tải')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Sinh lại/ }))

    await waitFor(() =>
      expect(seoApi.bulkGenerateSeo).toHaveBeenCalledWith({ scope: 'selected', product_ids: [5] }),
    )
  })
})
