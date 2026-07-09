import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ImageOff, Info } from 'lucide-react'
import { BecomingModal } from '../../components/BecomingModal'

/**
 * Planner Preview — the lightweight "see it in a room" step for Product Detail's
 * Exploratory Commitment. Deliberately NOT the Room Planner: no Three.js / R3F,
 * no 3D asset fetch. It composites the product's existing 2D imagery into a
 * generic room vignette so the user can imagine ownership before committing —
 * the "seeing-it-first" promise at near-zero bundle weight.
 *
 * "Tiếp tục trong Room Planner" deep-links to the real 3D planner with this
 * variant preloaded (/room-planner?product=<slug>&variant=<id>) — no
 * load-from-scratch. It requires a selected variant (the planner places by
 * variant); until one is chosen the affordance is disabled with a hint.
 *
 * [Decision Log] `showVariantNote` — the composited image is product-level, not
 * per-variant (the data model has no per-variant image yet; the planned fix is a
 * nullable `variant_id` on product_media). For products with visually-divergent
 * options, the picture can therefore show a different colour/finish than the one
 * the user selected. Rather than promise that silently — the exact quiet
 * false-confirmation this project has consistently refused — we surface an honest
 * disclaimer when (and only when) such a mismatch is possible. Remove once
 * per-variant imagery ships.
 */
export function PlannerPreview({ open, onOpenChange, product, image, slug, variantId, showVariantNote = false }) {
  const navigate = useNavigate()
  // The planner places by variant, so Continue needs a selected variant.
  const canContinue = Boolean(slug && variantId)

  // Gentle "materialize" fade once the dialog opens (ghost → materialized).
  // Reduced-motion users get an instant show via the global motion reset that
  // zeroes every transition-duration, so no extra guard is needed here.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!open) {
      setShown(false)
      return undefined
    }
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  return (
    <BecomingModal
      open={open}
      onOpenChange={onOpenChange}
      title="Xem trong không gian"
      description={`Hình dung “${product.name}” trong một căn phòng trước khi quyết định.`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-unbuilt bg-canvas">
        {/* Floor plane + horizon — a bare room, "unbuilt" until the piece lands. */}
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-unbuilt/40" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-[38%] h-px bg-unbuilt" aria-hidden="true" />

        {/* The product, materializing into the room. */}
        <div className="absolute inset-0 flex items-end justify-center pb-[11%]">
          {image ? (
            <div
              className={`relative flex flex-col items-center transition-all duration-700 ease-out ${
                shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              <img
                src={image}
                alt={product.name}
                decoding="async"
                className="max-h-[220px] w-auto max-w-[78%] object-contain drop-shadow-[0_18px_20px_rgba(38,38,43,0.18)]"
              />
              {/* Grounding shadow so it reads as placed, not floating. */}
              <div className="mt-2 h-2.5 w-2/3 rounded-[100%] bg-ink/15 blur-md" aria-hidden="true" />
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center gap-2 text-ink/70">
              <ImageOff size={28} aria-hidden="true" />
              <p className="text-sm">Chưa có hình ảnh để dựng phối cảnh.</p>
            </div>
          )}
        </div>

        <p className="eyebrow absolute left-4 top-4">Phối cảnh minh hoạ</p>
      </div>

      {/* Honest disclaimer — only when the product has variants whose look can
          differ from the product-level image being shown (see Decision Log). */}
      {showVariantNote && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-ink/70">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          Ảnh minh hoạ — có thể khác với màu/chất liệu bạn đang chọn.
        </p>
      )}

      {/* Continue → deep-link into the real 3D planner with this variant
          preloaded. Disabled (with a hint) until a variant is selected, since
          the planner places by variant id. */}
      <div className="mt-5">
        <button
          type="button"
          disabled={!canContinue}
          aria-disabled={!canContinue}
          onClick={() => navigate(`/room-planner?product=${slug}&variant=${variantId}`)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-control bg-ink px-4 py-3 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-unbuilt disabled:text-ink/70"
        >
          Tiếp tục trong Room Planner
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        {!canContinue && (
          <p className="mt-2 text-center text-xs text-ink/70">
            Vui lòng chọn phiên bản để tiếp tục.
          </p>
        )}
      </div>
    </BecomingModal>
  )
}
