import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { ProductCard } from '../ProductCard'
import { Spinner } from '../Spinner'
import { useInfiniteProducts } from '../../features/catalog/hooks'

export function BestSellers() {
  const query = useInfiniteProducts({})
  const products = (query.data?.pages?.[0]?.data ?? []).slice(0, 8)

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading eyebrow="Tuyển chọn" title="Sản phẩm bán chạy" />
        <Reveal
          as={Link}
          to="/c/all"
          className="group hidden items-center gap-2 rounded-control text-sm font-medium tracking-wide text-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-flex"
        >
          Xem tất cả
          <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Reveal>
      </div>

      {query.isLoading ? (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
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
