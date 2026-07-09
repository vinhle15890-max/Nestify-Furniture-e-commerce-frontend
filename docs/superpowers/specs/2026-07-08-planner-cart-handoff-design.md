# #6 — Planner→Cart "imagined" Handoff — Design Spec

Date: 2026-07-08
Status: Approved (design), not yet implemented. Cross-stack (Laravel BE + React FE).
Standing constraints: user runs BE migration + deploys; nothing committed until user asks.

## Purpose

Complete the journey the rest of the system already sets up:

Product Detail → "Xem trong không gian" → Room Planner (variant preloaded via deep-link, #4)
→ arrange + **Lưu** (saves the room as the `imagined` peak) → **Thêm vào giỏ**
→ Cart shows an `imagined`-tinted callback confirming the fit with the room the user built.

This realizes the **Component Bible micro-transition "Transactional Commitment (Cart)"**
(`docs/nestify/04_Component_Bible.md`), which sits between State 3 (Mentally Real) and State 4
(Committed):

- **Success Behavior:** on transition from a *saved* Planner to Cart, show a specific callback
  ("Đã xác nhận vừa với phòng khách bạn đã tạo"), not generic sales copy. The room thumbnail is
  attached **"nếu có"** (explicitly optional).
- **Failure Behavior:** if the user reaches Cart without ever going through the Planner for that
  item, do **not** fake a callback — fall back to Discover's neutral language.
- **Visual Spec:** `imagined` continues here (inherited from Planner), one step before `confirmed`
  at Checkout — the single colour transition in the system.

## Decisions (user, 2026-07-08)

1. **Room image = text-only callback, no snapshot.** The 3D scene has no saved 2D render; a real
   image would need `preserveDrawingBuffer` + `toDataURL` + Cloudinary upload. The Bible marks the
   image "nếu có" (optional) and the callback line as the mandatory part, so we ship the callback
   only. Snapshot deferred as a separate future enhancement.
2. **Room context persisted as a nullable `room_scene_id` FK on `cart_items`.** Cart is
   server-authoritative (survives device changes via BE); a client-side map would not, and would
   drift from the server cart. Chosen over a client-only Zustand map. Mirrors #7's nullable-FK
   approach.
3. **Add-to-cart scope = whole room, aggregated by variant.** One "Thêm vào giỏ" button in the
   planner toolbar. Placement instances are aggregated by `variant.id` → `quantity` = placement
   count. The cart reflects exactly the room the user built ("mua căn phòng tôi vừa thấy vừa").

4. **Mechanism = a single BE endpoint `POST /room-scenes/{id}/add-to-cart`** (revised during
   implementation, user-approved). Discovered `RoomSceneService::convertToOrder` already loops a
   saved scene's items server-side; reusing that pattern is cleaner than the FE making N `addItem`
   calls, and aggregates from the **persisted** scene (source of truth) rather than the client
   editor store. The endpoint is **best-effort**: an out-of-stock variant is skipped and reported
   in `meta.skipped[]`, the rest still go in (a cart is adjustable, unlike `convertToOrder` which is
   atomic). This supersedes the "FE sequential addItem loop" described in the FE section below.

## Out of scope (YAGNI)

- Room snapshot image (per decision 1 — text-only).
- A batch add-to-cart endpoint (sequential per-variant calls; rooms are small).
- Making the button idempotent / relabelling it after add (standard add-to-cart semantics — an
  explicit user action that can be repeated).
- Per-item "Thêm vào giỏ" in `SelectedItemPanel` (whole-room only, per decision 3).

---

## Backend (Laravel — `Nestify-Furniture-e-commerce-backend/src/`)

User runs the migration and deploys; the author never migrates against the real/prod DB.

### Migration — `add_room_scene_id_to_cart_items_table`

New migration file (`database/migrations/2026_07_08_..._add_room_scene_id_to_cart_items_table.php`):

```php
// up
$table->foreignId('room_scene_id')->nullable()->after('variant_id')
      ->constrained('room_scenes')->nullOnDelete();
// down
$table->dropForeign(['room_scene_id']);
$table->dropColumn('room_scene_id');
```

- `null` = item added outside any room context (today's behavior — zero regression).
- `nullOnDelete()` = if the room is deleted, the tag clears itself and the callback silently
  retires (no stale/fake callback).

### `app/Models/CartItem.php`

- Add `'room_scene_id'` to `$fillable`.
- Add relation:
  ```php
  public function room(): BelongsTo
  {
      return $this->belongsTo(RoomScene::class, 'room_scene_id');
  }
  ```

### `app/Http/Requests/Cart/AddCartItemRequest.php`

- Add `use Illuminate\Validation\Rule;`.
- Add rule (ownership-scoped, same discipline as #7's variant-of-this-product check):
  ```php
  'room_scene_id' => ['nullable', 'integer',
      Rule::exists('room_scenes', 'id')->where('user_id', $this->user()->id)],
  ```
- Add message: `'room_scene_id.exists' => 'Phòng thiết kế không tồn tại hoặc không thuộc về bạn.'`

### `app/Services/CartService.php` — `addItem`

- Thread a new optional param `?int $roomSceneId = null` (last param, backward compatible).
- On **create** → include `'room_scene_id' => $roomSceneId`.
- On **merge** (existing item, per `unique(cart_id, variant_id)`): keep the existing quantity
  increment, and apply the **COALESCE rule for the tag** — overwrite `room_scene_id` **only when
  `$roomSceneId !== null`**; a null (plain/direct add) leaves the existing room tag intact. Latest
  room wins; a direct re-add never erases a legitimate room confirmation; `nullOnDelete` handles
  staleness.
  ```php
  if ($existingItem) {
      $existingItem->increment('quantity', $quantity);
      if ($roomSceneId !== null) {
          $existingItem->update(['room_scene_id' => $roomSceneId]);
      }
  } else {
      $cart->items()->create([
          'variant_id'          => $variantId,
          'quantity'            => $quantity,
          'unit_price_snapshot' => $variant->price,
          'room_scene_id'       => $roomSceneId,
      ]);
  }
  ```
- Eager-load the room everywhere the cart is returned: change `->load(['items.variant.product.media'])`
  to `->load(['items.variant.product.media', 'items.room'])` in `show()` and in `addItem()`'s
  return (and `updateItem`'s return, so the callback survives a quantity edit).

### `app/Http/Controllers/CartController.php` — `addItem`

- Pass the validated room id through:
  ```php
  $roomSceneId = $request->validated('room_scene_id');
  $cart = $this->service->addItem(
      $request->user(),
      (int) $request->validated('variant_id'),
      (int) $request->validated('quantity'),
      $roomSceneId !== null ? (int) $roomSceneId : null,
  );
  ```

### `app/Http/Resources/CartItemResource.php`

- Expose minimal room context (id + name; name feeds the callback):
  ```php
  'room' => $this->whenLoaded('room', fn () => [
      'id'   => $this->room->id,
      'name' => $this->room->name,
  ]),
  ```
- Null/absent when there is no room → FE renders the neutral (no-callback) branch.

### `RoomSceneService::addSceneToCart` + endpoint (decision 4)

- `RoomSceneService::addSceneToCart(RoomScene $scene, User $user): array` — `loadMissing('items.variant.product')`,
  loop items, `cartService->addItem($user, $item->variant_id, 1, $scene->id)` each, catch
  `InsufficientStockException` per item (dedupe skipped by variant → product name), return
  `['cart' => show($user), 'skipped' => list<string>]`. Does **not** clear the cart (unlike
  `convertToOrder`).
- `RoomSceneController::addToCart(Request, int $id)` — ownership via
  `$request->user()->roomScenes()->with('items')->find($id)` (null → 404); returns
  `['data' => CartResource, 'meta' => ['skipped' => [...]]]`.
- Route: `POST room-scenes/{id}/add-to-cart` (auth group, next to `convert-to-order`).
- Tests: `tests/Feature/RoomScene/AddSceneToCartTest.php` — guest 401, foreign scene 404, tags
  items with room + `meta.skipped=[]`, duplicate placements aggregate quantity, out-of-stock item
  skipped + reported.

### BE tests — `tests/Feature/Cart/CartRoomHandoffTest.php` (new)

1. add-with-room → item persists `room_scene_id`, resource exposes `room.name`.
2. add-without-room → `room_scene_id` null, resource has no `room`.
3. merge on null add → existing room tag preserved (COALESCE keep).
4. merge on non-null add → room tag overwritten to the new room (latest wins).
5. foreign-user room id → 422 (ownership rule).
6. Regression: existing cart add/merge/stock tests still green.

---

## Frontend — Planner side

> Built per decision 4 (single BE endpoint), which supersedes the FE `addItem`-loop originally
> sketched here. `CartService::addItem` still accepts `room_scene_id` internally (the endpoint uses
> it), but the FE cart api is unchanged.

### `src/features/roomPlanner/api.js` + `hooks.js`

- `addSceneToCart(id)` → `apiClient.post('/room-scenes/${id}/add-to-cart')`.
- `useAddSceneToCart()` mutation → invalidates `['cart']` on success.

### `src/pages/roomPlanner/PlannerToolbar.jsx`

- Add a **"Thêm vào giỏ"** button beside "Lưu".
- **Not `imagined`** — Save keeps the single `imagined` peak (State 3). This button is the
  mechanical handoff; the `imagined` *feeling* carries into the Cart callback, not onto this button.
  Use the neutral/primary button styling already used elsewhere in the toolbar.
- Props: `onAddToCart`, `addingToCart` (spinner), and disabled when the room is empty
  (`itemCount === 0`) or a save/add is in flight.

### `src/pages/roomPlanner/RoomPlannerPage.jsx` — `handleAddToCart`

1. **Ensure saved.** Extracted `ensureSaved()` (shared with `handleSave`): returns `store.id` when
   already saved+clean, else create/update-mutates and returns the resulting scene id. If save
   fails, toast and abort (no untagged add).
2. **One call.** `addSceneToCart.mutateAsync(sceneId)` — the BE loops the persisted scene, tags each
   item with the scene, and aggregates by variant via the `addItem` merge.
3. **Skipped summary.** Read `response.meta.skipped[]`; empty → success toast; non-empty →
   `default`-variant toast naming the out-of-stock items ("Một số món hiện hết hàng, chưa thêm
   được: …"). Either way navigate to `/cart`. Hard failure → error toast, stay.
4. The mutation invalidates `['cart']` on success.

### Auth note

Saving a room already requires an authenticated user (`room_scenes.user_id`), and the cart is
token-gated. So a saved room implies an authed session — no new auth branch is introduced. If save
succeeds, add succeeds.

---

## Frontend — Cart side

### `src/pages/cart/CartPage.jsx` and `src/components/layout/CartDrawer.jsx`

For each item, when `item.room` is present, render a callback line under the item:

> **Đã xác nhận vừa với phòng '{item.room.name}' bạn đã tạo.**

- Styled with the `imagined` role (tint/accent, not a solid CTA) — inherited from the Planner, one
  step before `confirmed` at Checkout. `imagined` is valid here per the Bible.
- When `item.room` is absent → render nothing (neutral Discover language; the Bible failure clause
  is satisfied for free by the null branch — no fabricated callback).

### FE tests

- `CartPage.test.jsx`: item with `room` → callback line shown containing the room name; item without
  `room` → no callback line.
- `CartDrawer.test.jsx`: parity (callback shown when `room` present).
- `RoomPlannerPage` test (or a focused unit): `handleAddToCart` aggregates by variant, saves first
  when dirty, calls `addItem` with `room_scene_id`, navigates to `/cart` on success; partial failure
  produces the summary toast.

---

## Verification checklist

- BE: new handoff tests + full cart regression green (sqlite `:memory:` Docker image, per
  `be-tests-sqlite-docker`).
- FE: `npm run lint` clean; `npm test -- --run` green (new + regression); `npm run build` exit 0.
- Manual (user): Product Detail → preview → Planner → Lưu → Thêm vào giỏ → Cart shows the
  imagined callback with the room name; a directly-added item shows no callback; deleting the room
  clears the callback.
- Docs: update `docs/nestify/14-workflows.md` (or the relevant workflow doc) at high code-path
  detail per the standing "keep docs in sync" rule.
