// Forward transitions per OrderService::transition (BE) — not the looser request validation.
export const ADMIN_ORDER_TRANSITIONS = {
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}
