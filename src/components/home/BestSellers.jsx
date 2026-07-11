import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { ProductCard } from '../ProductCard'
import { Spinner } from '../Spinner'
import { LoadErrorState } from '../LoadErrorState'
import { useBestSellers } from '../../features/catalog/hooks'

export function BestSellers() {
  const query = useBestSellers(8)
  const products = query.data?.data ?? []

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="Khám phá"
          title="Bắt đầu với những thiết kế tiêu biểu"
          intro="Không phải để chạy theo số đông — chỉ vài điểm khởi đầu để bạn bắt đầu hình dung."
        />
        <Reveal
          as={Link}
          to="/c/all"
          className="group hidden items-center gap-2 rounded-control text-sm font-medium tracking-wide text-ink transition-colors duration-200 hover:text-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:inline-flex"
        >
          Xem tất cả
          <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Reveal>
      </div>

      {query.isLoading ? (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      ) : query.isError && !query.data ? (
        <LoadErrorState className="mt-10" compact title="Chưa thể tải các thiết kế tiêu biểu" description="Bạn vẫn có thể xem toàn bộ sản phẩm hoặc thử tải lại." onRetry={query.refetch} isRetrying={query.isFetching} />
      ) : products.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Chưa có sản phẩm.</p>
      ) : (
        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={(index % 4) * 80}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  )
}
