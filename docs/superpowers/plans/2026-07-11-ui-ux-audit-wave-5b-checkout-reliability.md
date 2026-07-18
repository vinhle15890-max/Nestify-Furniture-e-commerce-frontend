# UI/UX Audit Wave 5B Implementation Plan

## Scope files

### Frontend

- `src/pages/checkout/CheckoutPage.jsx` and colocated test.
- `src/pages/checkout/CheckoutReturnPage.jsx` and colocated test.
- `src/lib/idempotency.js` and test.
- Existing `features/checkout` hooks/API only if their contract needs coverage.

### Backend

- Order request/DTO/service/model/controller exception wiring and feature tests.
- Payment service, PayOS adapter, payment-session/reconcile tests.
- Two additive order migrations.
- Order/payment API and workflow documentation.

Wave 5A and 5C files remain untouched.

## Tasks

1. **TDD — order idempotency.** Add feature tests proving same-key/same-payload
   replay returns one order with one inventory reservation, different payload returns
   `409 DUPLICATE_IDEMPOTENCY_KEY`, an overlong header returns 422, and internal
   columns do not serialize.
2. **Backend — order idempotency.** Validate/normalize the header, add the DTO key and
   deterministic fingerprint, persist both atomically, serialize attempts per user,
   return an existing order before reading the cleared cart, and render the 409
   conflict with `order_id`.
3. **TDD + backend — payment recovery.** Prove repeated session requests call the
   gateway once, PayOS receives an uncorrupted cancel URL, gateway outage becomes 503,
   and pending/failed/success reconciliation outcomes are distinct.
4. **Backend — payment recovery.** Cache the active session URL/expiry on the order,
   make session creation lock-aware, return additive reconcile metadata, and surface
   gateway unavailability.
5. **TDD + frontend — durable key and Checkout form.** Cover session-storage reload,
   stale-prerequisite submit blocking, address reselection/error focus, voucher preview
   invalidation/error linkage, safe network copy, and payment-session recovery without
   a second `createOrder` call.
6. **Frontend — Checkout implementation.** Add explicit post-order payment state and
   safe retry, strengthen prerequisite/address gating, clear stale voucher preview,
   map checkout errors locally (to avoid overlap with Wave 5A), and focus the relevant
   field/alert.
7. **TDD + frontend — Checkout Return.** Cover malformed ID, stale-data error,
   manual retry, ten-call timeout, failed-payment result, and terminal polling stop.
8. **Frontend — Return implementation.** Replace query-option side effects with a
   controlled timeout effect, treat any query error as unknown, and add explicit
   retry/recovery states.
9. **Verify and review.** Run focused FE tests, focused BE tests, scoped lint/Pint,
   FE build, `git diff --check`, and a `nestify-review` pass. Record any concurrent
   Wave 5A limitation separately.
10. **Sync docs.** Update API/workflow/database/FE context to the implemented behavior
    and leave the production migration command to the user.

## Acceptance criteria

- One user/key cannot produce more than one order; replay does not repeat inventory,
  voucher, snapshot, or cart side effects.
- A created order is never mistaken for an empty-cart checkout after PayOS session
  failure; retrying payment never calls `createOrder` again.
- A repeated active payment-session request does not call PayOS again.
- Reconcile distinguishes pending, failed, and unavailable gateway states; all stop or
  resume polling predictably.
- Checkout cannot submit while prerequisite data is stale/unverified.
- Voucher/address/order errors are specific, announced, focused, and never expose raw
  transport text.
- Ten reconcile calls maximum per automatic cycle; timeout and error both offer retry.
- No internal reliability fields appear in API resources; no dependency, status enum,
  inventory, voucher, refund, or permission rule changes.

## Risk and dependency

- Risk: medium-high because order creation touches money/inventory and requires an
  additive migration. Mitigation: database uniqueness + transaction/user lock +
  feature tests assert side-effect counts.
- Payment session cache assumes the 30-minute PayOS/order reservation window already
  documented by the backend. Real provider behavior remains a runtime check.
- Production dependency: user runs the two migrations after review; this agent does
  not run production migrations.

## Status

Implementation complete on 2026-07-11. Production migrations have not been run.

## Execution record

- Frontend focused tests: 30 passed across checkout, checkout return, and
  idempotency-key coverage.
- Frontend full suite: 131 files and 662 tests passed.
- Frontend scoped ESLint passed. Full lint completed with zero errors and two
  pre-existing `react-refresh/only-export-components` warnings in Room Planner.
- Frontend production build passed; the existing large-chunk advisory remains.
- Backend final focused contract suite: 45 tests and 134 assertions passed.
- Backend full suite was verified in four isolated groups because the monolithic
  PHPUnit process was terminated by the local runner late in the run: 574 tests
  passed, 3 skipped, and 1,884 assertions completed across the groups.
- Scoped Pint passed for the new PHP files. A whole-touched-file Pint check still
  reports legacy formatting drift in existing backend files; no broad formatter was
  run to avoid unrelated changes.
- Nestify Design DNA review found no new semantic-color, CTA hierarchy, failure-copy,
  or capability-boundary violations in Wave 5B.
- Real PayOS, browser redirect, assistive-technology, Safari private-mode, and
  concurrent PostgreSQL checks remain **Needs runtime verification**.
