import { ProductCard } from '../../components/ProductCard'
import { Spinner } from '../../components/Spinner'
import { useInfiniteProducts } from '../../features/catalog/hooks'

function ProductSection({ title, anchorId, query }) {
  const products = query.data?.pages?.[0]?.data ?? []

  return (
    <section id={anchorId} className="mt-12">
      <h2 className="font-display text-2xl text-foreground">{title}</h2>

      {query.isLoading ? (
        <div className="mt-6 flex justify-center">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Chưa có sản phẩm.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

export function HomePage() {
  const featured = useInfiniteProducts({})
  const newest = useInfiniteProducts({ sort: '-created_at' })

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="rounded-card bg-background px-8 py-16 text-center shadow-soft sm:px-16">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Nestify</h1>
        <p className="mt-4 text-lg text-muted-foreground">Nội thất cho không gian sống của bạn.</p>
        <a
          href="#newest"
          className="mt-6 inline-flex items-center justify-center rounded-control bg-primary px-6 py-3 text-sm font-medium text-surface transition-colors duration-200 ease-out hover:bg-primary-hover"
        >
          Khám phá ngay
        </a>
      </section>

      <ProductSection title="Sản phẩm nổi bật" anchorId="featured" query={featured} />
      <ProductSection title="Sản phẩm mới" anchorId="newest" query={newest} />
    </div>
  )
}
