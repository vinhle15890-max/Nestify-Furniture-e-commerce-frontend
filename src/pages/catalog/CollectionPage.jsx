import { useParams } from 'react-router-dom'
import { ProductCard } from '../../components/ProductCard'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { SeoHead } from '../../components/SeoHead'
import { useCollection } from '../../features/catalog/hooks'

/* Hallmark · pre-emit critique: P5 H4 E4 S5 R5 V4 */
export function CollectionPage() {
  const { collectionSlug } = useParams()
  const query = useCollection(collectionSlug)
  const collection = query.data?.data

  if (query.isLoading) return <Spinner label="Đang mở bộ sưu tập..." />
  if (query.isError || !collection) return <LoadErrorState title="Chưa thể mở bộ sưu tập" description="Bộ sưu tập có thể đã được ẩn hoặc chưa sẵn sàng." onRetry={query.refetch} />

  return (
    <main className="bg-canvas px-6 py-16 text-ink md:py-24 lg:px-10">
      <SeoHead title={`${collection.name} | Nestify`} description={collection.description || 'Bộ sưu tập nội thất do Nestify tuyển chọn.'} canonicalPath={`/collections/${collection.slug}`} />
      <header className="mx-auto max-w-4xl border-b border-border pb-12">
        <p className="text-sm text-muted-foreground">Bộ sưu tập do Nestify tuyển chọn</p>
        <h1 className="mt-3 min-w-0 [overflow-wrap:anywhere] font-display text-[clamp(2.5rem,7vw,5.5rem)] font-normal leading-[0.98]">{collection.name}</h1>
        {collection.description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{collection.description}</p>}
      </header>
      <section aria-label={`Sản phẩm trong ${collection.name}`} className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {(collection.products ?? []).map((product) => <ProductCard key={product.id} product={product} />)}
      </section>
      {(collection.products ?? []).length === 0 && <p className="mx-auto mt-12 max-w-4xl text-muted-foreground">Các sản phẩm trong bộ sưu tập này đang được cập nhật.</p>}
    </main>
  )
}
