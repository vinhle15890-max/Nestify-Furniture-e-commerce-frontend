// Flatten product pages into a list of placeable {product, variant} entries,
// keeping only variants that actually have a 3D model. The product thumbnail
// is carried onto the variant for the tray (variants have no image of their own).
export function toPlaceableItems(products) {
  const out = []
  for (const product of products ?? []) {
    for (const variant of product.variants ?? []) {
      if (!variant.model_3d_url) continue
      out.push({
        product: { id: product.id, name: product.name, thumbnail: product.thumbnail ?? null },
        variant: {
          id: variant.id,
          sku: variant.sku,
          name: variant.name ?? variant.sku,
          model_3d_url: variant.model_3d_url,
          price: variant.price ?? null,
          thumbnail: product.thumbnail ?? null,
        },
      })
    }
  }
  return out
}
