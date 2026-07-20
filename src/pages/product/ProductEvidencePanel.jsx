import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function EvidenceRow({ label, children }) {
  return (
    <div className="grid grid-cols-[minmax(4.75rem,0.55fr)_minmax(0,1.45fr)] gap-3 border-t border-unbuilt/70 py-2.5">
      <dt className="text-sm font-medium text-ink/55">{label}</dt>
      <dd className="text-sm leading-6 text-ink">{children}</dd>
    </div>
  )
}

export function ProductEvidencePanel({ product, selectedVariant, activeMedia, outOfStock }) {
  const variantAttributes = Object.entries(selectedVariant?.attributes ?? {})
  const mediaMatchesVariant = Boolean(
    activeMedia?.variant_id != null && selectedVariant?.id === activeMedia.variant_id,
  )
  const mediaRole = mediaMatchesVariant
    ? 'Ảnh theo phiên bản đã chọn'
    : activeMedia
      ? 'Ảnh bối cảnh dùng chung'
      : 'Chưa có hình ảnh'
  const plannerHref = selectedVariant
    ? `/room-planner?product=${encodeURIComponent(product.slug)}&variant=${selectedVariant.id}`
    : null

  return (
    <aside
      data-testid="measured-suitability-field"
      aria-labelledby="measured-suitability-title"
      className="border-t-2 border-emerging/45 pt-7 lg:border-l-2 lg:border-t-0 lg:pl-9 lg:pt-1 xl:pl-12"
    >
      <p className="text-sm font-medium text-emerging">
        Sự phù hợp đã biết
      </p>
      <h2
        id="measured-suitability-title"
        className="mt-2 max-w-sm font-display text-[clamp(1.5rem,2vw,1.85rem)] leading-[1.1] text-ink"
      >
        Dữ liệu đã xác minh
      </h2>

      <dl className="mt-4">
        <EvidenceRow label="Phiên bản">
          {selectedVariant?.name ?? 'Chưa chọn phiên bản'}
          {variantAttributes.length > 0 && (
            <span className="mt-1 block text-xs text-ink/60">
              {variantAttributes.map(([name, value]) => `${name}: ${value}`).join(' · ')}
            </span>
          )}
        </EvidenceRow>
        <EvidenceRow label="Hình ảnh">
          <span className="block">{mediaRole}</span>
          {!mediaMatchesVariant && activeMedia && selectedVariant && (
            <span className="mt-1 block text-xs text-ink/60">
              Ảnh chưa xác minh riêng cho phiên bản {selectedVariant.name}.
            </span>
          )}
        </EvidenceRow>
        <EvidenceRow label="Mô hình 3D">
          {selectedVariant?.model_3d_url
            ? 'Mô hình được gắn với phiên bản đã chọn.'
            : selectedVariant
              ? 'Phiên bản này chưa có mô hình 3D.'
              : 'Cần chọn phiên bản để kiểm tra.'}
        </EvidenceRow>
        <EvidenceRow label="Khả dụng">
          {selectedVariant ? (outOfStock ? 'Tạm hết hàng' : 'Có thể đặt hàng') : 'Cần chọn phiên bản'}
        </EvidenceRow>
      </dl>

      <section className="mt-3 bg-unbuilt/20 px-4 py-3.5" aria-labelledby="missing-evidence-title">
        <h3 id="missing-evidence-title" className="font-display text-lg text-ink">
          Bằng chứng chưa có
        </h3>
        <p className="mt-2 text-sm leading-5 text-ink/75">
          Kích thước W / D / H, khoảng hở, vật liệu và hoàn thiện
          {!selectedVariant?.model_3d_url && ', cùng mô hình 3D đã xác minh'}.
        </p>
        <p className="mt-2 text-xs leading-4 text-ink">
          Nestify không ước tính từ hình ảnh hoặc nội dung mô tả.
        </p>
      </section>

      <div data-testid="planner-handoff" className="mt-3 border-t-2 border-ink/15 pt-3">
        {plannerHref ? (
          <Link
            to={plannerHref}
            className="inline-flex items-center gap-3 rounded-control bg-ink px-5 py-3 text-sm font-medium text-canvas transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
          >
            Thử trong Room Planner
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex rounded-control bg-unbuilt px-5 py-3 text-sm font-medium text-ink/60"
          >
            Chọn phiên bản để mở Planner
          </span>
        )}
        <p className="mt-2.5 text-xs leading-4 text-ink/60">
          Bước tiếp theo có thể đảo ngược. Phiên bản này được mang theo; hình ảnh trong Planner
          phụ thuộc dữ liệu 3D hiện có.
        </p>
      </div>
    </aside>
  )
}
