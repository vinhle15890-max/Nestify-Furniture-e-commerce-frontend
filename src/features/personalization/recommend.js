// Slug danh mục xuất hiện nhiều nhất trong danh sách sản phẩm đã xem.
// Tie → danh mục xuất hiện trước. Không có category hợp lệ → null.
export function topCategorySlug(products) {
  const counts = new Map()
  for (const product of products ?? []) {
    const slug = product?.category?.slug
    if (!slug) continue
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }

  let best = null
  let bestCount = 0
  for (const [slug, count] of counts) {
    if (count > bestCount) {
      best = slug
      bestCount = count
    }
  }
  return best
}
