/* Hallmark · macrostructure: inventory workbench · tone: utilitarian · anchor hue: Nestify tokens */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 · contrast/mobile/tokens: pass */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardList, Download, History, Search, Warehouse } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { EmptyState } from '../../../components/admin/EmptyState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import {
  useAdjustVariantStock,
  useExportVariantStockMovements,
  useInventoryVariants,
  useVariantStockMovements,
} from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'

const MOVEMENT_LABELS = {
  opening_balance: 'Số dư đầu kỳ',
  adjustment: 'Điều chỉnh kiểm kê',
  stock_in: 'Nhập hàng',
  stock_out: 'Xuất kho thủ công',
  inventory_gain: 'Tăng sau kiểm kê',
  inventory_loss: 'Giảm sau kiểm kê',
  reserve: 'Giữ hàng',
  release: 'Nhả hàng',
  commit: 'Xuất kho',
  restock: 'Nhập lại kho',
}

const OPERATIONS = [
  { value: 'stock_in', label: 'Nhập hàng', description: 'Hàng mới thực tế vào kho', direction: 1 },
  { value: 'stock_out', label: 'Xuất kho', description: 'Trưng bày hoặc sử dụng nội bộ', direction: -1 },
  { value: 'inventory_gain', label: 'Tăng kiểm kê', description: 'Thực tế nhiều hơn hệ thống', direction: 1 },
  { value: 'inventory_loss', label: 'Hao hụt / hư hỏng', description: 'Mất, hỏng hoặc thiếu sau kiểm kê', direction: -1 },
]

function variantName(variant) {
  const product = variant.product_name || 'Sản phẩm'
  return variant.name ? `${product} · ${variant.name}` : product
}

function MovementHistory({ variant }) {
  const id = variant?.id
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ type: '', date_from: '', date_to: '', reference: '', actor: '' })
  const [exportError, setExportError] = useState('')
  const queryFilters = { ...filters, page }
  const { data, isLoading, isError, isFetching, refetch } = useVariantStockMovements(id, queryFilters)
  const exportLedger = useExportVariantStockMovements()
  const movements = data?.data?.data ?? []
  const meta = data?.data ?? { last_page: 1 }

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  const downloadCsv = () => {
    setExportError('')
    exportLedger.mutate({ id, filters }, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `so-kho-${variant.sku}.csv`
        anchor.click()
        URL.revokeObjectURL(url)
      },
      onError: (error) => setExportError(error.message || 'Không thể xuất sổ kho. Hãy thử lại.'),
    })
  }

  if (!variant) {
    return <EmptyState icon={History} title="Chọn một biến thể" description="Lịch sử nhập, giữ, xuất và điều chỉnh sẽ hiển thị tại đây." />
  }
  if (isLoading) return <Spinner label="Đang tải lịch sử kho..." />
  if (isError) return <LoadErrorState title="Chưa thể tải lịch sử kho" description="Biến thể vẫn được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-foreground">Nghiệp vụ
          <select className="min-h-12 rounded-control border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
            <option value="">Tất cả nghiệp vụ</option>
            {Object.entries(MOVEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-foreground">Mã chứng từ
          <input className="min-h-12 rounded-control border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.reference} onChange={(event) => updateFilter('reference', event.target.value)} placeholder="Ví dụ: PN-2026-034" />
        </label>
        <label className="grid gap-1 text-sm text-foreground">Từ ngày
          <input type="date" className="min-h-12 rounded-control border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm text-foreground">Đến ngày
          <input type="date" min={filters.date_from || undefined} className="min-h-12 rounded-control border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm text-foreground sm:col-span-2">Nhân viên
          <input className="min-h-12 rounded-control border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.actor} onChange={(event) => updateFilter('actor', event.target.value)} placeholder="Tìm theo tên người thực hiện" />
        </label>
      </div>
      <Button type="button" variant="secondary" onClick={downloadCsv} disabled={exportLedger.isPending || movements.length === 0}>
        <Download size={16} aria-hidden="true" /> {exportLedger.isPending ? 'Đang xuất...' : 'Xuất CSV theo bộ lọc'}
      </Button>
      {exportError && <p className="text-sm text-destructive" role="alert">{exportError}</p>}
      {movements.length === 0 ? <EmptyState icon={ClipboardList} title="Không có biến động phù hợp" description="Thử thay đổi khoảng ngày hoặc bộ lọc sổ kho." /> : <ol className="divide-y divide-border" aria-label={`Lịch sử kho ${variantName(variant)}`}>
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
            {movement.reference && <p className="mt-1 text-xs font-medium text-foreground">Chứng từ: {movement.reference}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {movement.actor?.name || 'Hệ thống'} · {new Date(movement.created_at).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="grid gap-1 text-sm sm:justify-items-end">
            <span className={movement.quantity_delta > 0 ? 'font-medium text-secondary' : movement.quantity_delta < 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}>
              {movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}
            </span>
            <span className="text-muted-foreground">Thực tế {movement.stock_before} → {movement.stock_after}</span>
            <span className="text-muted-foreground">Đang giữ {movement.reserved_before} → {movement.reserved_after}</span>
            <span className="text-muted-foreground">Khả dụng {movement.stock_before - movement.reserved_before} → {movement.stock_after - movement.reserved_after}</span>
          </div>
        </li>
      ))}
      </ol>}
      <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
    </div>
  )
}

export function AdminInventoryPage() {
  const [threshold, setThreshold] = useState(5)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [operation, setOperation] = useState('stock_in')
  const [quantity, setQuantity] = useState('')
  const [reference, setReference] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [selectionMessage, setSelectionMessage] = useState('')
  const { data, isLoading, isError, isFetching, refetch } = useInventoryVariants({ q: search.trim(), threshold, lowStockOnly, page })
  const adjust = useAdjustVariantStock()
  const addToast = useToastStore((state) => state.addToast)
  const variants = data?.data ?? []
  const meta = data?.meta ?? { last_page: 1 }
  const selected = variants.find((variant) => variant.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId || isLoading || !data) return
    if (!(data.data ?? []).some((variant) => variant.id === selectedId)) {
      setSelectedId(null)
      setSelectionMessage('Lựa chọn trước đã được bỏ vì không có trên trang này.')
    }
  }, [data, isLoading, selectedId])

  const selectVariant = (variant) => {
    setSelectedId(variant.id)
    setSelectionMessage('')
    setOperation('stock_in')
    setQuantity('')
    setReference('')
    setReason('')
    setFormError('')
  }

  const submitAdjustment = (event) => {
    event.preventDefault()
    const absoluteQuantity = Number(quantity)
    const selectedOperation = OPERATIONS.find((item) => item.value === operation)
    if (!selected || !selectedOperation || !Number.isInteger(absoluteQuantity) || absoluteQuantity <= 0 || reason.trim().length < 3) {
      setFormError('Nhập số lượng nguyên lớn hơn 0 và lý do ít nhất 3 ký tự.')
      return
    }
    const quantityDelta = absoluteQuantity * selectedOperation.direction
    const stockAfter = selected.stock_quantity + quantityDelta
    if (stockAfter < selected.reserved_quantity) {
      setFormError(`Không thể giảm xuống ${stockAfter} vì đang có ${selected.reserved_quantity} sản phẩm được giữ cho đơn hàng.`)
      return
    }
    setFormError('')
    adjust.mutate(
      {
        id: selected.id,
        operation,
        quantity_delta: quantityDelta,
        reference: reference.trim() || null,
        reason: reason.trim(),
        idempotency_key: `admin-inventory:${selected.id}:${crypto.randomUUID()}`,
      },
      {
        onSuccess: () => {
          addToast({ title: 'Đã ghi nhận điều chỉnh tồn kho.', variant: 'success' })
          setQuantity('')
          setReference('')
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h3 className="font-display text-lg text-foreground">Tìm biến thể</h3>
            <p className="mt-1 text-sm text-muted-foreground">Tồn khả dụng = tồn thực tế − số lượng đang giữ cho đơn hàng.</p>
            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} aria-hidden="true" />
              <span className="sr-only">Tìm theo SKU, sản phẩm hoặc tên biến thể</span>
              <input className="min-h-12 w-full rounded-control border border-border bg-background pl-10 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setSelectedId(null) }} placeholder="SKU, tên sản phẩm hoặc biến thể" />
            </label>
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
          <fieldset>
            <legend className="mb-1 text-sm text-foreground">Phạm vi danh sách</legend>
            <div className="flex flex-wrap gap-2">
              {[
                { value: true, label: 'Cần bổ sung' },
                { value: false, label: 'Tất cả tồn kho' },
              ].map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  aria-pressed={lowStockOnly === filter.value}
                  onClick={() => { setLowStockOnly(filter.value); setPage(1); setSelectedId(null) }}
                  className={`min-h-12 whitespace-nowrap rounded-control border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${lowStockOnly === filter.value ? 'border-foreground bg-foreground text-surface' : 'border-border bg-background text-foreground hover:border-border-strong'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </Panel>

      <div className="grid min-w-0 gap-6 xl:h-[calc(100dvh-20rem)] xl:min-h-[44rem] xl:max-h-[70rem] xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Panel padded={false} className="flex min-h-0 flex-col">
          <div className="shrink-0 border-b border-border px-5 py-4">
            <h3 className="font-display text-lg text-foreground">{lowStockOnly ? 'Cần bổ sung hàng' : 'Tất cả biến thể'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{search ? `Kết quả cho “${search}”.` : 'Ưu tiên từ tồn khả dụng thấp nhất.'}</p>
          </div>
          {isLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6"><Spinner label="Đang tải tồn kho..." /></div>
          ) : isError && !data ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-6"><LoadErrorState title="Chưa thể tải tồn kho" description="Ngưỡng hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} /></div>
          ) : variants.length === 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-6"><EmptyState icon={Warehouse} title="Không tìm thấy biến thể" description={search ? 'Thử SKU hoặc tên khác.' : `Không có biến thể nào ở mức ${threshold} sản phẩm trở xuống.`} /></div>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain" aria-label="Biến thể tồn kho thấp">
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
          <div className="grid shrink-0 gap-3 border-t border-border bg-surface px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-center text-xs tabular-nums text-muted-foreground sm:text-left">
              Trang {meta.current_page ?? page}/{meta.last_page ?? 1}
              {Number.isFinite(meta.total) ? ` · ${meta.total} biến thể` : ''}
            </p>
            <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={(next) => { setSelectionMessage(''); setPage(next) }} />
          </div>
          {selectionMessage && <p className="shrink-0 border-t border-border px-4 py-2 text-xs text-muted-foreground" role="status">{selectionMessage}</p>}
        </Panel>

        <div className="min-w-0 space-y-6 xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <Panel>
            <h3 className="font-display text-lg text-foreground">Ghi phiếu kho</h3>
            {selected ? (
              <form className="mt-4 space-y-4" onSubmit={submitAdjustment}>
                <p className="text-sm font-medium text-foreground">{variantName(selected)}</p>
                <dl className="grid grid-cols-3 gap-2 rounded-control border border-border bg-surface-alt/40 p-3 text-center">
                  <div><dt className="text-xs text-muted-foreground">Thực tế</dt><dd className="mt-1 font-display text-xl text-foreground">{selected.stock_quantity}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Đang giữ</dt><dd className="mt-1 font-display text-xl text-foreground">{selected.reserved_quantity}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Có thể bán</dt><dd className="mt-1 font-display text-xl text-foreground">{selected.available_stock}</dd></div>
                </dl>
                <fieldset>
                  <legend className="text-sm font-medium text-foreground">Chọn nghiệp vụ</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {OPERATIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={operation === item.value}
                        onClick={() => setOperation(item.value)}
                        className={`min-w-0 whitespace-nowrap rounded-control border p-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${operation === item.value ? 'border-foreground bg-surface-alt text-foreground' : 'border-border bg-background text-foreground hover:border-border-strong'}`}
                      >
                        {item.direction > 0 ? '+ ' : '− '}{item.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{OPERATIONS.find((item) => item.value === operation)?.description}</p>
                </fieldset>
                <div>
                  <label className="grid gap-1 text-sm text-foreground">Số lượng
                    <input aria-invalid={Boolean(formError)} className="min-h-12 rounded-control border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Ví dụ: 5" />
                  </label>
                </div>
                <div className="grid gap-1">
                  <label className="grid gap-1 text-sm text-foreground">Mã phiếu / chứng từ (không bắt buộc)
                    <input className="min-h-12 rounded-control border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength="100" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ví dụ: PN-2026-034" />
                  </label>
                  {operation === 'stock_in' && <span className="text-xs text-muted-foreground">Nên nhập số phiếu nhập</span>}
                </div>
                <label className="grid gap-1 text-sm text-foreground">Lý do
                  <textarea aria-invalid={Boolean(formError)} className="min-h-24 resize-y rounded-control border border-border bg-background px-3 py-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Kiểm kê kho tuần 34" />
                </label>
                {Number(quantity) > 0 && (
                  <div className="rounded-control border border-border bg-surface-alt/40 p-3 text-sm text-foreground" aria-live="polite">
                    <span className="flex items-center gap-2 font-medium">
                      {OPERATIONS.find((item) => item.value === operation)?.direction === 1 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      Dự kiến: tồn thực tế {selected.stock_quantity} → {selected.stock_quantity + Number(quantity) * (OPERATIONS.find((item) => item.value === operation)?.direction ?? 1)}
                    </span>
                    <span className="mt-1 block text-muted-foreground">Tồn khả dụng {selected.available_stock} → {selected.available_stock + Number(quantity) * (OPERATIONS.find((item) => item.value === operation)?.direction ?? 1)}</span>
                  </div>
                )}
                <p className={`min-h-5 text-sm ${formError ? 'text-destructive' : 'text-muted-foreground'}`} role={formError ? 'alert' : undefined}>{formError || 'Mỗi điều chỉnh được lưu vào sổ kho và không thể sửa lịch sử.'}</p>
                <Button type="submit" disabled={adjust.isPending}>{adjust.isPending ? 'Đang ghi nhận...' : 'Ghi phiếu kho'}</Button>
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
