export function rankProductsWithJourney(products, discovery = []) {
  const ranks = new Map(discovery.map(({ product }, index) => [product.id, index]))
  if (ranks.size === 0) return products

  return products
    .map((product, index) => ({ product, index, rank: ranks.get(product.id) }))
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.index - b.index)
    .map(({ product }) => product)
}
