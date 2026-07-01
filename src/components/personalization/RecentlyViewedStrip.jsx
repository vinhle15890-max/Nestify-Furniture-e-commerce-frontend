import { SectionHeading } from '../home/SectionHeading'
import { ProductCard } from '../ProductCard'
import { useRecentlyViewed } from '../../features/personalization/hooks'

export function RecentlyViewedStrip({ excludeSlug, title = 'Bạn vừa xem', enabled = true }) {
  const { data } = useRecentlyViewed({ enabled })
  const items = (data?.data ?? []).filter((product) => product.slug !== excludeSlug)

  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
      <SectionHeading eyebrow="Lịch sử" title={title} />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
