import { Star } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { PageHeader } from '../../../components/admin/PageHeader'
import { useAdminReviews, useApproveReview, useRejectReview } from '../../../features/admin/reviews/hooks'
import { useToastStore } from '../../../store/toastStore'
import { formatDate } from '../../../lib/format'

export function AdminReviewsPage() {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useAdminReviews()
  const approveReview = useApproveReview()
  const rejectReview = useRejectReview()
  const addToast = useToastStore((state) => state.addToast)

  const reviews = data?.pages.flatMap((page) => page.data) ?? []

  const handleApprove = async (review) => {
    try {
      await approveReview.mutateAsync(review.id)
      addToast({ title: 'Đã duyệt đánh giá.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể duyệt đánh giá.', description: error.message, variant: 'error' })
    }
  }

  const handleReject = async (review) => {
    try {
      await rejectReview.mutateAsync(review.id)
      addToast({ title: 'Đã từ chối đánh giá.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể từ chối đánh giá.', description: error.message, variant: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        icon={Star}
        title="Đánh giá chờ duyệt"
        description="Kiểm duyệt đánh giá của khách trước khi hiển thị công khai."
      />

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải đánh giá..." />
        ) : reviews.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Không có đánh giá chờ duyệt.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((review) => (
              <li key={review.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{review.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {review.rating}/5 · {formatDate(review.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={approveReview.isPending || rejectReview.isPending}
                        onClick={() => handleApprove(review)}
                      >
                        Duyệt
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={approveReview.isPending || rejectReview.isPending}
                        onClick={() => handleReject(review)}
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>

                  {review.title && <p className="font-medium text-foreground">{review.title}</p>}
                  <p className="text-sm text-foreground">{review.body}</p>

                  {review.comments?.length > 0 && (
                    <ul className="flex flex-col gap-2 border-t border-border pt-3">
                      {review.comments.map((comment) => (
                        <li key={comment.id} className="pl-4 text-sm">
                          <p className="font-medium text-foreground">
                            {comment.user?.name}{' '}
                            <span className="font-normal text-muted-foreground">· {formatDate(comment.created_at)}</span>
                          </p>
                          <p className="text-muted-foreground">{comment.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
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
