# Nestify UI/UX Audit — Wave 2 Remediation Design

**Date:** 2026-07-11

**Status:** Implemented — automated verification complete; runtime verification pending

**Repo:** Nestify frontend

**Issues:** AUD-04 (P1), AUD-05 (P2)

**Evidence level:** Verified from code. Browser behavior still needs runtime verification.

---

## 1. Scope and evidence

| Issue | Severity | Priority | Verified evidence |
|---|---|---|---|
| AUD-04 — A failed first data request is rendered as a valid empty state | High | P1 | CategoryPage, CartPage, CartDrawer, CheckoutPage, WishlistPage, OrdersPage, and AddressesPage derive empty arrays/items from missing query data but do not branch on query failure. A rejected request can therefore say “empty cart”, “no address”, “no orders”, or “no matching products”. Checkout can mistake a cart/address failure for a real prerequisite absence. |
| AUD-05 — Repeated admin actions and dialog content lack complete semantic context | Medium | P2 | Several admin tables have an empty final header; repeated controls are exposed only as “Sửa”, “Xóa”, “Chi tiết”, or “Xem”; several form dialogs omit Dialog.Description. This makes screen-reader control lists ambiguous and produces Radix description warnings. |

This wave does not change API contracts, mutations, RBAC, payment rules, inventory rules, Room Scene
persistence, or 3D editor behavior.

---

## 2. Design intent

AUD-04 is a clarity defect, not a cosmetic empty-state defect. A successful response containing zero
items and a failed request are different product states and must never share copy or actions.

- Category/Wishlist are in **Being Explored**: failure must preserve the ability to continue exploring
  by offering a retry without claiming there are no possibilities.
- Cart is **Transactional Commitment**: failure must not claim the cart is empty or erase the room
  callback from the user's mental model.
- Checkout is **Committed**: if prerequisite data cannot be loaded, order submission must be absent;
  the message must state the next step rather than show a generic failure.
- Orders/Addresses are ownership-supporting surfaces: failure must not rewrite history as “none”.

No error treatment uses `imagined` or `confirmed`. Those colors keep their existing psychological
roles. The error component uses semantic surface/border/foreground/destructive tokens only.

---

## 3. AUD-04 behavior contract

### 3.1 Shared load-error state

Add a small reusable `LoadErrorState` with:

- a concise title and screen-specific recovery description;
- `role="alert"` for a blocking first-load failure;
- an optional retry button with a pending label and duplicate-click protection;
- a compact form for drawers/background-refresh warnings;
- semantic tokens and the existing Button primitive;
- no raw transport error and no false claim that data is empty or lost.

### 3.2 Query state precedence

Every scoped screen follows this order:

1. authentication/permission boundary, where applicable;
2. first request loading;
3. first request failed with no usable data → blocking `LoadErrorState`;
4. successful empty response → existing empty state;
5. usable data → existing content;
6. background refresh failed while usable data exists → retain content and show a compact warning.

### 3.3 Checkout safety

- If either cart or address data has never loaded and its request fails, the checkout form and
  “Đặt hàng” button are not rendered.
- Retry only refetches the failed prerequisite query/queries; it never calls createOrder or a payment
  mutation.
- A successful empty cart and a successful empty address list keep their current dedicated flows.

### 3.4 Catalog safety

- Product-query failure is shown before the zero-results state.
- The result count does not announce “0 sản phẩm” for a failed request.
- Retry keeps current category/search/filter/sort state because it refetches the existing query.
- A category-metadata failure is recoverable independently and does not discard successfully loaded
  products.

---

## 4. AUD-05 behavior contract

- Every admin data table has a programmatic caption.
- Every action column has a non-empty accessible header, visually hidden when a visible label would
  add noise.
- Repeated row controls include the entity in their accessible name, for example “Sửa voucher
  SALE10” or “Xem đơn hàng ORD-123”. Visible labels remain unchanged.
- Admin form dialogs for categories, vouchers, variants, and role creation expose a meaningful
  description through the existing Modal API.
- RoomSetupDialog receives description/error announcement semantics only. Room Planner business,
  persistence, geometry, and 3D behavior remain untouched.

---

## 5. Acceptance criteria

1. A rejected scoped query never renders the corresponding successful-empty copy.
2. Every blocking failure exposes one retry action; retry success replaces the failure with content.
3. Checkout cannot create an order while cart/address prerequisites have no usable response.
4. Existing successful empty states remain unchanged.
5. Existing data remains visible if only a background refresh fails.
6. Admin action columns and repeated controls have unique accessible names.
7. Scoped dialogs have title and description semantics with no new Radix warning.
8. Focus styles, Vietnamese copy, semantic tokens, and existing responsive layouts are preserved.
9. No backend, migration, dependency, design-token, or Room Scene persistence file changes.

---

## 6. Needs runtime verification

- Retry behavior under real offline/online transitions.
- Screen-reader announcement timing for first-load and background-refresh failures.
- Checkout focus order after a failed prerequisite recovers.
- Admin table/control names in NVDA, VoiceOver, or another screen reader.
