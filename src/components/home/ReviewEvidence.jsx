/* Hallmark · component: evidence ledger · genre: editorial · theme: Nestify Design DNA
 * structure: statement + divided facts · states: static evidence
 */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { ArrowUpRight, ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBestSellerReviewEvidence } from '../../features/catalog/hooks'
import { summarizeReviewEvidence } from './reviewEvidence'

export function ReviewEvidence() {
  const query = useBestSellerReviewEvidence(4, 5)
  const groups = query.groups
    .map((group) => ({ ...group, facts: summarizeReviewEvidence(group.reviews) }))
    .filter((group) => group.facts.length > 0)

  if (query.isLoading || query.isError || groups.length === 0) return null

  return (
    <section data-home-section="review-evidence" className="bg-surface-alt/55">
      <div className="mx-auto grid max-w-7xl min-w-0 gap-12 px-6 py-20 md:py-24 lg:grid-cols-[minmax(16rem,0.62fr)_minmax(0,1.38fr)] lg:gap-20 lg:px-10">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-medium text-ink/60">Từ đánh giá mua hàng đã xác minh</p>
          <h2 className="mt-4 min-w-0 max-w-[12ch] [overflow-wrap:anywhere] font-display text-[clamp(2.25rem,4.5vw,4rem)] font-normal leading-[1.04] tracking-[-0.03em] text-ink">
            Điều người mua đã kiểm chứng
          </h2>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-ink/65">
            Mỗi nhận xét dưới đây gắn với đúng sản phẩm đã mua, để bạn biết bằng chứng đến từ đâu trước khi xem kỹ hơn.
          </p>
        </div>

        <ol className="divide-y divide-ink/15 border-y border-ink/15">
          {groups.map(({ product, facts }, index) => (
            <li key={product.id} className="py-7 md:py-8">
              <Link
                to={`/p/${product.slug}`}
                className="group grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-5 rounded-control active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center sm:gap-7"
              >
                <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-card bg-unbuilt/35">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80" />
                  ) : (
                    <ImageOff size={26} className="text-unbuilt" aria-hidden="true" />
                  )}
                </span>

                <span className="min-w-0">
                  <span className="flex items-baseline gap-3">
                    <span className="font-display text-base tabular-nums text-ink/40" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 text-lg font-medium leading-snug text-ink sm:text-xl">{product.name}</span>
                  </span>
                  <span className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
                    {facts.map((fact) => (
                      <span key={fact.label} className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{fact.label}</span>
                        <span className="mt-0.5 block text-xs tabular-nums text-ink/55">{fact.value}</span>
                      </span>
                    ))}
                  </span>
                </span>

                <ArrowUpRight size={20} className="hidden shrink-0 text-ink/55 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
