import { useMemo, useState } from 'react'
import { Box, Plus } from 'lucide-react'
import { useInfiniteProducts } from '../../features/catalog/hooks'
import { toPlaceableItems } from '../../features/roomPlanner/placeable'
import { SearchInput } from '../../components/SearchInput'
import { EmptyState } from '../../components/admin/EmptyState'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { formatPrice } from '../../lib/format'

export function CatalogTray({ onAdd }) {
  const [search, setSearch] = useState('')
  const query = useInfiniteProducts({ search, limit: 24 })

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  )
  const placeable = useMemo(() => toPlaceableItems(products), [products])

  return (
    <div className="flex h-full flex-col gap-3">
      <SearchInput placeholder="Tìm nội thất 3D..." onDebouncedChange={setSearch} />
      {query.isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : query.isError && !query.data ? (
        <LoadErrorState compact title="Chưa thể tải nội thất 3D" description="Tìm kiếm hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={query.refetch} isRetrying={query.isFetching} />
      ) : placeable.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Chưa có sản phẩm 3D"
          description="Chưa có sản phẩm nào có mô hình 3D (.glb) để thêm vào phòng."
        />
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {placeable.map(({ product, variant }) => (
            <li key={variant.id}>
              <button
                type="button"
                onClick={() => onAdd(variant)}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-2 text-left transition-colors hover:border-border-strong"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-alt">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Box size={18} className="text-muted-foreground" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{product.name} · {variant.name}</span>
                  {variant.price != null && (
                    <span className="block text-xs text-muted-foreground">{formatPrice(variant.price)}</span>
                  )}
                </span>
                <Plus size={16} className="shrink-0 text-accent" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="rounded-control border border-border py-2 text-sm text-foreground hover:border-border-strong disabled:opacity-50"
        >
          {query.isFetchingNextPage ? 'Đang tải...' : 'Tải thêm'}
        </button>
      )}
    </div>
  )
}
