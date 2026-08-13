import { useMemo, useState } from 'react'
import { Box, Plus } from 'lucide-react'
import { useInfiniteProducts } from '../../features/catalog/hooks'
import { toPlaceableItems } from '../../features/roomPlanner/placeable'
import { SearchInput } from '../../components/SearchInput'
import { EmptyState } from '../../components/admin/EmptyState'
import { LoadErrorState } from '../../components/LoadErrorState'
import { formatPrice } from '../../lib/format'
import { useJourneyContext } from '../../features/personalization/hooks'
import { rankProductsWithJourney } from '../../features/personalization/rank'

export function CatalogTray({ onAdd }) {
  const [search, setSearch] = useState('')
  const [placementMessage, setPlacementMessage] = useState('')
  const query = useInfiniteProducts({ search, limit: 24 })
  const journeyQuery = useJourneyContext()
  const journeyDiscovery = useMemo(() => journeyQuery.data?.data?.discovery ?? [], [journeyQuery.data])

  const products = useMemo(
    () => {
      const loaded = query.data?.pages.flatMap((page) => page.data) ?? []
      return search ? loaded : rankProductsWithJourney(loaded, journeyDiscovery)
    },
    [journeyDiscovery, query.data, search],
  )
  const placeable = useMemo(() => toPlaceableItems(products), [products])

  return (
    <div className="flex h-full flex-col gap-3">
      <SearchInput placeholder="Tìm món đồ cho căn phòng..." onDebouncedChange={setSearch} />
      <p className="text-xs leading-5 text-muted-foreground">Chọn một món để đặt thử vào phòng. Bạn có thể di chuyển, xoay hoặc bỏ món đó bất cứ lúc nào.</p>
      {!search && journeyDiscovery.length > 0 && <p className="border-l-2 border-emerging pl-2 text-xs leading-5 text-foreground">Các món có liên hệ với lựa chọn trước đây được đưa lên trước; danh sách vẫn giữ đầy đủ.</p>}
      <p role="status" aria-live="polite" className="sr-only">{placementMessage}</p>
      {query.isLoading ? (
        <div role="status" aria-label="Đang chuẩn bị nội thất" className="space-y-2 py-1">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} aria-hidden="true" className="flex animate-pulse items-center gap-3 rounded-card border border-border p-2 motion-reduce:animate-none">
              <span className="h-12 w-12 shrink-0 bg-unbuilt/35" />
              <span className="h-4 w-2/3 rounded-control bg-unbuilt/35" />
            </div>
          ))}
          <span className="sr-only">Đang chuẩn bị nội thất</span>
        </div>
      ) : query.isError && !query.data ? (
        <LoadErrorState compact title="Chưa thể mở danh sách nội thất" description="Tìm kiếm hiện tại vẫn được giữ nguyên. Hãy thử tải lại." onRetry={query.refetch} isRetrying={query.isFetching} />
      ) : placeable.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Chưa có món nào để thử trong phòng"
          description="Các sản phẩm phù hợp với căn phòng này sẽ xuất hiện tại đây."
        />
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {placeable.map(({ product, variant }) => (
            <li key={variant.id}>
              <button
                type="button"
                aria-label={`Đặt ${product.name}, phiên bản ${variant.name}, vào giữa phòng`}
                onClick={(event) => {
                  // Keyboard activation starts a reversible placement session;
                  // pointer users retain the existing direct-add interaction.
                  if (event.detail === 0) onAdd(variant, { provisional: true })
                  else onAdd(variant)
                  setPlacementMessage(`Đã đặt ${product.name}, phiên bản ${variant.name}, vào giữa phòng và chọn sản phẩm này.`)
                }}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-2 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
