function fractionDetail(positive, total) {
  return `${positive}/${total} người đánh giá`
}

export function summarizeReviewEvidence(reviews) {
  const evidence = reviews.map((review) => review.evidence).filter(Boolean)
  const color = evidence.map((item) => item.color_accuracy).filter(Boolean)
  const size = evidence.map((item) => item.size_fit).filter(Boolean)
  const material = evidence.map((item) => Number(item.material_quality)).filter((value) => Number.isFinite(value) && value >= 1 && value <= 5)
  const facts = []

  if (color.length > 0) {
    const accurate = color.filter((value) => value === 'accurate').length
    facts.push({ label: 'Màu sắc giống ảnh', value: fractionDetail(accurate, color.length) })
  }

  if (size.length > 0) {
    const expected = size.filter((value) => value === 'as_expected').length
    facts.push({ label: 'Kích thước đúng kỳ vọng', value: fractionDetail(expected, size.length) })
  }

  if (material.length > 0) {
    const average = material.reduce((sum, value) => sum + value, 0) / material.length
    const formatted = Number.isInteger(average) ? String(average) : average.toFixed(1)
    facts.push({ label: `Chất liệu ${formatted}/5`, value: `${material.length} đánh giá` })
  }

  return facts
}
