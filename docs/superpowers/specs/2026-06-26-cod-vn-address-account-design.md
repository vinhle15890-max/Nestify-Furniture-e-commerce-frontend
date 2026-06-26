# Design — COD payment, VN address form, Account dashboard, checkout address flow

Date: 2026-06-26
Status: Approved (user "chốt" 2026-06-26)

Scope: 4 cohesive improvements to the customer checkout/account flow. Backend touched only
for COD; the rest is frontend. No new dependencies beyond a bundled VN administrative dataset.

Standing rule for this work: update related docs after every change (see memory
`keep-docs-in-sync`) — primarily `Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md`.

---

## 1. COD — "thanh toán trực tiếp" (Cash on Delivery), full flow

### Backend

**Migration:** add `orders.payment_method` string, default `'payos'`, values `payos | cod`.

**`CreateOrderRequest`:** add rule `payment_method => ['nullable','in:payos,cod']` (default `payos`).
**`OrderCreateDTO`:** add `paymentMethod` field, read from request.

**`OrderService.create`:** branch on payment method.
- `payos` (unchanged): order status `pending_payment`, inventory only reserved. FE then opens a
  PayOS session.
- `cod`: after reserving, create order with status **`processing`** and run **`CommitInventory`**
  for every item immediately (decrement `stock_quantity` + `reserved_quantity`) — the sale is
  confirmed at placement. Inject `CommitInventory` into `OrderService`.
- Persist `payment_method` on the order in both branches.

**Inventory reversal correctness (`reverseOrderHolds`):** change the restock condition from
"status === Paid" to "status ∈ {Paid, Processing, Shipped}" (i.e. any *committed* state →
restock; only `pending_payment` is reserved-only → release). This keeps PayOS behaviour
identical (Paid still restocks) and makes COD cancellation correct.

**Transitions (`OrderService.transition`):** add `processing → cancelled` so an admin can cancel
a confirmed COD order (restock happens via the fixed `reverseOrderHolds`). All other transitions
unchanged. Customer self-cancel stays `pending_payment`-only (COD is cancellable by admin only).

**`OrderResource`:** expose `payment_method` so the UI can label COD vs PayOS and decide whether
to show the "pay again" action.

**Out of scope (documented limitation):** no `payments` row is written for COD (cash collected
offline); COD is represented by `payment_method` + order status. No customer self-cancel for COD.

**Tests:** COD order → status `processing`, stock + reserved both decremented, no PayOS session
required; PayOS path unchanged; admin `processing → cancelled` restocks; existing order tests stay
green.

### Frontend (checkout)

- Payment-method section becomes a real choice: two selectable cards — **PayOS** (online) and
  **COD** (thanh toán khi nhận hàng).
- On submit: `createOrder({ ..., payment_method })`.
  - `payos`: create PayOS session + redirect (unchanged).
  - `cod`: order is already confirmed → navigate to `/orders/{id}` with a success toast; do not
    call the payment session endpoint.
- `OrderDetailPage`: show a payment-method label; the existing "Thanh toán lại" block already only
  renders for `pending_payment`, so COD (`processing`) won't show it — correct by construction.

---

## 2. VN address form — 3-level cascading dropdowns (frontend only)

No schema change; map the VN hierarchy onto existing address columns:

| VN field            | Column          |
|---------------------|-----------------|
| Tỉnh/Thành phố      | `province`      |
| Quận/Huyện          | `city`          |
| Phường/Xã           | `address_line2` |
| Số nhà, tên đường   | `address_line1` |
| (bỏ mã bưu điện)    | `postal_code` → null |

- Bundle a **static VN administrative dataset** in the FE (`src/data/`), loaded lazily per level
  (provinces eagerly; districts/wards on demand). No runtime external API dependency.
- `AddressFormModal`: replace the `city` / `province` / `postal_code` text inputs with three
  `<select>` (Tỉnh/TP → Quận/Huyện → Phường/Xã) + a "Số nhà, tên đường" text input. Keep
  `recipient_name` and `phone`. Update the yup schema accordingly (ward + district + province +
  street required; postal_code removed).
- **Editing legacy addresses** (free-text values that don't match the dataset): degrade
  gracefully — leave the unmatched level unselected rather than crashing; user re-picks.
- Address display (checkout list, order shipping) is unchanged — it just joins the columns.

---

## 3. Account page — summary dashboard (frontend only)

Rebuild `AccountPage` using existing hooks (`useMe`, `useOrders`, `useAddresses`):
- Greeting + letter avatar.
- Stat row: total orders / in-progress / delivered (derived from the orders list).
- Default address preview (or a prompt to add one).
- 2–3 most recent orders with product thumbnails, linking to detail.
- Quick links (Orders / Addresses / Wishlist) + logout.
- Keep the existing personal-info form (`ProfileForm`).

---

## 4. Checkout "no address" flow fix (frontend only)

When the cart has items but the user has **no address**, stop redirecting to
`/account/addresses`. Instead show an inline empty state with a "Thêm địa chỉ" button that opens
the already-wired `AddressFormModal`. On create, the `['addresses']` query refetches, the page
re-renders into the normal form, and the new address auto-selects (existing `useEffect`). The user
never leaves checkout.

---

## Files

- BE: `database/migrations/<new>_add_payment_method_to_orders.php`,
  `app/Http/Requests/Order/CreateOrderRequest.php`, `app/DTOs/OrderCreateDTO.php`,
  `app/Services/OrderService.php`, `app/Http/Resources/OrderResource.php`,
  `app/Http/Controllers/Order/*` (pass DTO), tests under `tests/Feature/Order/`,
  `docs/FE_AI_CONTEXT.md`.
- FE: `src/pages/checkout/CheckoutPage.jsx`, `src/features/checkout/*`,
  `src/pages/account/AddressFormModal.jsx`, `src/data/<vn-admin dataset>`,
  `src/pages/account/AccountPage.jsx`, `src/pages/orders/OrderDetailPage.jsx`, colocated tests.
