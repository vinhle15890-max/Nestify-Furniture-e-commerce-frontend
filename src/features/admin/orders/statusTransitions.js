// Forward transitions per OrderService::transition (BE) — not the looser request validation.
export const ADMIN_ORDER_TRANSITIONS = {
  pending_confirmation: ['processing', 'cancelled'],
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'delivery_failed'],
  delivery_failed: ['returned_to_store'],
  returned_to_store: ['cancelled'],
  delivered: [],
  cancelled: [],
}
