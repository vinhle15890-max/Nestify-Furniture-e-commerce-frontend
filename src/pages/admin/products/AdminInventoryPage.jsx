import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardList, History, Warehouse } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { EmptyState } from '../../../components/admin/EmptyState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import {
  useAdjustVariantStock,
  useLowStockVariants,
  useVariantStockMovements,
} from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'

const MOVEMENT_LABELS = {
  opening_balance: 'Số dư đầu kỳ',
  adjustment: 'Điều chỉnh kiểm kê',
  reserve: 'Giữ hàng',
  release: 'Nhả hàng',
  commit: 'Xuất kho',
  restock: 'Nhập lại kho',
}

function variantName(variant) {
  const product = variant.product_name || 'Sản phẩm'
  return variant.name ? `${product} · ${variant.name}` : product
}

function MovementHistory({ variant }) {
  const id = variant?.id
  const { data, isLoading, isError, isFetching, refetch } = useVariantStockMovements(id)
  const movements = data?.data?.data ?? []

  if (!variant) {
    return <EmptyState icon={History} title="Chọn một biến thể" description="Lịch sử nhập, giữ, xuất và điều chỉnh sẽ hiển thị tại đây." />
  }
  if (isLoading) return <Spinner label="Đang tải lịch sử kho..." />
  if (isError) return <LoadErrorState title="Chưa thể tải lịch sử kho" description="Biến thể vẫn được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
  if (movements.length === 0) {
    return <EmptyState icon={ClipboardList} title="Chưa có biến động" description="Biến thể này chưa phát sinh nghiệp vụ kho." />
  }

  return (
    <ol className="divide-y divide-border" aria-label={`Lịch sử kho ${variantName(variant)}`}>
      {movements.map((movement) => (
        <li key={movement.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{MOVEMENT_LABELS[movement.type] ?? movement.type}</span>
              {movement.order?.order_number && (
                <Link className="whitespace-nowrap text-sm text-accent hover:underline" to={`/admin/orders/${movement.order.id}`}>
                  {movement.order.order_number}
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{movement.reason || 'Không có ghi chú'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {movement.actor?.name || 'Hệ thống'} · {new Date(movement.created_at).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className={movement.quantity_delta > 0 ? 'text-secondary' : movement.quantity_delta < 0 ? 'text-destructive' : 'text-muted-foreground'}>
              {movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}
            </span>
            <span className="text-sm text-muted-foreground">{movement.stock_before} → {movement.stock_after}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function AdminInventoryPage() {
  const [threshold, setThreshold] = useState(5)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const { data, isLoading, isError, isFetching, refetch } = useLowStockVariants({ threshold, page })
  const adjust = useAdjustVariantStock()
  const addToast = useToastStore((state) => state.addToast)
  const variants = data?.data ?? []
  const meta = data?.meta ?? { last_page: 1 }
  const selected = variants.find((variant) => variant.id === selectedId) ?? null

  const selectVariant = (variant) => {
    setSelectedId(variant.id)
    setDelta('')
    setReason('')
    setFormError('')
  }

  const submitAdjustment = (event) => {
    event.preventDefault()
    const quantityDelta = Number(delta)
    if (!selected || !Number.isInteger(quantityDelta) || quantityDelta === 0 || reason.trim().length < 3) {
      setFormError('Nhập số lượng nguyên khác 0 và lý do ít nhất 3 ký tự.')
      return
    }
    setFormError('')
    adjust.mutate(
      {
        id: selected.id,
        quantity_delta: quantityDelta,
        reason: reason.trim(),
        idempotency_key: `admin-inventory:${selected.id}:${crypto.randomUUID()}`,
      },
      {
        onSuccess: () => {
          addToast({ title: 'Đã ghi nhận điều chỉnh tồn kho.', variant: 'success' })
          setDelta('')
          setReason('')
        },
        onError: (error) => setFormError(error.message || 'Không thể điều chỉnh tồn kho.'),
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Warehouse} title="Tồn kho" description="Phát hiện hàng sắp hết, kiểm kê có lý do và truy vết từng biến động." />

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-foreground">Ngưỡng cảnh báo</h3>
            <p className="mt-1 text-sm text-muted-foreground">Tồn khả dụng = tồn thực tế − số lượng đang giữ cho đơn hàng.</p>
          </div>
          <label className="grid gap-1 text-sm text-foreground">
            Báo khi tồn khả dụng không quá
            <input
              className="min-h-12 w-40 rounded-control border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="number"
              min="0"
              max="1000"
              value={threshold}
              onChange={(event) => { setThreshold(Math.max(0, Math.min(1000, Number(event.target.value) || 0))); setPage(1) }}
            />
          </label>
        </div>
      </Panel>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Panel padded={false}>
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-display text-lg text-foreground">Cần bổ sung hàng</h3>
            <p className="mt-1 text-sm text-muted-foreground">Ưu tiên từ tồn khả dụng thấp nhất.</p>
          </div>
          {isLoading ? (
            <div className="p-6"><Spinner label="Đang tải tồn kho..." /></div>
          ) : isError && !data ? (
            <div className="p-6"><LoadErrorState title="Chưa thể tải tồn kho" description="Ngưỡng hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} /></div>
          ) : variants.length === 0 ? (
            <div className="p-6"><EmptyState icon={Warehouse} title="Tồn kho đang an toàn" description={`Không có biến thể nào ở mức ${threshold} sản phẩm trở xuống.`} /></div>
          ) : (
            <ul className="divide-y divide-border" aria-label="Biến thể tồn kho thấp">
              {variants.map((variant) => (
                <li key={variant.id} className={selectedId === variant.id ? 'bg-surface-alt/60' : ''}>
                  <button type="button" onClick={() => selectVariant(variant)} className="flex min-h-16 w-full items-center gap-3 px-5 py-4 text-left outline-none transition-colors hover:bg-surface-alt/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-control ${variant.available_stock <= 0 ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
                      <AlertTriangle size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{variantName(variant)}</span>
                      <span className="block text-xs text-muted-foreground">SKU {variant.sku} · thực tế {variant.stock_quantity} · đang giữ {variant.reserved_quantity}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block font-display text-2xl ${variant.available_stock <= 0 ? 'text-destructive' : 'text-foreground'}`}>{variant.available_stock}</span>
                      <span className="block text-xs text-muted-foreground">khả dụng</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border p-4"><Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={(next) => { setPage(next); setSelectedId(null) }} /></div>
        </Panel>

        <div className="min-w-0 space-y-6">
          <Panel>
            <h3 className="font-display text-lg text-foreground">Điều chỉnh kiểm kê</h3>
            {selected ? (
              <form className="mt-4 space-y-4" onSubmit={submitAdjustment}>
                <p className="text-sm font-medium text-foreground">{variantName(selected)}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-foreground">Số lượng tăng/giảm
                    <input aria-invalid={Boolean(formError)} className="min-h-12 rounded-control border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" type="number" step="1" value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="Ví dụ: 5 hoặc -2" />
                  </label>
                  <div className="self-end text-sm text-muted-foreground">
                    {Number(delta) > 0 ? <span className="flex min-h-12 items-center gap-2"><ArrowUp size={16} /> Nhập thêm</span> : Number(delta) < 0 ? <span className="flex min-h-12 items-center gap-2"><ArrowDown size={16} /> Giảm kho</span> : <span className="flex min-h-12 items-center">Chưa thay đổi</span>}
                  </div>
                </div>
                <label className="grid gap-1 text-sm text-foreground">Lý do kiểm kê
                  <textarea aria-invalid={Boolean(formError)} className="min-h-24 resize-y rounded-control border border-border bg-background px-3 py-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Kiểm kê kho tuần 34" />
                </label>
                <p className={`min-h-5 text-sm ${formError ? 'text-destructive' : 'text-muted-foreground'}`} role={formError ? 'alert' : undefined}>{formError || 'Mỗi điều chỉnh được lưu vào sổ kho và không thể sửa lịch sử.'}</p>
                <Button type="submit" disabled={adjust.isPending}>{adjust.isPending ? 'Đang ghi nhận...' : 'Ghi nhận điều chỉnh'}</Button>
              </form>
            ) : <p className="mt-3 text-sm text-muted-foreground">Chọn một biến thể trong danh sách để kiểm kê.</p>}
          </Panel>
          <Panel>
            <h3 className="font-display text-lg text-foreground">Lịch sử biến động</h3>
            <div className="mt-3"><MovementHistory variant={selected} /></div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
