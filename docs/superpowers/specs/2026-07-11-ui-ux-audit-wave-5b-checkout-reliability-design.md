# UI/UX Audit Wave 5B — Checkout and payment reliability

## Status

Implemented and statically verified on 2026-07-11. Production migrations and the
runtime checks listed below remain operator steps.

## Evidence and scope

This wave is verified from the current frontend/backend source and the documented
PayOS contract. It does not redesign Checkout or change inventory, voucher, order
transition, refund, or staff-purchase rules.

| ID | Priority | Verified gap | Evidence |
|---|---|---|---|
| W5B-01 | P0 | `POST /api/orders` receives an `Idempotency-Key` from the frontend, and the API docs promise replay protection, but the backend never reads or persists the header. A retry after a lost response can create another order and reserve/commit inventory twice. | `features/checkout/api.js`, `CreateOrderRequest`, `OrderService::create`, `docs/06-api.md` |
| W5B-02 | P1 | The checkout key exists only in non-persisted Zustand state. A same-tab reload rotates the key even though the user may still be recovering the same checkout attempt. | `lib/idempotency.js`, `store/uiStore.js` |
| W5B-03 | P1 | Once an order is created, a PayOS session failure produces only a transient toast. The cart is invalidated/cleared, so Checkout can fall through to “empty cart” and offer no safe way to reopen payment without creating a new order. | `CheckoutPage.jsx`, `useCreateOrder`, `PaymentService::createSession` |
| W5B-04 | P1 | Payment-session creation is not retry-safe after a response is lost; the backend always calls PayOS again. The PayOS `cancelUrl` also appends a second `?` when the return URL already contains `order_id`. | `PaymentService::createSession`, `PayOsGateway::createSession` |
| W5B-05 | P1 | Reconcile converts an unreachable gateway into HTTP 200 + `pending_payment`, so the UI cannot distinguish “PayOS says pending” from “PayOS could not be reached”. A PayOS `CANCELLED`/`EXPIRED` result is also collapsed into ordinary pending. | `PaymentService::reconcile`, `PaymentReconcileTest`, `CheckoutReturnPage.jsx` |
| W5B-06 | P1 | Checkout warns when background cart/address refresh fails but still permits final submission using stale prerequisite data. A removed selected address can remain selected in local state. | `CheckoutPage.jsx` |
| W5B-07 | P2 | Voucher preview remains visible after the code is edited; voucher/order errors may render raw transport text, are not consistently linked to fields, and generic submit errors do not receive focus. | `CheckoutPage.jsx`, shared `Input` |
| W5B-08 | P2 | Checkout Return mutates React state inside TanStack Query's `refetchInterval` option. Retry-count behavior is render-dependent; an error with stale pending data is hidden; timeout has no explicit retry; malformed `order_id` still reaches the API. | `CheckoutReturnPage.jsx` |

## Reliability contract

### Order creation

1. `Idempotency-Key` is optional for non-browser clients, a non-empty string with a
   maximum of 128 characters when supplied, and scoped to the authenticated user.
2. The backend stores the key and a SHA-256 fingerprint on the order in the same
   transaction that reserves stock, consumes the voucher, snapshots the order, and
   clears the cart.
3. A replay with the same user, key, and normalized payload returns the existing
   order with HTTP 201. It does not inspect the now-empty cart or repeat any side
   effect.
4. Reusing the same user/key with a different payload returns HTTP 409
   `DUPLICATE_IDEMPOTENCY_KEY` and the existing `order_id`; it never silently creates
   a second order.
5. Checkout keys survive a same-tab reload in `sessionStorage` and rotate only after
   the backend has returned an order. Storage failures degrade to the current
   in-memory behavior.

### Payment session

1. After an online order response, Checkout enters an explicit “order created,
   opening PayOS” state. It no longer renders the checkout form or creates another
   order for that attempt.
2. A failed session request leaves the order ID visible, explains that the order
   already exists, and offers both “Thử mở lại PayOS” and order-detail recovery.
3. The backend stores the active payment URL and expiry on the order before returning
   it. Repeated session requests for a still-valid URL return the cached session and
   do not call PayOS again.
4. PayOS receives the same return URL for `returnUrl` and `cancelUrl`; PayOS appends
   its documented return parameters. This preserves the existing `order_id` query
   string and removes the malformed second `?`.
5. Payment URL/cache fields and order idempotency fields are internal and never added
   to `OrderResource`.

### Reconciliation and return

1. Reconcile returns additive `meta.payment_status`:
   `success | pending | failed`. Existing `data` remains `OrderResource`.
2. An unreachable gateway is HTTP 503 `GATEWAY_UNAVAILABLE`, not a false pending
   result. PayOS `CANCELLED`/`EXPIRED` is HTTP 200 with
   `meta.payment_status=failed`; the order remains recoverable under existing order
   rules.
3. Checkout Return performs one initial request and at most nine timed follow-ups
   (ten total). Poll scheduling occurs in an effect, never as a side effect of a query
   option callback.
4. Polling stops for success, cancelled order, failed payment, gateway/API error, or
   timeout. Error and timeout states both provide an explicit safe retry. A manual
   retry resets the follow-up budget.
5. Missing or malformed `order_id` never calls the reconcile endpoint.

## Checkout form and accessibility contract

- A background cart/address refresh error disables `Đặt hàng` until both
  prerequisites recover; existing data remains visible for context.
- The selected address is always a member of the latest successful address list.
  If it disappears, Checkout selects the current default or first address.
- Editing the voucher code clears the old preview and old voucher error. Voucher
  failures are rendered by the shared `Input` (`aria-invalid`,
  `aria-describedby`, `role=alert`) and focus the voucher field.
- Address validation failures are announced next to the address group and focus its
  first radio. Generic order failures focus a programmatic alert.
- Network/gateway failures use stable Vietnamese recovery copy; no raw Axios message
  is rendered.
- The final `Đặt hàng` button remains the only `confirmed` action. Retry controls use
  ordinary primary/secondary styling and do not dilute the State 4 color meaning.

## Data changes

Two additive, nullable migrations are required because durable replay and
response-loss recovery cannot be represented only in browser state:

- `orders.idempotency_key`, `orders.idempotency_fingerprint`, unique on
  `(user_id, idempotency_key)`;
- `orders.payment_url`, `orders.payment_session_expires_at`.

The migrations are idempotent and covered by test database refresh. They must not be
run against production by the agent; production migration remains the user's step.

## Out of scope

- Changing PayOS provider, transaction callback signature, inventory reservation
  duration, voucher math, refund semantics, order status enum, or customer/staff
  permissions.
- Autosaving the full checkout form across tabs/devices, adding a new payment method,
  or redesigning the Checkout layout.
- Wave 5A Auth/Account/Product forms, Wave 5C Admin CRUD, and Room Planner.

## Runtime verification

Real PayOS duplicate-link/cancel behavior, redirect handoff in a real browser,
screen-reader announcement timing, focus after an address is removed in another tab,
session-storage behavior in Safari private mode, and PostgreSQL concurrency under
simultaneous duplicate order requests are **Needs runtime verification**.

The active-session cache covers retries after the session response has been persisted.
PayOS session creation and the local database write cannot be one atomic transaction,
so a process failure after PayOS accepts the request but before the URL is persisted is
an operational edge case and is also **Needs runtime verification**.
