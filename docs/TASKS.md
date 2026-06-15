# Nestify Frontend — Remaining Work (Module Task Board)

**Status as of 2026-06-15:** Phase 0 (Foundation) is complete and merged to `main`. Phases 1–5
(Auth & Account, Catalog, Cart & Wishlist, Checkout & Orders, Reviews), Phase 8 (Admin
Catalog & Orders), and Phase 9 (Admin Moderation & Config) are implemented and verified
(tests/lint/build clean) on branch `feat/phase-1-auth-account`, pending review/merge. Phases
6–7 (3D Room Planner, AI Chat) are deferred for now; Phase 10 (Polish & Testing) is next.
**Full design spec:** `docs/superpowers/specs/2026-06-13-fe-nestify-design.md` — read the relevant section before starting a module.
**API contract:** `BE_Nestify/docs/FE_AI_CONTEXT.md` (BE repo).

Each phase below is a roughly independent module. Pick one, branch off `main`, and follow TDD
(Vitest + RTL) per the testing strategy in spec Section J. Keep pages thin — put API calls and
hooks in `features/<domain>/api.js` and `features/<domain>/hooks.js`, compose them in `pages/`.

---

## Working with an AI assistant on a module

`AGENTS.md` (repo root) is the standing context file — Claude Code and most AI coding tools
load it automatically. It covers the stack, conventions, and reference files from Phase 0.
If your tool doesn't auto-load it, paste it in manually.

**Starter prompt template** — fill in the bracketed parts for the module you're picking up:

```
Read AGENTS.md for project conventions and stack.

I'm implementing [Phase N — Module Name] for the Nestify frontend (see docs/TASKS.md,
section "[Phase N — Module Name]" for the task checklist).

Relevant design spec sections: docs/superpowers/specs/2026-06-13-fe-nestify-design.md,
Section(s) [E / G / ...] — read these for the exact routes, BE endpoints, and edge cases.

Follow the existing Phase 0 patterns referenced in AGENTS.md (Zustand store, apiClient,
ApiError, pagination hooks, feature folder layout with api.js + hooks.js).

Work in a feature branch off main. Use TDD (Vitest + RTL): write a failing test, implement,
verify it passes. Run `npm run lint` and `npm test -- --run` before each commit — both must
be clean. Make small, frequent commits.

Start with: [first checklist item, e.g. "features/auth/api.js — register, login, logout, me"]
```

**For a whole phase at once** (multi-task, same session): the Phase 0 work was executed using
the `superpowers` plugin's `brainstorming` → `writing-plans` → `subagent-driven-development`
skills. `docs/superpowers/plans/2026-06-13-phase0-foundation.md` is a worked example of the
plan format those skills produce — useful as a reference if your AI tool supports the same
plugin and you want to generate a similar task-by-task plan for a new phase before implementing.

**Sanity checks before opening a PR:**
- `npm run lint` — 0 errors
- `npm test -- --run` — all tests pass
- `npm run build` — succeeds
- No raw hex colors, no `.ts`/`.tsx` files, no new translation strings (Vietnamese only)

---

## Already built in Phase 0 — reuse these, don't recreate

- **Components** (`src/components/`): `Button`, `Card`, `Input`, `Badge`, `Modal`, `Toast` (+ `Toaster`), `Pagination`, `Spinner`
- **Layout** (`src/components/layout/`): `Header`, `Footer`, `Layout`
- **Lib** (`src/lib/`): `apiClient.js` (axios + interceptors), `errors.js` (`ApiError`/`normalizeError`), `pagination.js` (offset/cursor helpers), `queryClient.js`
- **Store** (`src/store/`): `authStore` (token/user, persisted), `uiStore` (cart drawer, mobile nav), `toastStore`
- **Routing** (`src/app/router.jsx`, `src/routes/`): `ProtectedRoute`, `AdminRoute`, route tree wired into `App.jsx`
- **Design tokens**: `src/styles/tokens.css` (Organic Editorial palette, Tailwind v4 `@theme`)

Placeholder pages exist for: Home, Login, Account, Admin dashboard, 404 — replace these in-place
as each phase lands rather than creating duplicates.

---

## Phase 1 — Auth & Account

**Folders:** `src/features/auth/`, `src/features/addresses/`, `src/pages/auth/`, `src/pages/account/`

- [x] `features/auth/api.js` — `register`, `login`, `logout`, `me`, `forgotPassword`, `resetPassword`, `verifyEmail`
- [x] `features/auth/hooks.js` — TanStack Query mutations/queries wrapping the above; on login success call `authStore.login(token, user)`
- [x] `/login` page — form (React Hook Form + Yup), map `VALIDATION_FAILED` → field errors, distinct messages for `401` (bad credentials) vs `403 ACCOUNT_INACTIVE`
- [x] `/register` page — same pattern
- [x] `/forgot-password`, `/reset-password` pages
- [x] `/verify-email` landing page (consumes link token)
- [x] Email-verification gating: unauthenticated-but-unverified users see a blocking "verify your email" screen (no resend endpoint — see open question #4)
- [x] `/account` page — replace placeholder, show profile from `GET /api/auth/me`, link to password change
- [x] `features/addresses/api.js` + `hooks.js` — CRUD + `PATCH /addresses/{id}/default`
- [x] `/account/addresses` page — list, add/edit/delete, set default
- [x] Tests: login/register form validation + success/error paths, `authStore` actions (already partially covered), `ProtectedRoute` redirect behavior with real auth flow

**Spec refs:** Section E (Public + Authenticated routes), Section G (Auth, Addresses), Section H item 4 (cross-user `404`)

---

## Phase 2 — Catalog

**Folders:** `src/features/catalog/`, `src/pages/home/`, `src/pages/catalog/`, `src/pages/product/`

- [x] `features/catalog/api.js` — `getCategories`, `getCategory(slug)`, `getProducts(filters, cursor)`, `getProduct(slug)`, `getProductReviews(slug, cursor)`
- [x] `features/catalog/hooks.js` — `useCategories`, `useInfiniteProducts` (cursor `useInfiniteQuery`), `useProduct`, `useProductReviews`
- [x] Category nav / mega-menu (top of Header) from `GET /api/categories` (nested `children`)
- [x] `/` Home — replace placeholder: hero + featured/newest product sections
- [x] `/c/:categorySlug` — category listing: filters (`filter[category]`, `filter[brand]`), sort, infinite-scroll/"load more" grid
- [x] `/p/:productSlug` — product detail: variant selector (price/stock/3D model per variant), media gallery (image/video by `sort_order`), `description` sanitized with DOMPurify
- [x] Reviews display section on product page (approved reviews only, cursor pagination)
- [x] `available_stock` per variant drives Add-to-cart disabled state + quantity max
- [x] Tests: product card rendering, variant selection updates price/stock, category filter changes query key

**Spec refs:** Section E (public routes), Section G (Catalog)

---

## Phase 3 — Cart & Wishlist

**Folders:** `src/features/cart/`, `src/features/wishlist/`, `src/pages/cart/`, `src/pages/wishlist/`

- [x] `features/cart/api.js` — `getCart`, `addItem`, `updateItem`, `removeItem`, `applyVoucher`
- [x] `features/cart/hooks.js` — `useCart`, mutations invalidate `['cart']`; voucher preview as separate non-persisted query
- [x] `/cart` page — guest-visible shell, item list, qty controls, voucher input + preview (discount/final total)
- [x] `409 INSUFFICIENT_STOCK` handling — inline message using `details.available`, clamp qty input
- [x] `features/wishlist/api.js` + `hooks.js` — list, add/remove, `notify_on_restock` toggle (`PATCH`, boolean only), `move-to-cart`
- [x] `/wishlist` page — list, toggle restock notify, move-to-cart (handle `409 INSUFFICIENT_STOCK` → inline error, keep item)
- [x] Cart drawer (uses `uiStore.toggleCart`, already wired in Header) — mini cart summary
- [x] Tests: cart add/update/remove incl. stock-error handling, voucher preview applies to summary only

**Spec refs:** Section G (Cart, Wishlist), Section H item 5 (single voucher per order)

---

## Phase 4 — Checkout & Orders

**Folders:** `src/features/checkout/`, `src/features/orders/`, `src/pages/checkout/`, `src/pages/orders/`

- [x] `lib/idempotency.js` — `crypto.randomUUID()` per checkout attempt, stored in `uiStore` (not persisted), regenerated on new attempt or after success
- [x] `features/checkout/api.js` — `createOrder` (with `Idempotency-Key` header, `source: "cart"`), `createPaymentSession(orderId, gateway, returnUrl)` (addresses/voucher reused from existing `features/addresses` and `features/cart`)
- [x] `/checkout` page — address selector (defaults to `is_default: true`), voucher input, **gateway picker** (`payos` | `stripe`), submit → create order → create payment session → redirect
- [x] `/checkout/return` page — polls `GET /api/orders/{id}` every 2–3s (capped attempts) until status leaves `pending_payment`
- [x] `features/orders/api.js` + `hooks.js` — `getOrders`, `getOrder(id)`, `cancelOrder` (retry payment reuses `useCreatePaymentSession` from `features/checkout/hooks.js`)
- [x] `/orders` page — order history list
- [x] `/orders/:id` page — status, items, **Cancel** (enabled only while `pending_payment`), **Retry payment** (enabled only while `pending_payment`; handle `409 ORDER_ALREADY_PAID` → refetch + show paid state)
- [x] Rate-limit handling: disable "Pay now" while in-flight, surface `429 RATE_LIMITED`
- [x] Tests: checkout happy path (address → voucher → gateway → order creation, mocked API), cancel/retry button enable logic

**Spec refs:** Section C (Idempotency-Key), Section G (Orders & Checkout), Section H items 2–4

---

## Phase 5 — Reviews

**Folders:** `src/features/reviews/`, integrates into `pages/orders/` and `pages/product/`

- [x] `features/reviews/api.js` + `hooks.js` — `createReview(productId, payload)`, `createComment(reviewId, body)`
- [x] Review form on `/p/:productSlug` — scoped to delivered orders' line items, `order_id` passed automatically (verified purchase)
- [x] "Submitted, awaiting approval" confirmation after submit (new reviews are `pending`, not shown immediately)
- [x] Comments UI on `/p/:productSlug` review list — 1-level only (no nested replies)
- [x] Tests: review form only renders for a verified (delivered) purchase, submit shows pending confirmation

**Deviation from spec wording:** the review-submission form lives on `/p/:productSlug`, not
`/orders/:id`. `OrderItemResource`/`variant_snapshot` (BE `SnapshotOrderData.php`) contain no
`product_id` or product slug, and no documented endpoint resolves `variant_id → product`, so
`/orders/:id` cannot drive `POST /api/products/{id}/reviews` or link to a product page.
Instead, `/p/:productSlug` (where `product.id` and `product.variants[].id` are already loaded)
cross-references `useOrders()` for a `delivered` order containing one of this product's
variants, and auto-fills `order_id` from it. `/orders/:id` shows a passive hint for delivered
orders pointing the user to the product page.

**Spec refs:** Section G (Reviews)

---

## Phase 6 — 3D Room Planner

**Folders:** `src/features/rooms/`, `src/pages/rooms/`

- [ ] Add deps: `three`, `@react-three/fiber`, `@react-three/drei`
- [ ] `features/rooms/api.js` + `hooks.js` — CRUD `/api/room-scenes` (offset pagination), `share`, `convert-to-order`
- [ ] `/rooms` page — scene list (offset `<Pagination>`)
- [ ] `/rooms/new`, `/rooms/:id` — 3D editor: room-bounds helper from `width/depth/height`, load variant `model_3d_url` via `useGLTF`, drag/transform controls (place/move/rotate/scale)
- [ ] Save: `PATCH /api/room-scenes/{id}` sends the **full** current `items[]` (no diffing)
- [ ] Share: call `POST .../share` (idempotent) → build `/rooms/share/{token}` public URL
- [ ] `/rooms/share/:token` — public read-only viewer (no auth)
- [ ] Convert-to-order: confirm dialog warning cart will be replaced, then `POST .../convert-to-order`
- [ ] Tests: scene save sends full item list, share URL construction

**Spec refs:** Section A (3D stack), Section G (Room Scenes)

---

## Phase 7 — AI Chat

**Folders:** `src/features/chat/`, `src/pages/chat/`

- [ ] `features/chat/api.js` + `hooks.js` — `POST /api/ai/chat`
- [ ] Persistent chat widget (mountable from `Layout`) + dedicated `/chat` page
- [ ] Render `sources[]` as "referenced products" links (`entity_type` → product → `/p/:slug`, resolve slug via product cache/lookup)
- [ ] `429 AI_TOKEN_BUDGET_EXCEEDED` → disable input, generic "daily limit reached" message
- [ ] Tests: sources render as links, budget-exceeded disables input

**Spec refs:** Section G (AI Chat), Section H item 6

---

## Phase 8 — Admin Catalog & Orders

**Folders:** `src/features/admin/`, `src/pages/admin/{categories,products,orders}/`

- [x] `features/admin/{categories,products,orders}/api.js` + `hooks.js` — categories, products (+variants, +media), orders, refund — split into per-domain files
- [x] `/admin/categories` — list + create/update/delete (small dataset, plain list)
- [x] `/admin/products`, `/admin/products/:id` — offset-paginated list, create/edit form; **edit hydrates from list-cache** (no working `GET /admin/products/{id}`)
- [x] Variant CRUD (`POST /admin/products/{id}/variants`, `PATCH /admin/variants/{id}`)
- [x] Media: multipart upload, reorder, delete
- [x] `/admin/orders`, `/admin/orders/:id` — offset list + detail
- [x] Order status transitions — render only valid next states per forward state machine (`processing → shipped → delivered`, or `cancelled`)
- [x] Refund — `POST /admin/orders/{id}/refund` (**synchronous**: submit amount+reason → show result immediately)
- [x] Tests: admin product list + create form validation, order status transition options match current status

**Spec refs:** Section E (Admin routes + detail-view caveat), Section G (Admin), Section H items 1–2

**Deviations from `FE_AI_CONTEXT.md` / spec:**
1. **Media reorder payload** — `PATCH /admin/products/{product}/media/reorder` actually expects
   `{ids: [...]}` (a flat, ordered array of media IDs; `sort_order` = position in the array),
   not `media_order: [{id, sort_order}]` as documented. Confirmed against
   `ProductMediaController::reorder`'s validation rules. FE sends `{ids}`.
2. **No admin detail endpoints** — `GET /admin/products/{id}` and `GET /admin/orders/{id}` are
   not implemented (only `index`/`store`/`update`/`destroy` and
   `index`/`updateStatus`/`refund` respectively). `AdminProductEditPage` and
   `AdminOrderDetailPage` hydrate from `location.state` (passed by the list pages' "Sửa"/"Xem"
   links) and fall back to searching the `['admin','products']` / `['admin','orders']` query
   cache for a matching `id`; if neither yields data, the page shows a "not found" message with
   a link back to the list.

---

## Phase 9 — Admin Moderation & Config

**Folders:** `src/features/admin/{reviews,vouchers,users,auditLogs}/`, `src/pages/admin/{reviews,vouchers,users,auditLogs}/`

- [x] `/admin/reviews` — cursor-paginated moderation queue, approve/reject, optimistic removal from list on action
- [x] `/admin/vouchers` — full CRUD (`type: percentage|fixed`, usage limits, date range); form validation mirrors BE constraints (`min_order_value`, `max_discount` shown only for `percentage` as a UX nicety)
- [x] `/admin/users` — **read-only** list (id, name, email, status, roles, email-verified) — `PATCH /admin/users/{id}/roles` (`role_ids` multi-select) remains **blocked on open question #2** (no `GET /api/roles` endpoint and `UserResource.roles` returns role names, not ids; no reliable name→id mapping for the FE)
- [x] `/admin/audit-logs` — read-only paginated table (offset), expandable `old_values`/`new_values` diff per row
- [x] Tests: voucher form validation rules (incl. server 422 mapping), review queue optimistic removal, users list, audit log pagination + expansion

**Spec refs:** Section G (Admin), Section I item 2

**Deviations from `FE_AI_CONTEXT.md` / spec:**
1. **`/admin/users` is read-only** — role assignment (`PATCH /admin/users/{id}/roles`) was not
   built; see open question #2 below.

---

## Phase 10 — Polish & Testing

- [ ] Accessibility pass: contrast, focus rings, keyboard nav across all new pages
- [ ] Responsive QA across breakpoints (mobile/tablet/desktop) for every page built in Phases 1–9
- [ ] Fill out Vitest/RTL coverage per spec Section J for any flows not yet covered
- [ ] Performance pass: image lazy-loading, route-level code splitting, bundle size check
- [ ] Final `prefers-reduced-motion` audit on hero/motion sections

---

## Open questions to confirm with BE (don't block on these unless noted)

From spec Section I:

1. **`POST /api/media/sign`** — no documented FE consumer currently; ignore unless a future feature needs direct Cloudinary upload from the customer side.
2. **Roles list for `PATCH /admin/users/{id}/roles`** — no `GET /api/roles` endpoint documented,
   and `UserResource.roles` returns role *names* (strings), not ids, so there's no reliable
   name→id mapping for the FE either. **Phase 9 implemented `/admin/users` as read-only**;
   revisit role assignment once a roles-lookup endpoint (or id-returning `UserResource`) exists.
3. **Refund UX** — Phase 8 implemented the refund form against the current synchronous
   `POST /admin/orders/{id}/refund` (amount+reason → immediate result). Revisit if a 2-step
   flow is introduced later.
4. **Resend verification email** — no documented resend endpoint. Relevant to Phase 1 auth UX polish (the "verify your email" screen can't offer a resend button until this is confirmed).

---

## Workflow reminders

- Branch off `main` per module (or per phase, if a teammate is taking a whole phase).
- Follow TDD: write the failing test, implement, run tests, commit in small steps.
- Run `npm run lint` and `npm test -- --run` before opening a PR — both must be clean.
- Reuse design tokens (`src/styles/tokens.css`) and shared components — don't introduce raw hex colors or duplicate Button/Card/etc. variants.
- Vietnamese-language UI throughout (per spec — no i18n in scope).
