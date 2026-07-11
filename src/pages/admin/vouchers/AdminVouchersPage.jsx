import { useState } from 'react'
import { Ticket } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminVouchers, useDeleteVoucher } from '../../../features/admin/vouchers/hooks'
import { useToastStore } from '../../../store/toastStore'
import { formatPrice, formatDate } from '../../../lib/format'
import { VoucherFormModal } from './VoucherFormModal'

const STATUS_LABELS = {
  active: { label: 'Hoạt động', tone: 'in-stock' },
  inactive: { label: 'Tạm ngưng', tone: 'neutral' },
}

const TYPE_LABELS = {
  fixed: 'Số tiền cố định',
  percentage: 'Phần trăm',
}

function formatValue(voucher) {
  return voucher.type === 'percentage' ? `${voucher.value}%` : formatPrice(voucher.value)
}

function formatDateRange(voucher) {
  if (!voucher.starts_at && !voucher.expires_at) return '—'
  const start = voucher.starts_at ? formatDate(voucher.starts_at) : '—'
  const end = voucher.expires_at ? formatDate(voucher.expires_at) : '—'
  return `${start} – ${end}`
}

export function AdminVouchersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, isFetching, refetch } = useAdminVouchers(page)
  const deleteVoucher = useDeleteVoucher()
  const addToast = useToastStore((state) => state.addToast)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState(null)

  const vouchers = data?.data ?? []
  // VoucherController returns a plain resource collection → Laravel's default
  // pagination meta (flat `meta.last_page`), unlike the hand-built `meta.pagination`
  // shape used by the users/audit-logs endpoints.
  const meta = data?.meta ?? { last_page: 1 }

  const openCreateModal = () => {
    setEditingVoucher(null)
    setModalOpen(true)
  }

  const openEditModal = (voucher) => {
    setEditingVoucher(voucher)
    setModalOpen(true)
  }

  const handleDelete = async (voucher) => {
    if (!window.confirm(`Xóa voucher "${voucher.code}"?`)) return

    try {
      await deleteVoucher.mutateAsync(voucher.id)
      addToast({ title: 'Đã xóa voucher.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể xóa voucher.', description: error.message, variant: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        icon={Ticket}
        title="Voucher"
        description="Tạo và quản lý mã giảm giá cho khách hàng."
        actions={<Button onClick={openCreateModal}>Thêm voucher</Button>}
      />

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải voucher..." />
        ) : isError && !data ? (
          <LoadErrorState title="Chưa thể tải voucher" description="Trang hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        ) : vouchers.length === 0 ? (
          <Card>
            <EmptyState
              illustration="lamp"
              title="Chưa có voucher nào"
              description="Tạo voucher để chạy khuyến mãi."
            />
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách voucher</caption>
              <thead>
                <tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Giá trị</th>
                  <th className="px-4 py-3">Sử dụng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thời hạn</th>
                  <th className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => {
                  const statusInfo = STATUS_LABELS[voucher.status] ?? { label: voucher.status, tone: 'neutral' }
                  return (
                    <tr key={voucher.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                      <td className="px-4 py-3 font-medium text-foreground">{voucher.code}</td>
                      <td className="px-4 py-3 text-foreground">{TYPE_LABELS[voucher.type] ?? voucher.type}</td>
                      <td className="px-4 py-3 text-foreground">{formatValue(voucher)}</td>
                      <td className="px-4 py-3 text-foreground">
                        {voucher.current_usage}/{voucher.max_usage_total}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{formatDateRange(voucher)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-4">
                          <button
                            type="button"
                            aria-label={`Sửa voucher ${voucher.code}`}
                            className="cursor-pointer text-foreground transition-colors hover:text-accent"
                            onClick={() => openEditModal(voucher)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            aria-label={`Xóa voucher ${voucher.code}`}
                            className="cursor-pointer text-destructive hover:opacity-80"
                            onClick={() => handleDelete(voucher)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
      </div>

      <VoucherFormModal open={modalOpen} onOpenChange={setModalOpen} voucher={editingVoucher} />
    </div>
  )
}
