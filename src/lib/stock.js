// Pre-flight stock checks for cart line items.
//
// The definitive stock guard lives on the backend (`ReserveInventory` atomically
// reserves at order placement). These helpers are a *soft* client-side check so the
// storefront can warn the user and block the checkout button BEFORE they fill in an
// address / pick a payment method — rather than failing at the final reserve step.
//
// A line item carries `variant.available_stock` (= stock_quantity − reserved_quantity)
// in the cart payload, so no extra request is needed.

/**
 * Returns the stock problem for a cart line item, or null when it is fine.
 * - { kind: 'out' }  → the variant has no sellable stock left (available ≤ 0)
 * - { kind: 'low', available } → the ordered quantity exceeds what's available
 */
export function stockShortfall(item) {
  const available = item?.variant?.available_stock ?? 0
  const quantity = item?.quantity ?? 0

  if (available <= 0) return { kind: 'out', available: 0 }
  if (quantity > available) return { kind: 'low', available }
  return null
}

/** True when any line item in the cart has a stock shortfall. */
export function cartHasStockShortfall(items = []) {
  return items.some((item) => stockShortfall(item) !== null)
}
