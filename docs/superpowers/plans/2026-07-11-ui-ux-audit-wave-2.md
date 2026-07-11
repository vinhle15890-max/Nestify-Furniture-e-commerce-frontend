# Nestify UI/UX Audit — Wave 2 Implementation Plan

**Date:** 2026-07-11

**Status:** Implemented — automated verification complete; runtime verification pending

**Design spec:** `docs/superpowers/specs/2026-07-11-ui-ux-audit-wave-2-design.md`

**Issues:** AUD-04 (P1), AUD-05 (P2)

---

## Execution record

- AUD-04 is implemented on Category, Cart, Cart Drawer, Checkout, Wishlist, Orders, and Addresses.
- AUD-05 is implemented for admin table captions/action names and scoped dialog descriptions; the
  Room Setup dialog received description/error announcement semantics only.
- Focused regression suite: 22 files, 121 tests passed; the final full suite passed 612/612 across
  130 files.
- Frontend lint: zero errors and two pre-existing React Refresh warnings in Room Planner scene files.
- Production build passed; the existing large-chunk advisory remains.
- `nestify-review` passed: no forbidden colors, no new misuse of `imagined`/`confirmed`, no sales/urgency
  copy, and all new first-load failures have a recovery path.
- Local Snyk is unavailable, so no security-scan pass is claimed.
- No dependency manifest, migration, backend file, payment rule, RBAC rule, or Room Scene persistence
  behavior was changed by Wave 2. No commit was created.
- Browser/offline and screen-reader checks remain **Needs runtime verification**.

---

## Execution plan

### Task 0 — Preflight

- Preserve the uncommitted Wave 1 changes in both repos.
- Confirm the scoped frontend tests pass before Wave 2 edits.
- Do not touch backend Room Scene code or run migrations.

### Task 1 — Shared load-error primitive (TDD)

Files:

- `src/components/LoadErrorState.jsx`
- `src/components/LoadErrorState.test.jsx`

Acceptance:

- alert title/description are announced;
- retry calls once, has `type="button"`, and is disabled while retrying;
- compact mode retains the same semantics.

### Task 2 — Transactional and ownership error recovery (TDD)

Files:

- `src/pages/cart/CartPage.jsx`
- `src/components/layout/CartDrawer.jsx`
- `src/pages/checkout/CheckoutPage.jsx`
- `src/pages/orders/OrdersPage.jsx`
- `src/pages/account/AddressesPage.jsx`
- their colocated tests

Acceptance:

- failed requests do not become empty states;
- retry recovers content;
- checkout hides all order-submission UI until both prerequisites have usable data;
- empty-success tests remain green.

### Task 3 — Exploration error recovery (TDD)

Files:

- `src/pages/catalog/CategoryPage.jsx`
- `src/pages/wishlist/WishlistPage.jsx`
- their colocated tests

Acceptance:

- product/wishlist failure has retry and truthful copy;
- category metadata and product-list failures are recoverable independently;
- current filters survive retry;
- genuine zero-result states remain unchanged.

### Task 4 — Admin semantic context (TDD where page tests exist)

Files may include:

- admin order/product/voucher/audit/role/customer/employee/category pages;
- `CategoryFormModal.jsx`, `VoucherFormModal.jsx`, `VariantFormModal.jsx`,
  `RoleFormDialog.jsx`;
- affected tests.

Acceptance:

- tables have captions and named action columns;
- repeated actions include their row entity in the accessible name;
- scoped form dialogs provide descriptions;
- visible UI and business behavior do not change.

### Task 5 — Verification and handoff

- Run the focused Wave 2 suite.
- Run the full frontend test suite, lint, and build.
- Run `nestify-review` against all changed storefront UI.
- Run `git diff --check` and confirm no dependency/migration/backend change was added by Wave 2.
- Record Snyk as unavailable if the local scanner is absent; do not claim a scan passed.
- Mark browser-only checks **Needs runtime verification**.
- Do not commit unless explicitly requested.
