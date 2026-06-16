import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { useAdminProducts } from '../../../features/admin/products/hooks'
import { formatPrice } from '../../../lib/format'
import { ProductFormModal } from './ProductFormModal'

const STATUS_LABELS = {
  active: { label: 'Đang bán', tone: 'in-stock' },
  archived: { label: 'Đã lưu trữ', tone: 'neutral' },
}

export function AdminProductsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminProducts(page)
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const products = data?.data ?? []
  const meta = data?.meta ?? { last_page: 1 }

  const handleCreated = (product) => {
    navigate(`/admin/products/${product.id}`, { state: { product } })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-foreground">Sản phẩm</h2>
        <Button onClick={() => setModalOpen(true)}>Thêm sản phẩm</Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải sản phẩm..." />
        ) : products.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Giá</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Phiên bản</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const statusInfo = STATUS_LABELS[product.status] ?? { label: product.status, tone: 'neutral' }
                  return (
                    <tr key={product.id} className="border-b border-border last:border-b-0">
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
                        <Link to={`/admin/products/${product.id}`} state={{ product }} className="text-primary hover:underline">
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

      <ProductFormModal open={modalOpen} onOpenChange={setModalOpen} onCreated={handleCreated} />
    </div>
  )
}
