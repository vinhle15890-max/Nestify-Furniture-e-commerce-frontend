import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminReviewsPage } from './AdminReviewsPage'
import * as reviewsApi from '../../../features/admin/reviews/api'
import { Toaster } from '../../../components/Toast'

vi.mock('../../../features/admin/reviews/api')

const pendingReviews = {
  data: [
    {
      id: 1,
      rating: 4,
      title: 'Sản phẩm tốt',
      body: 'Chất lượng ổn, giao hàng nhanh.',
      status: 'pending',
      user: { id: 10, name: 'Bao Le' },
      product: { id: 20, name: 'Sofa Mây', slug: 'sofa-may' },
      purchase: { order_id: 50, order_number: 'NES-50', variant_name: 'Nâu' },
      moderation_flags: ['external_link'],
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-01-10T08:00:00Z',
    },
    {
      id: 2,
      rating: 2,
      title: null,
      body: 'Hơi thất vọng.',
      status: 'pending',
      user: { id: 11, name: 'Mai Anh' },
      product: { id: 21, name: 'Bàn Mộc', slug: 'ban-moc' },
      purchase: { order_id: 51, order_number: 'NES-51', variant_name: 'Sồi' },
      moderation_flags: ['contact_information'],
      created_at: '2026-01-11T08:00:00Z',
      updated_at: '2026-01-11T08:00:00Z',
    },
  ],
  meta: { pagination: { next_cursor: null, has_more: false, limit: 20 } },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminReviewsPage />
      <Toaster />
    </QueryClientProvider>,
  )
}

describe('AdminReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the pending reviews queue', async () => {
    reviewsApi.getReviews.mockResolvedValue(pendingReviews)
    renderPage()

    expect(await screen.findByText('Sản phẩm tốt')).toBeInTheDocument()
    expect(screen.getByText('Chất lượng ổn, giao hàng nhanh.')).toBeInTheDocument()
    expect(screen.getByText('Bao Le')).toBeInTheDocument()
    expect(screen.getByText('Mai Anh')).toBeInTheDocument()
    expect(screen.getByText('Sofa Mây')).toBeInTheDocument()
    expect(screen.getByText('Có liên kết ngoài')).toBeInTheDocument()
  })

  it('approves a review and removes it from the queue', async () => {
    reviewsApi.getReviews.mockResolvedValue(pendingReviews)
    reviewsApi.approveReview.mockResolvedValue({ data: { ...pendingReviews.data[0], status: 'approved' } })
    renderPage()

    await screen.findByText('Sản phẩm tốt')

    const approveButtons = screen.getAllByRole('button', { name: 'Giữ công khai' })
    await userEvent.click(approveButtons[0])

    await waitFor(() => expect(reviewsApi.approveReview).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.queryByText('Sản phẩm tốt')).not.toBeInTheDocument())
    expect(screen.getByText('Mai Anh')).toBeInTheDocument()
  })

  it('rejects a review and removes it from the queue', async () => {
    reviewsApi.getReviews.mockResolvedValue(pendingReviews)
    reviewsApi.rejectReview.mockResolvedValue({ data: { ...pendingReviews.data[1], status: 'rejected' } })
    renderPage()

    await screen.findByText('Mai Anh')

    const rejectButtons = screen.getAllByRole('button', { name: 'Ẩn đánh giá' })
    await userEvent.click(rejectButtons[1])

    await waitFor(() => expect(reviewsApi.rejectReview).toHaveBeenCalledWith(2))
    await waitFor(() => expect(screen.queryByText('Mai Anh')).not.toBeInTheDocument())
    expect(screen.getByText('Bao Le')).toBeInTheDocument()
  })

  it('shows an empty state when there are no pending reviews', async () => {
    reviewsApi.getReviews.mockResolvedValue({
      data: [],
      meta: { pagination: { next_cursor: null, has_more: false, limit: 20 } },
    })
    renderPage()

    expect(await screen.findByText('Không có đánh giá cần xem lại')).toBeInTheDocument()
    expect(screen.getByText('Các đánh giá đã mua hàng đang được đăng bình thường.')).toBeInTheDocument()
  })
})
