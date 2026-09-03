/* Hallmark · component: ranked product strip · genre: editorial · theme: Nestify Design DNA
 * structure: lead product + ranked list · states: default · hover · focus · active
 */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
import { ArrowUpRight, ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBestSellers } from '../../features/catalog/hooks'
import { formatPrice } from '../../lib/format'

function ProductImage({ product, className }) {
  if (!product.thumbnail) {
    return (
      <span className={`flex items-center justify-center bg-unbuilt/35 ${className}`}>
        <ImageOff size={28} className="text-unbuilt" aria-hidden="true" />
      </span>
    )
  }

  return (
    <img
      src={product.thumbnail}
      alt={product.name}
      loading="lazy"
      decoding="async"
      className={`object-cover ${className}`}
    />
  )
}

export function BestSellingProducts() {
  const query = useBestSellers(4)
  const products = query.data?.data ?? []

  // A ranking without delivered orders is not evidence. Keep the page honest
  // and let the section appear naturally once fulfilled-order data exists.
  if (query.isLoading || query.isError || products.length === 0) return null

  const [leader, ...rest] = products

  return (
    <section data-home-section="best-sellers" className="border-y border-border bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:px-10">
        <div className="grid min-w-0 gap-6 border-b border-border pb-10 md:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] md:items-end">
          <h2 className="min-w-0 max-w-[15ch] [overflow-wrap:anywhere] font-display text-[clamp(2.25rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.035em] text-ink">
            Được chọn nhiều cho tổ ấm
          </h2>
          <p className="max-w-[58ch] text-base leading-relaxed text-ink/65 md:justify-self-end">
            Những thiết kế xuất hiện nhiều nhất trong các đơn hàng đã hoàn tất — một điểm tham khảo để bạn bắt đầu so sánh.
          </p>
        </div>

        <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
          <Link
            to={`/p/${leader.slug}`}
            className="group block min-w-0 rounded-control active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <div className="relative overflow-hidden rounded-card bg-unbuilt/35">
              <ProductImage product={leader} className="aspect-[4/3] w-full transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]" />
              <span className="absolute left-4 top-4 flex size-12 items-center justify-center rounded-full bg-canvas font-display text-xl tabular-nums text-ink shadow-soft" aria-label="Xếp hạng 1">
                01
              </span>
            </div>
            <div className="mt-5 flex min-w-0 items-start justify-between gap-5">
              <div className="min-w-0">
                <h3 className="text-xl font-medium leading-snug text-ink transition-colors duration-200 group-hover:text-ink/60">{leader.name}</h3>
                <p className="mt-1 text-base font-medium tabular-nums text-ink">{formatPrice(leader.base_price)}</p>
              </div>
              <ArrowUpRight size={21} className="mt-1 shrink-0 text-ink transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
          </Link>

          {rest.length > 0 && (
            <ol className="divide-y divide-border border-y border-border" start="2">
              {rest.map((product, index) => (
                <li key={product.id}>
                  <Link
                    to={`/p/${product.slug}`}
                    className="group grid min-h-28 min-w-0 grid-cols-[3rem_5.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm py-4 active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:gap-4"
                  >
                    <span className="font-display text-xl tabular-nums text-ink/45" aria-label={`Xếp hạng ${index + 2}`}>
                      {String(index + 2).padStart(2, '0')}
                    </span>
                    <ProductImage product={product} className="aspect-square w-full rounded-control transition-opacity duration-200 group-hover:opacity-80" />
                    <span className="min-w-0">
                      <span className="block text-base font-medium leading-snug text-ink">{product.name}</span>
                      <span className="mt-1 block text-sm tabular-nums text-ink/65">{formatPrice(product.base_price)}</span>
                    </span>
                    <ArrowUpRight size={18} className="shrink-0 text-ink/55 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
