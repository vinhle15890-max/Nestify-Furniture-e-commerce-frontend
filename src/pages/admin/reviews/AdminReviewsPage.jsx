/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
import { Star } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminReviews, useApproveReview, useRejectReview } from '../../../features/admin/reviews/hooks'
import { useToastStore } from '../../../store/toastStore'
import { formatDate } from '../../../lib/format'

const FLAG_LABELS = {
  external_link: 'Có liên kết ngoài',
  contact_information: 'Có thông tin liên hệ',
}

const EVIDENCE_LABELS = {
  accurate: 'Màu giống ảnh',
  slightly_different: 'Màu hơi khác ảnh',
  very_different: 'Màu khác nhiều',
  as_expected: 'Kích thước đúng kỳ vọng',
  larger: 'Lớn hơn kỳ vọng',
  smaller: 'Nhỏ hơn kỳ vọng',
  under_month: 'Dùng dưới 1 tháng',
  one_to_six_months: 'Dùng 1–6 tháng',
  over_six_months: 'Dùng trên 6 tháng',
}

export function AdminReviewsPage() {
  const { data, isLoading, isError, isFetching, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useAdminReviews()
  const approveReview = useApproveReview()
  const rejectReview = useRejectReview()
  const addToast = useToastStore((state) => state.addToast)

  const reviews = data?.pages.flatMap((page) => page.data) ?? []

  const handleApprove = async (review) => {
    try {
      await approveReview.mutateAsync(review.id)
    } catch (error) {
      addToast({ title: 'Không thể duyệt đánh giá.', description: error.message, variant: 'error' })
    }
  }

  const handleReject = async (review) => {
    try {
      await rejectReview.mutateAsync(review.id)
    } catch (error) {
      addToast({ title: 'Không thể từ chối đánh giá.', description: error.message, variant: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        icon={Star}
        title="Đánh giá cần xem lại"
        description="Đánh giá sạch từ đơn đã giao được đăng tự động. Hàng chờ này chỉ chứa tín hiệu rủi ro cần quyết định của bạn."
      />

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải đánh giá..." />
        ) : isError && !data ? (
          <LoadErrorState title="Chưa thể tải đánh giá" description="Hãy thử tải lại hàng chờ duyệt." onRetry={refetch} isRetrying={isFetching} />
        ) : reviews.length === 0 ? (
          <div className="border-y border-border py-4">
            <EmptyState
              illustration="chair"
              title="Không có đánh giá cần xem lại"
              description="Các đánh giá đã mua hàng đang được đăng bình thường."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {reviews.map((review) => (
              <li key={review.id} className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:gap-10">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Cần quyết định</p>
                      <p className="mt-1 font-display text-xl text-foreground">{review.product?.name ?? 'Sản phẩm'}</p>
                      <p className="text-sm text-muted-foreground">
                        {review.purchase?.variant_name && `${review.purchase.variant_name} · `}
                        {review.purchase?.order_number ? `Đơn ${review.purchase.order_number}` : 'Đơn hàng đã giao'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{review.user?.name}</p>
                      <p>{review.rating}/5 · {formatDate(review.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-5 border-l-2 border-accent pl-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tín hiệu hệ thống</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-foreground">
                      {(review.moderation_flags ?? []).map((flag) => <span key={flag}>{FLAG_LABELS[flag] ?? flag}</span>)}
                    </div>
                  </div>

                  {review.evidence && (
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      {Object.entries(review.evidence).map(([key, value]) => {
                        if (!value) return null
                        const label = EVIDENCE_LABELS[value] ?? (key === 'material_quality' ? `Chất liệu ${value}/5` : key === 'delivery_experience' ? `Giao nhận ${value}/5` : null)
                        return label ? <span key={key}>— {label}</span> : null
                      })}
                    </div>
                  )}

                  {review.title && <p className="mt-5 font-display text-lg text-foreground">{review.title}</p>}
                  <p className="mt-2 max-w-3xl leading-relaxed text-foreground">{review.body}</p>
                </div>

                <div className="flex gap-2 self-end xl:flex-col xl:items-stretch">
                  <Button
                    variant="secondary"
                    disabled={approveReview.isPending || rejectReview.isPending}
                    onClick={() => handleApprove(review)}
                  >
                    Giữ công khai
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={approveReview.isPending || rejectReview.isPending}
                    onClick={() => handleReject(review)}
                  >
                    Ẩn đánh giá
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Đang tải...' : 'Tải thêm'}
          </Button>
        </div>
      )}
    </div>
  )
}
