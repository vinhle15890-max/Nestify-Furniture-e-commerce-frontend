// Group placed items by variant for a bill-of-materials view. A placed item is
// one unit, so quantity = how many times a variant appears. Prices may be absent
// (a variant with no usable price) — those lines are shown but excluded from the
// total, which is then flagged as incomplete rather than silently wrong.
export function summarizeItems(items) {
  const byVariant = new Map()

  for (const it of items ?? []) {
    const variant = it.variant ?? {}
    const id = variant.id
    // null/undefined/'' → unpriced. (Number(null) is 0, so guard before coercing.)
    const raw = variant.price
    const priceNum = raw == null || raw === '' ? NaN : Number(raw)
    const price = Number.isFinite(priceNum) ? priceNum : null

    const existing = byVariant.get(id)
    if (existing) {
      existing.qty += 1
    } else {
      byVariant.set(id, { variantId: id, name: variant.name ?? '', price, qty: 1 })
    }
  }

  const lines = [...byVariant.values()].map((line) => ({
    ...line,
    lineTotal: line.price === null ? null : line.price * line.qty,
  }))

  const total = lines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0)
  const hasUnpriced = lines.some((l) => l.price === null)

  return { lines, total, hasUnpriced }
}
