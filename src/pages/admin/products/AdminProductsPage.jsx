import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Plus, Sparkles } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminProducts } from '../../../features/admin/products/hooks'
import { useBulkGenerateSeo } from '../../../features/admin/seo/hooks'
import { useToastStore } from '../../../store/toastStore'
import { formatPrice } from '../../../lib/format'

const STATUS_LABELS = {
  active: { label: 'Đang bán', tone: 'in-stock' },
  archived: { label: 'Đã lưu trữ', tone: 'neutral' },
}

export function AdminProductsPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const { data, isLoading, isError, isFetching, refetch } = useAdminProducts(page)
  const bulk = useBulkGenerateSeo()
  const addToast = useToastStore((state) => state.addToast)
  const navigate = useNavigate()

  const products = data?.data ?? []
  const meta = data?.meta ?? { last_page: 1 }

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p.id)),
    )

  const handleGenerateSelected = () => {
    bulk.mutate(
      { scope: 'selected', product_ids: [...selected] },
      {
        onSuccess: (res) => {
          addToast({
            title: `Đã xếp ${res.data?.queued ?? 0} sản phẩm vào hàng đợi sinh SEO`,
            variant: 'default',
          })
          setSelected(new Set())
        },
        onError: (error) => addToast({ title: error.message ?? 'Không thể sinh SEO', variant: 'destructive' }),
      },
    )
  }

  return (
    <div>
      <PageHeader
        icon={Package}
        title="Sản phẩm"
        description="Quản lý danh mục sản phẩm, biến thể và tồn kho."
        actions={
          <Button onClick={() => navigate('/admin/products/new')}>
            <Plus size={16} aria-hidden="true" />
            Thêm sản phẩm
          </Button>
        }
      />

      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-alt/50 px-4 py-3">
          <span className="text-sm text-foreground">Đã chọn {selected.size} sản phẩm</span>
          <Button onClick={handleGenerateSelected} disabled={bulk.isPending}>
            <Sparkles size={15} aria-hidden="true" />
            Sinh SEO ({selected.size})
          </Button>
          <Link to="/admin/products/seo" className="text-sm font-medium text-accent hover:underline">
            Xem màn duyệt
          </Link>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải sản phẩm..." />
        ) : isError && !data ? (
          <LoadErrorState title="Chưa thể tải sản phẩm" description="Trang hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        ) : products.length === 0 ? (
          <Card>
            <EmptyState
              illustration="sofa"
              title="Chưa có sản phẩm nào"
              description="Thêm sản phẩm đầu tiên để bắt đầu bán."
            />
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách sản phẩm</caption>
              <thead>
                <tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={products.length > 0 && selected.size === products.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Giá</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Biến thể</th>
                  <th className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const statusInfo = STATUS_LABELS[product.status] ?? { label: product.status, tone: 'neutral' }
                  return (
                    <tr key={product.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${product.name}`}
                          checked={selected.has(product.id)}
                          onChange={() => toggle(product.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-muted-foreground">{product.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{product.category?.name}</td>
                      <td className="px-4 py-3 text-foreground">{formatPrice(product.base_price)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{product.variants?.length ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/products/${product.id}`}
                          state={{ product }}
                          aria-label={`Sửa sản phẩm ${product.name}`}
                          className="font-medium text-foreground transition-colors hover:text-accent"
                        >
                          Sửa
                        </Link>
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
    </div>
  )
}
