# Nestify Frontend — Design Spec & Implementation Roadmap

> **Visual-direction status — Decision Register D-001 (2026-07-12):** Section F,
> “Organic Editorial,” is superseded for storefront visual decisions. Its
> palette, layout, elevation, imagery, and motion guidance must not be used for
> new or redesigned storefront UI. Technical architecture, routing, API
> contracts, and other non-visual material remain historical reference where not
> superseded by a later active specification.

**Date:** 2026-06-13
**Status:** Approved (pending spec self-review)
**Scope:** Full rebuild of `FE-Nestify/Nestify-Furniture-e-commerce-frontend` as a React.js (JavaScript, no TypeScript) single-page app, covering customer storefront + admin back-office, against the API contract in `BE_Nestify/docs/FE_AI_CONTEXT.md` (commit `58b5418`).

---

## A. Architecture & Tech Stack

The current scaffold (`create-next-app`, Next.js 16 + React 19 + TypeScript) is **replaced entirely** with a Vite + React 18 SPA written in plain JavaScript (JSX, no TS). Rationale: BE is a separate Laravel API consumed over HTTP — there's no need for Next.js SSR/RSC, and a Vite SPA is simpler to reason about for a thesis project with a hard "no TypeScript" requirement.

### Core stack

| Concern | Choice | Notes |
|---|---|---|
| Build tool | Vite | Fast dev server, simple JS template (`react` template, not `react-ts`) |
| UI library | React 18 | Stable, broad ecosystem compatibility (react-three-fiber, etc.) |
| Routing | React Router v6 | Nested routes, role-protected route wrappers |
| Server state / caching | TanStack Query v5 | Handles caching, refetch, pagination (cursor & offset), retries |
| Client state | Zustand (+ `persist` middleware) | Auth token/user, cart-UI-only state (e.g. drawer open), checkout idempotency key |
| HTTP client | Axios | Single instance with request/response interceptors |
| Styling | Tailwind CSS | Utility-first, maps directly to design tokens (Section G) |
| Headless components | Radix UI primitives | Dialog, DropdownMenu, Tabs, Toast, Tooltip, Popover — styled with Tailwind |
| Forms & validation | React Hook Form + Yup | All auth, address, checkout, admin CRUD forms |
| 3D Room Planner | react-three-fiber + @react-three/drei + three.js | Loads `.glb` via `useGLTF`, drag/transform controls for placing variants |
| Rich text (admin) | TipTap (or Quill) + DOMPurify | Admin edits `products.description` (HTML); customer pages sanitize with DOMPurify before `dangerouslySetInnerHTML` |
| Testing | Vitest + React Testing Library | Light coverage: critical hooks (API layer, auth store) + key user flows |
| Icons | lucide-react | SVG icons only, per UX guidelines (no emoji icons) |

### Environment configuration

- `.env` / `.env.production` (Vite convention, `VITE_` prefix):
  - `VITE_API_BASE_URL` — Laravel API origin (e.g. `https://api.nestify.example/api`)
- All API calls go through this base URL. FE never runs the BE locally (per `FE_AI_CONTEXT.md` header note).

---

## B. Project Structure

```
src/
  app/
    App.jsx                # Root component: providers + router
    router.jsx             # Route tree definition
    providers.jsx          # QueryClientProvider, Zustand init, Toast provider
  pages/                    # Route-level components (thin — compose features)
    home/
    catalog/                # category & product listing
    product/                # product detail
    cart/
    checkout/
    orders/
    account/
    wishlist/
    rooms/                  # 3D room planner pages
    chat/
    admin/
      categories/
      products/
      orders/
      reviews/
      vouchers/
      users/
      audit/
  features/                 # Domain logic: API calls, hooks, feature-specific components
    auth/
    catalog/
    cart/
    checkout/
    orders/
    addresses/
    wishlist/
    reviews/
    vouchers/
    rooms/
    chat/
    admin/
  components/               # Shared design-system primitives (Button, Card, Input, Modal, Badge, Toast, Pagination...)
  lib/
    apiClient.js            # Axios instance + interceptors
    queryClient.js           # TanStack Query client config
    errors.js                # ApiError class + error-code → message mapping
    pagination.js            # useCursorQuery / useOffsetQuery helpers
    idempotency.js           # UUID generator for Idempotency-Key
  store/
    authStore.js             # Zustand: token, user, login/logout, persisted
    uiStore.js                # Zustand: cart drawer, mobile nav, non-persisted UI state
  styles/
    tokens.css                # CSS variables for Organic Editorial design tokens
    globals.css               # Tailwind base + global resets
  routes/
    ProtectedRoute.jsx        # Redirects to /login if unauthenticated/unverified
    AdminRoute.jsx             # Checks permission slugs from UserResource.roles
  test/
    setup.js
public/
```

**Conventions:**
- Each `features/<domain>/` folder owns: `api.js` (axios calls for that domain), `hooks.js` (TanStack Query hooks wrapping `api.js`), and domain-specific components.
- Pages import from `features/` and `components/` — pages stay thin (composition + layout only).
- No path aliases beyond `@/` → `src/` (configured in `vite.config.js` and `jsconfig.json` for editor support).

---

## C. API Integration Layer

### Axios instance (`lib/apiClient.js`)

- `baseURL = import.meta.env.VITE_API_BASE_URL`
- **Request interceptor:** reads token from `authStore`, sets `Authorization: Bearer <token>` if present.
- **Response interceptor:**
  - On success, unwraps `{ data, meta }` → returns `data` (and attaches `meta` for paginated endpoints via a symbol/second return path — pagination hooks handle this).
  - On error, normalizes the BE error envelope `{ error: { code, message, details } }` into a thrown `ApiError(code, message, details, httpStatus)` (see `lib/errors.js`).
  - On `401 UNAUTHENTICATED`: clears `authStore` (token + user) and redirects to `/login` (except for requests already targeting `/auth/*`, to avoid redirect loops on login-failure).
  - On `403` for `/admin/*` requests: surfaces as a normal `ApiError` — `AdminRoute` handles nav-level gating; in-page 403s show a "not allowed" message.
  - On `429 RATE_LIMITED` / `429 AI_TOKEN_BUDGET_EXCEEDED`: surfaced as `ApiError` with a dedicated UI treatment (toast for general rate limits; inline "budget exceeded" message in AI chat).

### Error handling (`lib/errors.js`)

- `ApiError` carries `code` (machine-readable, e.g. `INSUFFICIENT_STOCK`), `message` (Vietnamese, user-facing — used directly in toasts), and `details` (structured context, e.g. `{ variant_id, requested, available }` for stock errors).
- A small map from `code` → recovery behavior (not re-translated, since `message` is already Vietnamese):
  - `VALIDATION_FAILED` → map `details` (Laravel field errors) onto React Hook Form field errors via `setError`.
  - `INSUFFICIENT_STOCK` → show `message`, optionally clamp requested quantity to `details.available`.
  - `VOUCHER_NOT_APPLICABLE` / `VOUCHER_EXHAUSTED` → inline error under voucher input.
  - `ORDER_ALREADY_PAID` → refetch order, redirect to order detail.
  - `AI_TOKEN_BUDGET_EXCEEDED` → disable chat input, show budget-reset messaging.

### Pagination (`lib/pagination.js`)

Two patterns exist in the API and both need dedicated helpers:

- **Cursor pagination** (`/api/products`, `/api/products/{slug}/reviews`, `/api/admin/reviews`): `meta.pagination = { next_cursor, has_more, limit }`. Implemented via `useInfiniteQuery` — `getNextPageParam` returns `next_cursor` when `has_more`, else `undefined`. Used for "Load more" / infinite-scroll UI (product grid, review list).
- **Offset pagination** (`/api/room-scenes`, `/api/admin/products`, `/api/admin/orders`, `/api/admin/vouchers`, `/api/admin/users`, `/api/admin/audit-logs`): `meta.pagination = { total, page, last_page, per_page }`. Implemented via `useQuery` keyed on `[domain, 'list', { page, ...filters }]`, with a `<Pagination>` component (page numbers / prev-next) driving `page` state.

### Idempotency-Key (`lib/idempotency.js`)

- `POST /api/orders` accepts `Idempotency-Key`. The checkout flow generates one `crypto.randomUUID()` per checkout *attempt* (stored in `uiStore`, not persisted), sent on every retry of the same attempt, and regenerated only when the user starts a new checkout (new cart/scene) or after a successful order.

### Media

- Product/category images and 3D model URLs (`model_3d_url`) come pre-resolved as absolute URLs in API responses (Cloudinary-hosted) — FE just renders/loads them directly (with `loading="lazy"` for images, and Suspense + `useGLTF` for models).
- `POST /api/media/sign` (Sanctum + verified, non-admin) returns signed Cloudinary upload params. **Open question for BE** (see Section I): no current FE feature in this spec consumes it directly — admin product media uses the multipart `POST /api/admin/products/{product}/media` endpoint instead. We'll confirm with BE whether `/api/media/sign` is reserved for a future feature (e.g. review photos, avatars) before building anything against it.

---

## D. State Management Strategy

- **Auth (`authStore`, Zustand + `persist` → localStorage):** `{ token, user }` plus `login(token, user)`, `logout()`, `setUser(user)`. `user.roles` (array of permission slugs / role names from `UserResource`) drives `AdminRoute` and conditional admin nav rendering. Persisted so refresh doesn't log the user out; `apiClient` reads `token` directly from the store on each request.
- **Server state (TanStack Query):** everything from the API — catalog, cart, addresses, orders, wishlist, reviews, room scenes, vouchers (admin), users (admin), audit logs. Query keys are namespaced arrays, e.g. `['cart']`, `['products', { filters, cursor }]`, `['orders', orderId]`, `['admin', 'orders', { page, status }]`. Mutations invalidate the relevant keys (e.g. any cart mutation invalidates `['cart']`; voucher apply invalidates the cart preview only, not the cart itself).
- **UI-only state (`uiStore`, Zustand, not persisted):** cart drawer open/closed, mobile nav open, active checkout idempotency key, room-planner transient selection state (selected item id, gizmo mode) — kept out of React Query/auth store since it's purely client-side and ephemeral.
- **Forms (React Hook Form + Yup):** local to each form component; submit handlers call `features/<domain>/api.js` functions directly (via a mutation) rather than managing their own fetch logic.

---

## E. Routing & Page Map

All routes are Vietnamese-language; URL slugs use BE-provided `slug` fields directly (`/p/:productSlug`, `/c/:categorySlug`).

### Public (no auth)

| Route | Page | Key BE calls |
|---|---|---|
| `/` | Home | `GET /api/categories`, `GET /api/products` (featured/newest) |
| `/c/:categorySlug` | Category listing | `GET /api/categories/{slug}`, `GET /api/products?filter[category]=...` (cursor) |
| `/p/:productSlug` | Product detail | `GET /api/products/{slug}`, `GET /api/products/{slug}/reviews` (cursor) |
| `/cart` | Cart (guest-visible shell; mutations require auth) | `GET /api/cart`, cart mutations |
| `/login`, `/register` | Auth forms | `POST /api/auth/login`, `POST /api/auth/register` |
| `/forgot-password`, `/reset-password` | Password reset | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| `/verify-email` | Verification landing (consumes email link) | `POST /api/auth/verify-email` |
| `/rooms/share/:token` | Public shared room scene viewer (read-only 3D view) | `GET /api/room-scenes/share/{token}` |

### Authenticated customer (`ProtectedRoute` — Sanctum + verified)

| Route | Page | Key BE calls |
|---|---|---|
| `/checkout` | Checkout (address, voucher, gateway picker) | `GET /api/addresses`, `POST /api/cart/apply-voucher`, `POST /api/orders`, `POST /api/orders/{id}/payment-session` |
| `/checkout/return` | Payment return landing (handles gateway redirect back) | `GET /api/orders/{id}` (poll until status leaves `pending_payment` or timeout) |
| `/orders` | Order history | `GET /api/orders` (offset-ish; treat as simple list per `meta.pagination`) |
| `/orders/:id` | Order detail (status, items, cancel, retry payment) | `GET /api/orders/{id}`, `POST /api/orders/{id}/cancel`, `POST /api/orders/{id}/payment-session` |
| `/account` | Profile (name/email display, password change link) | `GET /api/auth/me` |
| `/account/addresses` | Address book (CRUD + set default) | `GET/POST/PATCH/DELETE /api/addresses`, `PATCH /api/addresses/{id}/default` |
| `/wishlist` | Wishlist | `GET /api/wishlist`, item mutations, `POST .../move-to-cart` |
| `/rooms` | My room scenes (offset pagination) | `GET /api/room-scenes` |
| `/rooms/new`, `/rooms/:id` | 3D Room Planner editor | `POST/GET/PATCH/DELETE /api/room-scenes(/{id})`, `POST /api/room-scenes/{id}/share`, `POST /api/room-scenes/{id}/convert-to-order` |
| `/chat` | AI shopping assistant (also available as a persistent widget) | `POST /api/ai/chat` |

Reviews: submission form lives on `/orders/:id` (per delivered order/product — `POST /api/products/{id}/reviews` requires `order_id`) and on `/p/:productSlug` for viewing + commenting (`POST /api/reviews/{id}/comments`).

### Admin (`AdminRoute` — Sanctum + permission slug per section)

| Route | Permission | Key BE calls |
|---|---|---|
| `/admin` | any admin permission | dashboard summary (composed from existing list endpoints — no dedicated dashboard endpoint) |
| `/admin/categories` | `manage_categories` | `GET/POST/PATCH/DELETE /api/admin/categories` |
| `/admin/products`, `/admin/products/:id` | `manage_products` | `GET/POST/PATCH/DELETE /api/admin/products`, variants & media sub-resources |
| `/admin/orders`, `/admin/orders/:id` | `manage_orders` (+ `refund`) | `GET /api/admin/orders`, `PATCH .../status`, `POST .../refund` |
| `/admin/reviews` | `moderate_reviews` | `GET /api/admin/reviews` (cursor), approve/reject |
| `/admin/vouchers` | `manage_vouchers` | `GET/POST/PATCH/DELETE /api/admin/vouchers` |
| `/admin/users` | `manage_users` | `GET /api/admin/users`, `PATCH .../roles` |
| `/admin/audit-logs` | `view_audit` | `GET /api/admin/audit-logs` |

**Admin detail-view caveat:** `GET /api/admin/categories/{id}` and `GET /api/admin/products/{id}` are registered but not implemented (`BE_REVIEW_NOTES.md`). Admin category/product "edit" views must source their initial data from the already-fetched list (TanStack Query cache lookup by id, or refetch the list and find the item) rather than calling a detail endpoint.

---

## F. Design System: "Organic Editorial"

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#F5F0E1` (Soft Cream) | Page background |
| `surface` | `#FBF8F3` | Cards, modals, elevated panels |
| `foreground` | `#2B2420` (Espresso Ink) | Primary text, headings |
| `muted-foreground` | `#8C8275` (Warm Taupe) | Secondary text, captions, placeholders |
| `border` | `#E3D7C8` | Dividers, input borders, card outlines |
| `primary` | `#C67B5C` (Terracotta) | Primary buttons, links, brand accents |
| `primary-hover` | `#B5651D` (Warm Clay) | Hover/active state for primary |
| `secondary` | `#6B7B3C` (Olive Green) | Secondary actions, success states, "in stock" badges |
| `accent` | `#D97706` (Amber Gold) | Sale badges, ratings/stars, highlight tags |
| `destructive` | `#C0392B` (Brick Red) | Errors, out-of-stock, delete actions |
| `ring` | `#C67B5C` | Focus rings |

Implemented as CSS variables in `styles/tokens.css` and mapped into `tailwind.config.js` `theme.extend.colors` as semantic names (`bg-background`, `text-foreground`, `bg-primary`, etc.) — components never use raw hex.

### Typography

- **Display/Headings:** Fraunces (variable, optional `SOFT` axis for marketing/product pages)
- **Body/UI:** Inter
- **Scale:** 12 / 14 / 16 / 18 / 24 / 32 / 48 / 64px — Fraunces for h1–h3 (24px+), Inter for 18px and below plus all UI chrome
- **Line height:** 1.5–1.6 body, 1.1–1.2 large display headings

### Layout & Components

- Editorial asymmetric grids for homepage/category/landing sections (large hero imagery + offset text blocks, alternating image/text feature rows)
- Soft rounded corners: 12px inputs/buttons, 16–20px cards/modals/product tiles
- Soft warm-toned shadows (`rgba(43,36,32,0.06)`), used sparingly for elevation
- Imagery-first product cards (4:5 or 1:1), hover lift (translateY + shadow, 200ms ease-out)
- Buttons: primary = filled terracotta/cream text; secondary = outline espresso/olive; ghost for tertiary
- Badges: pill-shaped — amber "Sale"/"New", olive "In Stock"/"Verified Purchase", brick-red "Out of Stock"
- Nav: minimal top nav, serif wordmark logo (Fraunces), generous letter-spacing on Inter nav links
- 3D Room Planner & AI Chat chrome (toolbars/panels) stay in `surface`/`background` tones so 3D content/chat stays visually dominant

### Motion

- 150–250ms ease-out, transform/opacity only
- Optional subtle grain/texture overlay on large hero sections only, low opacity, respects `prefers-reduced-motion`

---

## G. Feature Domains — FE/BE Contract Summary

This section maps each BE domain to the FE feature module and highlights anything FE must handle beyond a plain CRUD call. Full request/response shapes are in `FE_AI_CONTEXT.md` §3 — this is the "what FE needs to build around it" view.

### Auth (`features/auth`)
- Register/login store `{ token, user }` in `authStore`. Token sent as `Authorization: Bearer`.
- Unverified email → `403`; FE shows a "verify your email" banner/blocking screen with a resend-or-wait message (no resend endpoint exists — BE doc only documents the verify-link consumption endpoint).
- `ACCOUNT_INACTIVE` (403 on login, `archived` user) → distinct message from "wrong credentials" (`401`).

### Catalog (`features/catalog`)
- Category tree (`children` nested) drives nav/mega-menu.
- Product list: faceted filters (`filter[category]`, `filter[brand]`) + sort, cursor pagination → infinite scroll / "load more" grid.
- Product detail: variants (price/stock/3D model per variant), media gallery (`image`/`video`, ordered by `sort_order`), HTML `description` sanitized via DOMPurify before render.
- `available_stock` per variant drives "Add to cart" disabled state and quantity max.

### Cart (`features/cart`)
- Single source of truth: `GET /api/cart`. All mutations (`add`, `update qty`, `remove`) refetch/invalidate `['cart']`.
- `409 INSUFFICIENT_STOCK` on add/update → inline message using `details.available`, clamp quantity input.
- Voucher preview (`POST /api/cart/apply-voucher`) is a separate, non-persisted preview — its result (`discount_amount`, `final_total`) is shown in cart/checkout summary but only consumed by the order on `POST /api/orders` via `voucher_code`. Per `decisions-pending.md`, only **one voucher per order** — UI allows a single voucher code input, not a list.

### Addresses (`features/addresses`)
- Standard CRUD + `PATCH /api/addresses/{id}/default`. Checkout address selector defaults to the address where `is_default: true`.

### Orders & Checkout (`features/checkout`, `features/orders`)
- Checkout: `source: "cart"` (default) or `"scene"` (from Room Planner "convert to order" flow — see Rooms). `address_id` required; `voucher_code` optional.
- `Idempotency-Key` header on every `POST /api/orders` attempt (see Section C).
- After order creation (`status: pending_payment`), FE immediately calls `POST /api/orders/{id}/payment-session` with a chosen `gateway` (`payos` | `stripe`) and `return_url` pointing at `/checkout/return?order_id={id}` — **gateway is user-selected via a picker UI** (confirmed in `BE_REVIEW_NOTES.md`: `CreatePaymentSessionRequest` requires `gateway`, no default).
- `/checkout/return` polls `GET /api/orders/{id}` (e.g. every 2–3s, capped attempts) until `status` is no longer `pending_payment`, since the actual payment confirmation arrives via an async webhook FE never calls directly.
- Order detail: `POST /api/orders/{id}/cancel` only enabled while `status === 'pending_payment'`. "Retry payment" (re-run payment-session) only enabled while `pending_payment`; `409 ORDER_ALREADY_PAID` → refetch + show paid state.
- `payment-session` is rate-limited (10/min) — disable the "Pay now" button while a request is in flight and surface `429 RATE_LIMITED` clearly if hit.

### Wishlist (`features/wishlist`)
- `notify_on_restock` toggle per item (`PATCH .../{id}` — boolean only, separate from full item replace).
- `POST .../move-to-cart` can return `409 INSUFFICIENT_STOCK` — show inline error, leave item in wishlist.

### Reviews (`features/reviews`)
- Submission requires `order_id` of a `delivered` order containing the product ("verified purchase") — review form on `/orders/:id` is scoped to delivered orders' line items, passing `order_id` automatically (user never types it).
- New reviews start `pending` — not visible on `/p/:productSlug` reviews list (`GET /api/products/{slug}/reviews` only returns `approved`). FE should show the user a "submitted, awaiting approval" confirmation rather than expecting it to appear immediately.
- Comments (`POST /api/reviews/{id}/comments`) are 1-level (no nested replies) per `01-overview.md`.

### Room Scenes / 3D Planner (`features/rooms`)
- Scene = `width × depth × height` (room dimensions) + `items[]` (variant placements with `position/rotation/scale` `{x,y,z}`).
- Editor loads each placed variant's `model_3d_url` via `useGLTF`, renders within a room-bounds helper sized from `width/depth/height`.
- `PATCH /api/room-scenes/{id}` with `items` **fully replaces** placed items — FE always sends the complete current item list on save, not a diff.
- Sharing: `POST .../share` is idempotent (safe to call even if already shared) → returns `share_token`; FE builds the public URL `/rooms/share/{token}`.
- `POST .../convert-to-order` replaces the user's cart with the scene's items, then creates an order (`source: "scene"`, `scene_id`) — FE should warn the user their current cart will be replaced before calling this.

### AI Chat (`features/chat`)
- `POST /api/ai/chat`, rate-limited 10/min + 50/day per user (authed only — matches `decisions-pending.md` P1#4 recommendation).
- Response includes `sources[]` (`entity_type`, `entity_id`, optional `product_name`) — render as "referenced products" links where `entity_type` maps to a product, linking to `/p/:slug` (FE resolves slug via existing product cache/lookup if not directly provided).
- `429 AI_TOKEN_BUDGET_EXCEEDED` → disable input, show a clear "daily limit reached" message (no documented reset-time field, so message stays generic).

### Admin (`features/admin/*`)
- **Categories/Products:** list + create/update/delete via offset (products) or plain list (categories, small dataset). Edit views hydrate from list-cache, not a detail endpoint (see Section E caveat).
- **Variants & Media:** nested under products — variant CRUD via `/api/admin/products/{id}/variants` (create) and `/api/admin/variants/{id}` (update); media via multipart upload + reorder + delete.
- **Orders:** status transitions via a fixed forward state machine (`processing → shipped → delivered`, plus `cancelled`) — FE renders only the valid next-state options per current status (mirrors the Order state diagram in §4 of `FE_AI_CONTEXT.md`).
- **Refund:** `POST /api/admin/orders/{id}/refund` is **synchronous** in current BE code (returns final `status` immediately) despite `decisions-pending.md` P1#5 recommending an async 2-step flow — FE implements the simple synchronous version (submit amount+reason → show result), and this should be flagged to the BE team as a confirm-before-build item if a 2-step UX is later required.
- **Reviews moderation:** cursor-paginated queue, approve/reject — queue item removed from list optimistically on action.
- **Vouchers:** full CRUD; `type: percentage|fixed`, usage limits, date range — form validation mirrors BE Yup-equivalent constraints (`min_order_value`, `max_discount` only relevant for `percentage`, etc.).
- **Users/Roles:** `PATCH /api/admin/users/{id}/roles` takes `role_ids` — FE needs a roles list to populate the multi-select; **no `GET /api/roles` endpoint is documented** — flagged in Section I as an open item.
- **Audit log:** read-only paginated table, filterable client-side or via future query params (none documented currently beyond pagination).

---

## H. Backend Caveats Carried Into This Design

From `BE_REVIEW_NOTES.md` / `decisions-pending.md`, already reflected above but consolidated here:

1. `GET /api/admin/categories/{id}` and `GET /api/admin/products/{id}` do not work — admin edit views use list-cache lookups (Section E, G).
2. Refund is synchronous in current code, not the 2-step async flow some docs describe — FE builds the synchronous flow (Section G/Admin).
3. Payment gateway is user-selected (no default) — gateway picker UI required at checkout (Section G/Checkout).
4. Cross-user resource access returns `404` (not `403`) due to query-scoping rather than policy checks — FE treats any `404` on "my own resource" routes the same way regardless of whether the resource doesn't exist or belongs to someone else (no special-casing needed, but don't assume `404` always means "never existed").
5. Voucher: single voucher per order (Section G/Cart).
6. AI chat: authed-only rate limiting, 10/min + 50/day (Section G/AI Chat).

---

## I. Open Questions for BE Team

These don't block starting implementation (Phases 0–2 don't depend on them) but should be confirmed before the relevant phase:

1. **`POST /api/media/sign`** — which FE feature is this for? No documented consumer. (Relevant before any feature that needs direct Cloudinary upload from the customer side, e.g. review photos/avatars — none currently in scope.)
2. **Roles list for `PATCH /api/admin/users/{id}/roles`** — no `GET /api/roles` (or similar) endpoint documented; admin Users page needs a source for the role multi-select options. (Relevant for Phase 8/Admin.)
3. **Refund UX** — confirm whether the synchronous refund (current code) is final, or whether a 2-step `pending_manual` + confirm flow (as some docs describe) will be implemented before Phase 8/Admin ships.
4. **Resend verification email** — only the verify-link *consumption* endpoint (`POST /api/auth/verify-email`) is documented; if a user's verification email expires/is lost, is there a resend endpoint? (Relevant for Phase 1/Auth UX polish.)

---

## J. Testing Strategy (Light Coverage)

- **Unit:** `lib/apiClient.js` interceptors (token injection, error normalization), `lib/pagination.js` helpers, `authStore` actions.
- **Component/integration (RTL):** critical flows only —
  - Login/register form validation + success/error paths
  - Cart add/update/remove with stock-error handling
  - Checkout happy path (address → voucher → gateway → order creation, mocked API)
  - Product detail variant selection + add-to-cart
  - Admin product list + create form validation
- Mock the API layer with `msw` (Mock Service Worker) or simple `vi.mock` on `features/*/api.js`, keyed to the response shapes in `FE_AI_CONTEXT.md` so tests stay aligned with the real contract.
- No E2E framework in scope (light testing tier, per project decisions).

---

## K. Phased Implementation Roadmap

Each phase is a vertical slice; later phases build on earlier ones. Phases 0–1 get a detailed implementation plan immediately after this spec; Phases 2–10 remain roadmap-level until reached (each may get its own detailed plan when started).

1. **Phase 0 — Foundation:** Vite scaffold (JS), Tailwind config with Organic Editorial tokens, design-system primitives (Button, Input, Card, Badge, Modal/Dialog via Radix, Toast, Pagination), app shell (Header/Footer/Layout, nav), router skeleton with placeholder pages, axios client + TanStack Query + Zustand wiring, Vitest setup.
2. **Phase 1 — Auth & Account:** register/login/logout, `authStore`, email-verification gating, forgot/reset password, `ProtectedRoute`, account profile page, address book CRUD + default address.
3. **Phase 2 — Catalog:** category nav, product listing (filters, sort, cursor "load more"), product detail (variants, media gallery, sanitized description), product reviews display.
4. **Phase 3 — Cart & Wishlist:** cart page (add/update/remove, stock errors), wishlist page (toggle restock notify, move-to-cart), voucher preview on cart.
5. **Phase 4 — Checkout & Orders:** checkout flow (address + voucher + gateway picker + idempotency key), order creation, payment-session redirect, `/checkout/return` polling, order history & detail, cancel/retry payment.
6. **Phase 5 — Reviews:** review submission from delivered orders, review comments on product page.
7. **Phase 6 — 3D Room Planner:** scene list (offset pagination), 3D editor (place/move/rotate/scale variants via react-three-fiber + drei), save/update scene, public share view, convert-to-order.
8. **Phase 7 — AI Chat:** chat widget (persistent) + `/chat` page, rate-limit/budget handling, sources rendering.
9. **Phase 8 — Admin Catalog & Orders:** categories, products + variants + media management, order list/detail/status transitions, refund (sync flow).
10. **Phase 9 — Admin Moderation & Config:** review moderation queue, vouchers CRUD, users/roles, audit log.
11. **Phase 10 — Polish & Testing:** accessibility pass (contrast, focus, keyboard nav), responsive QA across breakpoints, fill out Vitest/RTL coverage per Section J, performance pass (image lazy-loading, route-level code splitting, bundle size check).

---

## L. Out of Scope (per MVP / project decisions)

- i18n / multi-language (Vietnamese-only UI)
- Multi-currency
- Native mobile apps
- Live chat with human agents (AI chat only)
- Advanced analytics dashboards beyond the documented admin endpoints
