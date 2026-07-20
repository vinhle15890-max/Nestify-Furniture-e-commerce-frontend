function valueFor(attributes, aliases) {
  const entry = Object.entries(attributes ?? {}).find(([name]) => aliases.includes(name.trim().toLocaleLowerCase('vi')))
  return entry?.[1] == null || entry[1] === '' ? 'Chưa được cung cấp' : String(entry[1])
}

export function ProductSpecifications({ product, selectedVariant, delivery, assembly, warranty }) {
  const attributes = { ...(product.attributes ?? {}), ...(selectedVariant?.attributes ?? {}) }
  const rows = [
    ['Kích thước', valueFor(attributes, ['kích thước', 'dimensions', 'dimension'])],
    ['Vật liệu', valueFor(attributes, ['vật liệu', 'chất liệu', 'material'])],
    ['Giao hàng', delivery ?? 'Chưa được cung cấp'],
    ['Chăm sóc', valueFor(attributes, ['chăm sóc', 'hướng dẫn chăm sóc', 'care', 'care instructions'])],
    ['Lắp ráp', assembly ?? 'Chưa được cung cấp'],
    ['Bảo hành', warranty ?? 'Chưa được cung cấp'],
    ['Mô hình 3D', selectedVariant?.model_3d_url ? 'Khớp với phiên bản đã chọn' : 'Phiên bản này chưa có mô hình 3D'],
  ]
  return <section aria-labelledby="specifications-title" className="mt-14 border-t border-border pt-10"><h2 id="specifications-title" className="text-2xl font-medium text-ink">Thông số sản phẩm</h2><dl className="mt-6 divide-y divide-unbuilt border-y border-unbuilt">{rows.map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]"><dt className="text-sm font-medium text-ink/60">{label}</dt><dd className="text-sm leading-6 text-ink">{value}</dd></div>)}</dl></section>
}
