import { SectionHeading } from '../home/SectionHeading'
import { ProductCard } from '../ProductCard'
import { useRecentlyViewed } from '../../features/personalization/hooks'
import { useInfiniteProducts } from '../../features/catalog/hooks'
import { topCategorySlug } from '../../features/personalization/recommend'

/**
 * Category-based suggestions. Has NO internal customer gate — it self-fetches
 * `useRecentlyViewed()` with `enabled=true`, so it must only be rendered inside a
 * customer-gated parent (currently `PersonalizedSection`, which gates on `isCustomer`).
 * Dropping it directly into an ungated page would fire an unauthenticated request.
 */
export function SuggestedForYou() {
  const { data: viewedData } = useRecentlyViewed()
  const viewed = viewedData?.data ?? []
  const category = topCategorySlug(viewed)
  const viewedSlugs = new Set(viewed.map((product) => product.slug))

  const query = useInfiniteProducts(
    category ? { category } : {},
    { enabled: Boolean(category) },
  )

  if (!category) return null

  const suggestions = (query.data?.pages?.[0]?.data ?? [])
    .filter((product) => !viewedSlugs.has(product.slug))
    .slice(0, 4)

  if (suggestions.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
      <SectionHeading eyebrow="Gợi ý" title="Gợi ý cho bạn" />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {suggestions.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
