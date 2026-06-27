const SIG_SEP = '\x01'

// Mọi tổ hợp {tên option: label} theo thứ tự option.
export function cartesianVariants(options) {
  if (!Array.isArray(options) || options.length === 0) return []
  return options.reduce(
    (acc, option) =>
      acc.flatMap((combo) => option.values.map((v) => ({ ...combo, [option.name]: v.label }))),
    [{}],
  )
}

// Chữ ký nối label theo thứ tự option — khớp BE.
export function variantSignature(attributes, options) {
  return options.map((option) => String(attributes?.[option.name] ?? '')).join(SIG_SEP)
}

// Tổ hợp chưa có biến thể.
export function missingCombinations(options, variants) {
  const existing = new Set((variants ?? []).map((v) => variantSignature(v.attributes ?? {}, options)))
  return cartesianVariants(options).filter((combo) => !existing.has(variantSignature(combo, options)))
}

// Tìm variant khớp lựa chọn hiện tại; null nếu không có.
export function resolveVariant(selected, variants, options) {
  const target = variantSignature(selected, options)
  return (variants ?? []).find((v) => variantSignature(v.attributes ?? {}, options) === target) ?? null
}
