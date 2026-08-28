import { describeModelFidelity } from '../../features/roomPlanner/modelFidelity'

function EvidenceRow({ label, children }) {
  return (
    <div className="grid grid-cols-[minmax(4.75rem,0.55fr)_minmax(0,1.45fr)] gap-3 border-t border-unbuilt/70 py-2.5">
      <dt className="text-sm font-medium text-ink/55">{label}</dt>
      <dd className="text-sm leading-6 text-ink">{children}</dd>
    </div>
  )
}

export function ProductEvidencePanel({ selectedVariant, outOfStock }) {
  const modelFidelity = describeModelFidelity(selectedVariant)
  const variantAttributes = Object.entries(selectedVariant?.attributes ?? {})

  return (
    <aside
      data-testid="measured-suitability-field"
      aria-labelledby="measured-suitability-title"
      className="border-t-2 border-emerging/45 pt-7 lg:border-l-2 lg:border-t-0 lg:pl-9 lg:pt-1 xl:pl-12"
    >
      <p className="text-sm font-medium text-emerging">
        Dễ hình dung hơn
      </p>
      <h2
        id="measured-suitability-title"
        className="mt-2 max-w-sm font-display text-[clamp(1.5rem,2vw,1.85rem)] leading-[1.1] text-ink"
      >
        Món đồ này có hợp với phòng?
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
        <EvidenceRow label="Thử trong phòng">
          {selectedVariant ? modelFidelity.text : 'Cần chọn phiên bản để kiểm tra.'}
        </EvidenceRow>
        <EvidenceRow label="Khả dụng">
          {selectedVariant ? (outOfStock ? 'Tạm hết hàng' : 'Có thể đặt hàng') : 'Cần chọn phiên bản'}
        </EvidenceRow>
      </dl>

    </aside>
  )
}
