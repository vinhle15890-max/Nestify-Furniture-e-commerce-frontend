# Room Planner — Commerce Clarity: Bill-of-Materials & Order-the-Room (Sub-project C)

**Date:** 2026-07-09
**Status:** Design approved, pending implementation
**Repos:** `Nestify-Furniture-e-commerce-backend` (one small resource change) + `Nestify-Furniture-e-commerce-frontend`

## Context

Sub-project C of the Room Planner roadmap (A → C → B). A ("Phòng của tôi" + Share +
floor-snap) is built. C makes the planner honest about cost — the DNA promise is
"see clearly before you decide" (Enemy = fear of irreversible decisions), yet today
the planner shows no running total and offers no direct path from an imagined room to
a purchase.

Two capabilities:
1. A **Bill-of-Materials (BoM) / room summary** in the planner: an itemised list and a
   running total of the placed furniture.
2. An **"Đặt cả phòng"** (order-the-room) action that carries the room into the
   existing checkout funnel.

### Findings that shaped the design

- **`convertToOrder` (BE) is deliberately NOT used.** It clears the user's existing
  cart, is PayOS-only (no COD), ignores vouchers, and still needs a follow-up payment
  session — strictly less flexible than the battle-tested checkout. Decision: the
  purchase path routes through the existing checkout instead. The endpoint stays in
  the BE, unused, as a possible future "express" path.
- **Placed-item prices are missing on reload.** Items added in-session via `CatalogTray`
  carry `variant.price`, but `RoomSceneItemResource` exposes only
  `variant.{id,sku,model_3d_url}`, so a *saved* scene reopened has no prices → an
  unreliable BoM. Fix: enrich the resource (below). This also unblocks the shared-page
  product list deferred from Sub-project A.
- **`ProductVariantResource` already carries everything needed** — `name`, `price`,
  `model_3d_url`, and conditional `product_name`/`product_slug`/`thumbnail` (via
  `whenLoaded('product')`, using `asset?->url` so **`cloudinary_id` is never
  serialized**). So the enrichment is a swap + an eager-load, not a new resource.

## Goals

1. The planner shows, live, what furniture is in the room and what it costs in total.
2. A saved scene reopened shows the same reliable BoM (prices survive a reload).
3. A single "Đặt cả phòng" action takes the room's items into the existing checkout.

## Non-goals (deferred / excluded)

- Using the raw `POST /room-scenes/{id}/convert-to-order` endpoint (excluded by decision).
- Wiring an itemised product list into the shared viewer page (optional follow-up; the
  BE data becomes available here but the SharedRoomPage UI is out of scope for C).
- Quantity editing inside the planner (a placed item is one unit; grouping is display-only).
- Taxes/shipping estimation in the BoM (checkout owns the final totals).

## Design decisions (locked)

- **Purchase mechanism:** route through the existing checkout. "Đặt cả phòng" =
  `ensureSaved` → `addSceneToCart` → `navigate('/checkout')`. No new BE for purchase.
- **BoM data:** enrich `RoomSceneItemResource` (BE) so name/price/thumbnail are present
  on every scene fetch.
- **Colour roles:** the BoM is neutral (clarity, not a state) — no `imagined`/`confirmed`.
  The "Đặt cả phòng" button is `primary`; `confirmed` remains exclusive to the Checkout
  confirm button.

## Components & data flow

### C1. BE — enrich `RoomSceneItemResource` (be-implementer)

- In `app/Http/Resources/RoomSceneItemResource.php`, replace the inline `variant` array
  with `'variant' => new ProductVariantResource($this->whenLoaded('variant'))`.
- In `app/Services/RoomSceneService.php`, change the eager-loads from `items.variant` to
  `items.variant.product.media` in: `listForUser`, `findForUser`, `findByToken`,
  `create` (its returning `->load(...)`), and `share`. (`convertToOrder`/`addSceneToCart`
  don't render this resource, so leave their loads.)
- **Backward compatibility:** FE `mappers.js` already reads `variant.name/price/thumbnail`
  with fallbacks, and the cart handoff/merge key on `variant_id` — adding fields breaks
  nothing. `cloudinary_id` stays unserialised (ProductVariantResource uses `asset?->url`).
- **Tests:** update `ShowRoomSceneTest` / `ShareRoomSceneTest` / `ListRoomScenesTest` to
  assert the enriched `variant` shape (`id, sku, name, price, model_3d_url` and, when the
  product is loaded, `product_name`/`thumbnail`). Confirm no existing assertion pins the
  old minimal `variant` shape; adjust any that do.

### C2. FE — `RoomSummary` (BoM) panel in the planner

- New `src/pages/roomPlanner/RoomSummary.jsx`, rendered in the planner's left `aside`
  below `SelectedItemPanel`.
- Groups `store.items` by `variant.id` → `{ variant, qty }`; renders each line as
  `name · ×qty · lineTotal` and a **Tổng tạm tính** = Σ(price × qty).
- A line whose `variant.price` is null renders its money cells as `—` (never fabricate a
  price); such lines are excluded from the total, and the total is annotated when any line
  is unpriced so the number isn't silently wrong.
- Neutral styling; prices use the numeric/utility treatment (tabular figures) via
  `formatPrice`. Empty (`items.length === 0`) → the panel renders nothing (the empty room
  is the CatalogTray's job).
- Pure helper `summarizeItems(items)` extracted (in `RoomSummary.jsx` or
  `features/roomPlanner/`) → `{ lines: [{ variantId, name, price, qty, lineTotal }], total, hasUnpriced }`,
  unit-tested without rendering 3D.

### C3. FE — "Đặt cả phòng" purchase CTA

- Add an `onOrder` + `ordering` prop and an "Đặt cả phòng" button to `PlannerToolbar`,
  next to "Thêm vào giỏ" (variant `primary`; disabled when `itemCount === 0`).
- In `RoomPlannerPage`, `handleOrder`: `ensureSaved` → `addSceneToCart.mutateAsync(sceneId)`
  → on success `navigate('/checkout')`. Reuse the existing skipped-items toast logic (a
  variant that can't be fully stocked is reported, the rest proceed). On error, the
  existing error toast.
- The button carries the room into the cart then to checkout — checkout then owns
  address/payment/voucher/confirm. `confirmed` colour is NOT used here.

## Error handling

- BoM: missing price → `—`, excluded from total, total annotated; never throws.
- Order: `ensureSaved`/`addSceneToCart` failures surface the existing error toast; partial
  stock → skipped-items toast, then still proceed to checkout with what was added.

## Testing

- **BE:** feature tests assert the enriched `variant` payload on show/list/share.
- **FE:** `summarizeItems` unit tests (total, grouping by variant, unpriced handling);
  `RoomSummary` render test (lines + total, `—` for unpriced); toolbar/`RoomPlannerPage`
  test that "Đặt cả phòng" saves, adds the scene to cart, and navigates to `/checkout`.
- Full FE suite stays green (currently 425).

## DNA compliance

- The BoM is pure clarity — neutral colour, honest about unknown prices — serving the
  "see the cost before you decide" principle; it makes the decision feel cheaper/safer.
- `imagined` stays on Save only; `confirmed` stays on the Checkout confirm only; the
  order CTA is `primary`.
- No false-urgency copy; the summary states facts, not pressure.
