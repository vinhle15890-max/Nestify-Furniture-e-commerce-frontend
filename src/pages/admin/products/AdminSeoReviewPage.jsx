import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Check, X, Pencil, RefreshCw, ImageOff } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useToastStore } from '../../../store/toastStore'
import { computeSeoScore } from '../../../lib/seoScore'
import {
  useSeoDrafts,
  useBulkGenerateSeo,
  useSeoBatch,
  useApplyDraft,
  useDismissDraft,
} from '../../../features/admin/seo/hooks'

const TABS = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'failed', label: 'Lỗi' },
]

function scoreTone(score) {
  if (score >= 80) return 'text-secondary'
  if (score >= 50) return 'text-accent'
  return 'text-destructive'
}

function ScoreBadge({ draft }) {
  const { score } = computeSeoScore({
    metaTitle: draft.meta_title,
    metaDescription: draft.meta_description,
    description: draft.description,
    focusKeyword: draft.focus_keyword,
  })
  return (
    <span className={`shrink-0 text-sm font-semibold ${scoreTone(score)}`} title="Điểm SEO ước tính">
      SEO {score}
    </span>
  )
}

function Thumbnail({ url, alt }) {
  if (!url) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-surface-alt text-muted-foreground">
        <ImageOff size={18} aria-hidden="true" />
      </span>
    )
  }
  return <img src={url} alt={alt} className="h-12 w-12 shrink-0 rounded-control object-cover" />
}

function PendingRow({ draft, onApply, onDismiss, busy }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <Thumbnail url={draft.thumbnail} alt={draft.product_name ?? ''} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-foreground">{draft.product_name}</p>
          <ScoreBadge draft={draft} />
        </div>
        <p className="mt-1 truncate text-sm text-foreground">{draft.meta_title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{draft.meta_description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button onClick={() => onApply(draft)} disabled={busy}>
          <Check size={15} aria-hidden="true" /> Áp dụng
        </Button>
        <Link
          to={`/admin/products/${draft.product_id}`}
          className="inline-flex items-center gap-1.5 rounded-control border border-foreground px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          <Pencil size={15} aria-hidden="true" /> Sửa
        </Link>
        <Button variant="ghost" onClick={() => onDismiss(draft)} disabled={busy} aria-label={`Bỏ bản nháp ${draft.product_name}`}>
          <X size={15} aria-hidden="true" /> Bỏ
        </Button>
      </div>
    </div>
  )
}

function FailedRow({ draft, onRetry, busy }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Thumbnail url={draft.thumbnail} alt={draft.product_name ?? ''} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{draft.product_name}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-destructive">{draft.error ?? 'Sinh thất bại'}</p>
      </div>
      <Button variant="secondary" onClick={() => onRetry(draft)} disabled={busy} className="shrink-0">
        <RefreshCw size={15} aria-hidden="true" /> Sinh lại
      </Button>
    </div>
  )
}

export function AdminSeoReviewPage() {
  const [tab, setTab] = useState('pending')
  const [page, setPage] = useState(1)
  const [batchId, setBatchId] = useState(null)
  const addToast = useToastStore((state) => state.addToast)

  const { data, isLoading } = useSeoDrafts({ status: tab, page })
  const bulk = useBulkGenerateSeo()
  const apply = useApplyDraft()
  const dismiss = useDismissDraft()
  const { data: batchData } = useSeoBatch(batchId, { enabled: Boolean(batchId) })
  const batch = batchData?.data

  const drafts = data?.data ?? []
  const meta = data?.meta ?? { last_page: 1 }
  const busy = apply.isPending || dismiss.isPending

  const runBulk = (payload, emptyMessage) => {
    bulk.mutate(payload, {
      onSuccess: (res) => {
        const { batch_id, queued } = res.data ?? {}
        if (!queued) {
          addToast({ title: emptyMessage, variant: 'default' })
          return
        }
        setBatchId(batch_id)
        addToast({ title: `Đã xếp ${queued} sản phẩm vào hàng đợi sinh SEO`, variant: 'default' })
      },
      onError: (error) => addToast({ title: error.message ?? 'Không thể sinh SEO', variant: 'destructive' }),
    })
  }

  const handleGenerateMissing = () =>
    runBulk({ scope: 'missing' }, 'Không có sản phẩm nào thiếu SEO')

  const handleRetry = (draft) =>
    runBulk({ scope: 'selected', product_ids: [draft.product_id] }, 'Không thể sinh lại')

  const changeTab = (id) => {
    setTab(id)
    setPage(1)
  }

  const handleApply = (draft) =>
    apply.mutate(draft.product_id, {
      onSuccess: () => addToast({ title: `Đã áp dụng SEO cho "${draft.product_name}"`, variant: 'default' }),
      onError: (error) => addToast({ title: error.message ?? 'Không thể áp dụng', variant: 'destructive' }),
    })

  const handleDismiss = (draft) =>
    dismiss.mutate(draft.product_id, {
      onSuccess: () => addToast({ title: 'Đã bỏ bản nháp', variant: 'default' }),
      onError: (error) => addToast({ title: error.message ?? 'Không thể bỏ', variant: 'destructive' }),
    })

  const batchRunning = batch && !batch.finished

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="Duyệt SEO"
        description="Xem và áp dụng các bản mô tả SEO do AI sinh hàng loạt."
        actions={
          <Button onClick={handleGenerateMissing} disabled={bulk.isPending}>
            <Sparkles size={16} aria-hidden="true" />
            Sinh cho SP thiếu SEO
          </Button>
        }
      />

      {batchRunning && (
        <div className="mt-4 rounded-card border border-border bg-surface-alt/50 px-4 py-3 text-sm text-muted-foreground">
          Đang sinh… {batch.processed}/{batch.total} xong{batch.failed ? `, ${batch.failed} lỗi` : ''}.
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => changeTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải bản nháp..." />
        ) : drafts.length === 0 ? (
          <Card>
            <EmptyState
              illustration="sofa"
              title={tab === 'pending' ? 'Chưa có bản nháp nào' : 'Không có bản lỗi'}
              description={
                tab === 'pending'
                  ? 'Bấm "Sinh cho SP thiếu SEO" để tạo bản nháp cho các sản phẩm còn thiếu.'
                  : 'Các bản sinh lỗi (do quá tải AI) sẽ hiện ở đây để bạn thử lại.'
              }
            />
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-card border border-border bg-surface shadow-soft">
            {drafts.map((draft) =>
              tab === 'pending' ? (
                <PendingRow key={draft.id} draft={draft} onApply={handleApply} onDismiss={handleDismiss} busy={busy} />
              ) : (
                <FailedRow key={draft.id} draft={draft} onRetry={handleRetry} busy={bulk.isPending} />
              ),
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
      </div>
    </div>
  )
}
