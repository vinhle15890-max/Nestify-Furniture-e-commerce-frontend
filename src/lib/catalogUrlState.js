export const CATALOG_QUERY_KEYS = ['search', 'price', 'sort']

export function readCatalogUrlState(searchParams) {
  return {
    search: searchParams.get('search')?.trim() ?? '',
    price: searchParams.get('price') ?? '',
    sort: searchParams.get('sort') ?? '',
  }
}

export function writeCatalogUrlState(current, updates) {
  const next = new URLSearchParams(current)
  Object.entries(updates).forEach(([key, value]) => {
    if (!CATALOG_QUERY_KEYS.includes(key)) return
    const normalized = typeof value === 'string' ? value.trim() : value
    if (normalized) next.set(key, normalized)
    else next.delete(key)
  })
  return next
}
