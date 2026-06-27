// Dò chuỗi tổ tiên trong cây danh mục: trả [gốc, …, node có slug] (gồm cả node đó).
// Mỗi phần tử chỉ giữ { id, name, slug }. Không thấy / tree không hợp lệ → [].
export function findCategoryPath(tree, slug) {
  if (!Array.isArray(tree)) return []
  for (const node of tree) {
    if (node.slug === slug) {
      return [{ id: node.id, name: node.name, slug: node.slug }]
    }
    const childPath = findCategoryPath(node.children ?? [], slug)
    if (childPath.length > 0) {
      return [{ id: node.id, name: node.name, slug: node.slug }, ...childPath]
    }
  }
  return []
}
