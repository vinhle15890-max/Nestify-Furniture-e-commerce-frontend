import { ArrowRight } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { ProductCard } from '../ProductCard'
import { LoadErrorState } from '../LoadErrorState'
import { useBestSellers } from '../../features/catalog/hooks'
import { CatalogSkeleton } from '../LoadingStates'
import { FeedbackState } from '../FeedbackState'
import { ButtonLink } from '../Button'

export function BestSellers() {
  const query = useBestSellers(8)
  const products = query.data?.data ?? []

  return (
    <section data-home-section="products" className="relative overflow-hidden bg-surface-alt/55">
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-24 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Thiết kế nổi bật"
            title="Những thiết kế đáng để bắt đầu"
            intro="So sánh hình dáng, vật liệu và mức giá trước khi đi sâu vào món phù hợp với căn phòng của bạn."
          />
          <Reveal>
            <ButtonLink to="/c/all" variant="secondary">
              Xem tất cả
              <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </ButtonLink>
          </Reveal>
        </div>

        {query.isLoading ? (
          <CatalogSkeleton />
        ) : query.isError && !query.data ? (
          <LoadErrorState className="mt-10" compact title="Chưa thể tải các thiết kế tiêu biểu" description="Bạn vẫn có thể xem toàn bộ sản phẩm hoặc thử tải lại." onRetry={query.refetch} isRetrying={query.isFetching} />
        ) : products.length === 0 ? (
          <FeedbackState className="mt-10" compact title="Chưa có sản phẩm để giới thiệu" description="Bạn vẫn có thể xem toàn bộ danh mục." />
        ) : (
          <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <Reveal key={product.id} delay={(index % 4) * 80}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
