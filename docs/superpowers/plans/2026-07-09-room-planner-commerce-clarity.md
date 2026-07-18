# Room Planner — Commerce Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Room Planner a live bill-of-materials (itemised list + running total) and an "Đặt cả phòng" action that carries the room into the existing checkout.

**Architecture:** One small BE resource enrichment (so saved scenes carry item prices), then two FE additions — a `RoomSummary` panel driven by a pure `summarizeItems` helper, and a toolbar "Đặt cả phòng" button reusing the existing save + add-to-cart handoff, redirecting to `/checkout`.

**Tech Stack:** BE Laravel (Eloquent API Resources); FE React (JSX), zustand, @tanstack/react-query, Tailwind v4 tokens, Vitest + RTL. BE tests via Docker + sqlite `:memory:`.

## Global Constraints

- **`cloudinary_id` is NEVER serialized** in any API resource. (Enrichment reuses
  `ProductVariantResource`, which already exposes `thumbnail` via `asset?->url` — do not
  add raw media ids.)
- **Only customers can purchase** — the order path funnels through `OrderService::create`,
  which blocks staff. C adds no new purchase path (it reuses checkout), so this holds.
- **Do NOT run `git commit` until the user explicitly authorizes** (project guardrail).
  Treat "Commit" steps as *stage + hold*.
- **Do NOT run prod migrations.** C1 has **no migration** (resource-only change).
- **Colour roles:** the BoM is neutral; `imagined` stays on planner Save only; `confirmed`
  stays on the Checkout confirm only; the "Đặt cả phòng" button is `primary`.
- **No false-urgency copy.** FE is plain JSX (no TS). Full FE suite (425) stays green.

## File Structure

**Backend (`Nestify-Furniture-e-commerce-backend/src`):**
- Modify: `app/Http/Resources/RoomSceneItemResource.php` — render `variant` via `ProductVariantResource`.
- Modify: `app/Services/RoomSceneService.php` — eager-load `items.variant.product.media` at the 5 resource-rendering sites.
- Modify (tests): `tests/Feature/RoomScene/ShowRoomSceneTest.php`, `ListRoomScenesTest.php`, `ShareRoomSceneTest.php` — assert enriched variant fields.

**Frontend (`Nestify-Furniture-e-commerce-frontend`):**
- Create: `src/features/roomPlanner/summary.js` — `summarizeItems(items)`.
- Create: `src/features/roomPlanner/summary.test.js`.
- Create: `src/pages/roomPlanner/RoomSummary.jsx` + `RoomSummary.test.jsx`.
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx` — mount `RoomSummary`; add `handleOrder`.
- Modify: `src/pages/roomPlanner/PlannerToolbar.jsx` — add "Đặt cả phòng" button.
- Modify: `src/pages/roomPlanner/PlannerToolbar.test.jsx` (if present) or add coverage in `RoomPlannerPage.test.jsx`.

---

### Task 1: BE — enrich `RoomSceneItemResource`

**Files:**
- Modify: `Nestify-Furniture-e-commerce-backend/src/app/Http/Resources/RoomSceneItemResource.php`
- Modify: `Nestify-Furniture-e-commerce-backend/src/app/Services/RoomSceneService.php`
- Test: `Nestify-Furniture-e-commerce-backend/src/tests/Feature/RoomScene/ShowRoomSceneTest.php` (+ List/Share)

**Interfaces:**
- Produces: `GET /room-scenes/{id}`, `GET /room-scenes`, `GET /room-scenes/share/{token}` now return each item's `variant` with at least `{ id, sku, name, price, model_3d_url }`, plus `product_name`, `product_slug`, `thumbnail` when the product is loaded.

- [ ] **Step 1: Update the failing test first**

In `tests/Feature/RoomScene/ShowRoomSceneTest.php`, extend the structure assertion in the
owner-can-view test to require the enriched variant shape. Add to the `assertJsonStructure`
`items` node:

```php
->assertJsonStructure([
    'data' => [
        'id', 'name', 'description', 'width', 'depth', 'height', 'is_public', 'share_token',
        'items' => [
            ['id', 'variant' => ['id', 'sku', 'name', 'price', 'model_3d_url'], 'position', 'rotation', 'scale'],
        ],
        'created_at',
    ],
])
```

Ensure the test's scene is created with at least one item whose variant has a known
`price` (e.g. `ProductVariant::factory()->create(['price' => 500000])`) and assert it:

```php
->assertJsonPath('data.items.0.variant.price', 500000.0);
```

- [ ] **Step 2: Run the test to verify it fails**

From the BE repo, run the RoomScene suite via Docker + sqlite (see `docs/07-testing.md` for
the exact image/entrypoint; the run must `config:clear && route:clear` first):

Run: `php artisan test --filter=ShowRoomSceneTest` (inside the sqlite `:memory:` container)
Expected: FAIL — `variant` has no `name`/`price` yet.

- [ ] **Step 3: Enrich the resource**

Replace the inline `variant` array in `app/Http/Resources/RoomSceneItemResource.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomSceneItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'variant'  => new ProductVariantResource($this->whenLoaded('variant')),
            'position' => ['x' => $this->pos_x, 'y' => $this->pos_y, 'z' => $this->pos_z],
            'rotation' => ['x' => $this->rot_x, 'y' => $this->rot_y, 'z' => $this->rot_z],
            'scale'    => ['x' => $this->scale_x, 'y' => $this->scale_y, 'z' => $this->scale_z],
        ];
    }
}
```

- [ ] **Step 4: Eager-load the product+media so name/price/thumbnail resolve**

In `app/Services/RoomSceneService.php`, change every `items.variant` eager-load that feeds a
rendered `RoomSceneResource` to `items.variant.product.media` — at these five sites:
`listForUser` (`->with('items.variant')`), `create` (`return $scene->load('items.variant')`),
`findForUser` (`RoomScene::with('items.variant')->findOrFail`), `findByToken`
(`RoomScene::with('items.variant')`), and `update` (`return $scene->load('items.variant')`).
Leave `addSceneToCart`'s `loadMissing('items.variant.product')` as-is (it renders a CartResource).

Example (apply the same substring change at all five):

```php
// before
->with('items.variant')
// after
->with('items.variant.product.media')
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --filter=ShowRoomSceneTest`
Expected: PASS.

- [ ] **Step 6: Extend List + Share tests and run the full RoomScene suite**

Add the same enriched-`variant` structure assertion (name/price present) to
`ListRoomScenesTest.php` and `ShareRoomSceneTest.php` (the share payload loads
`items.variant`; assert `data.items.0.variant.price`). Then:

Run: `php artisan test --filter=RoomScene`
Expected: PASS (all RoomScene feature tests green — Create/Update assert `variant.id`, still present).

- [ ] **Step 7: Commit** (stage + hold per Global Constraints)

```bash
git add app/Http/Resources/RoomSceneItemResource.php app/Services/RoomSceneService.php tests/Feature/RoomScene/
git commit -m "feat(room-scene): expose variant name/price/thumbnail on scene items"
```

---

### Task 2: FE — `summarizeItems` helper + `RoomSummary` panel

**Files:**
- Create: `src/features/roomPlanner/summary.js`
- Create: `src/features/roomPlanner/summary.test.js`
- Create: `src/pages/roomPlanner/RoomSummary.jsx`
- Create: `src/pages/roomPlanner/RoomSummary.test.jsx`
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx`

**Interfaces:**
- Produces:
  - `summarizeItems(items)` → `{ lines: Array<{ variantId, name, price, qty, lineTotal }>, total: number, hasUnpriced: boolean }`. Groups by `variant.id`; `price`/`lineTotal` are `null` when the variant has no usable price; `total` sums only priced lines; `hasUnpriced` is true if any line is unpriced.
  - `RoomSummary({ items })` — renders nothing when `items` is empty; otherwise the grouped lines + a "Tổng tạm tính" total.

- [ ] **Step 1: Write the failing helper test**

Create `src/features/roomPlanner/summary.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { summarizeItems } from './summary'

const item = (localId, id, name, price) => ({ localId, variant: { id, name, price } })

describe('summarizeItems', () => {
  it('groups repeated variants by count and sums the total', () => {
    const result = summarizeItems([
      item(1, 10, 'Sofa', 5000000),
      item(2, 10, 'Sofa', 5000000),
      item(3, 20, 'Bàn', 2000000),
    ])
    expect(result.lines).toEqual([
      { variantId: 10, name: 'Sofa', price: 5000000, qty: 2, lineTotal: 10000000 },
      { variantId: 20, name: 'Bàn', price: 2000000, qty: 1, lineTotal: 2000000 },
    ])
    expect(result.total).toBe(12000000)
    expect(result.hasUnpriced).toBe(false)
  })

  it('treats a null/NaN price as unpriced: excluded from total, flagged', () => {
    const result = summarizeItems([
      item(1, 10, 'Sofa', 5000000),
      item(2, 30, 'Đèn', null),
    ])
    expect(result.total).toBe(5000000)
    expect(result.hasUnpriced).toBe(true)
    const lamp = result.lines.find((l) => l.variantId === 30)
    expect(lamp.price).toBeNull()
    expect(lamp.lineTotal).toBeNull()
  })

  it('returns an empty summary for no items', () => {
    expect(summarizeItems([])).toEqual({ lines: [], total: 0, hasUnpriced: false })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/roomPlanner/summary.test.js`
Expected: FAIL — `summarizeItems` not exported.

- [ ] **Step 3: Implement `summarizeItems`**

Create `src/features/roomPlanner/summary.js`:

```javascript
// Group placed items by variant for a bill-of-materials view. A placed item is
// one unit, so quantity = how many times a variant appears. Prices may be absent
// (a variant with no usable price) — those lines are shown but excluded from the
// total, which is then flagged as incomplete rather than silently wrong.
export function summarizeItems(items) {
  const byVariant = new Map()

  for (const it of items ?? []) {
    const variant = it.variant ?? {}
    const id = variant.id
    const priceNum = Number(variant.price)
    const price = Number.isFinite(priceNum) ? priceNum : null

    const existing = byVariant.get(id)
    if (existing) {
      existing.qty += 1
    } else {
      byVariant.set(id, { variantId: id, name: variant.name ?? '', price, qty: 1 })
    }
  }

  const lines = [...byVariant.values()].map((line) => ({
    ...line,
    lineTotal: line.price === null ? null : line.price * line.qty,
  }))

  const total = lines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0)
  const hasUnpriced = lines.some((l) => l.price === null)

  return { lines, total, hasUnpriced }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/features/roomPlanner/summary.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing `RoomSummary` test**

Create `src/pages/roomPlanner/RoomSummary.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoomSummary } from './RoomSummary'

const item = (localId, id, name, price) => ({ localId, variant: { id, name, price } })

describe('RoomSummary', () => {
  it('renders grouped lines and a running total', () => {
    render(<RoomSummary items={[item(1, 10, 'Sofa', 5000000), item(2, 10, 'Sofa', 5000000)]} />)
    expect(screen.getByText('Sofa')).toBeInTheDocument()
    expect(screen.getByText('×2')).toBeInTheDocument()
    // Line total and grand total both 10.000.000 ₫.
    expect(screen.getAllByText('10.000.000 ₫').length).toBeGreaterThanOrEqual(2)
  })

  it('shows a dash for an unpriced line and notes the total is incomplete', () => {
    render(<RoomSummary items={[item(1, 10, 'Sofa', 5000000), item(2, 30, 'Đèn', null)]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText(/tạm tính chưa gồm/i)).toBeInTheDocument()
  })

  it('renders nothing when the room is empty', () => {
    const { container } = render(<RoomSummary items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/RoomSummary.test.jsx`
Expected: FAIL — cannot resolve `./RoomSummary`.

- [ ] **Step 7: Implement `RoomSummary.jsx`**

Create `src/pages/roomPlanner/RoomSummary.jsx`:

```jsx
import { summarizeItems } from '../../features/roomPlanner/summary'
import { formatPrice } from '../../lib/format'

// Bill-of-materials for the planner: what's in the room and what it costs. Pure
// clarity — neutral styling, honest about unknown prices (never fabricates one).
export function RoomSummary({ items }) {
  const { lines, total, hasUnpriced } = summarizeItems(items)
  if (lines.length === 0) return null

  return (
    <div className="shrink-0 rounded-card border border-border bg-surface p-3">
      <p className="mb-2 text-sm font-medium text-foreground">Tổng quan phòng</p>
      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
        {lines.map((line) => (
          <li key={line.variantId} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {line.name} <span className="text-foreground">×{line.qty}</span>
            </span>
            <span className="shrink-0 tabular-nums text-foreground">
              {line.lineTotal === null ? '—' : formatPrice(line.lineTotal)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
        <span className="text-sm font-medium text-foreground">Tổng tạm tính</span>
        <span className="tabular-nums text-base font-medium text-foreground">{formatPrice(total)}</span>
      </div>
      {hasUnpriced && (
        <p className="mt-1.5 text-xs text-muted-foreground">Tạm tính chưa gồm các món chưa có giá.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/RoomSummary.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 9: Mount `RoomSummary` in the planner aside**

In `src/pages/roomPlanner/RoomPlannerPage.jsx`, import it and render it in the left `aside`
after `SelectedItemPanel`:

```jsx
import { RoomSummary } from './RoomSummary'
```

```jsx
            <CatalogTray onAdd={store.addVariant} />
            <SelectedItemPanel item={selectedItem} onDelete={store.deleteSelected} onResetTransform={store.resetSelectedTransform} />
            <RoomSummary items={store.items} />
```

- [ ] **Step 10: Verify**

Run: `npx vitest run src/pages/roomPlanner src/features/roomPlanner && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 11: Commit** (stage + hold)

```bash
git add src/features/roomPlanner/summary.js src/features/roomPlanner/summary.test.js src/pages/roomPlanner/RoomSummary.jsx src/pages/roomPlanner/RoomSummary.test.jsx src/pages/roomPlanner/RoomPlannerPage.jsx
git commit -m "feat(planner): add room bill-of-materials summary panel"
```

---

### Task 3: FE — "Đặt cả phòng" purchase CTA

**Files:**
- Modify: `src/pages/roomPlanner/PlannerToolbar.jsx`
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx`
- Test: `src/pages/roomPlanner/PlannerToolbar.test.jsx`

**Interfaces:**
- Consumes: existing `ensureSaved()`, `useAddSceneToCart` (already imported in RoomPlannerPage).
- Produces: `PlannerToolbar` gains `onOrder` + `ordering` props and an "Đặt cả phòng" button; `RoomPlannerPage.handleOrder` saves → adds the scene to the cart → navigates to `/checkout`.

- [ ] **Step 1: Write the failing toolbar test**

In `src/pages/roomPlanner/PlannerToolbar.test.jsx` add (mirror the file's existing render
helper and props; if the file doesn't exist, create it rendering `<PlannerToolbar>` with the
minimal props it already requires):

```jsx
it('calls onOrder when "Đặt cả phòng" is clicked', async () => {
  const onOrder = vi.fn()
  renderToolbar({ onOrder, itemCount: 2 }) // helper spreads props onto <PlannerToolbar>
  await userEvent.click(screen.getByRole('button', { name: /Đặt cả phòng/ }))
  expect(onOrder).toHaveBeenCalled()
})

it('disables "Đặt cả phòng" when the room is empty', () => {
  renderToolbar({ onOrder: vi.fn(), itemCount: 0 })
  expect(screen.getByRole('button', { name: /Đặt cả phòng/ })).toBeDisabled()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/PlannerToolbar.test.jsx`
Expected: FAIL — no "Đặt cả phòng" button.

- [ ] **Step 3: Add the button to `PlannerToolbar.jsx`**

Add `ShoppingBag` to the lucide import, add `onOrder` + `ordering` to the props list, and
render the button after "Thêm vào giỏ" (variant `primary`; disabled when empty or busy):

```jsx
        <Button type="button" variant="primary" onClick={onOrder} disabled={ordering || itemCount === 0}>
          {ordering ? <Spinner label="Đang chuẩn bị" /> : <><ShoppingBag size={16} /> Đặt cả phòng</>}
        </Button>
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/PlannerToolbar.test.jsx`
Expected: PASS.

- [ ] **Step 5: Wire `handleOrder` in `RoomPlannerPage.jsx`**

Add the handler (after `handleAddToCart`) — it reuses `ensureSaved` and `addSceneToCart`,
then routes into checkout:

```jsx
  const handleOrder = async () => {
    try {
      const sceneId = await ensureSaved()
      const response = await addSceneToCart.mutateAsync(sceneId)
      const skipped = response?.meta?.skipped ?? []
      if (skipped.length > 0) {
        addToast({
          title: 'Đã thêm phòng vào giỏ.',
          description: `Một số món hiện hết hàng, chưa thêm được: ${skipped.join(', ')}.`,
          variant: 'default',
        })
      }
      navigate('/checkout')
    } catch (error) {
      addToast({ title: 'Không thể đặt phòng.', description: error?.message, variant: 'error' })
    }
  }
```

Pass it to the toolbar:

```jsx
          onOrder={handleOrder}
          ordering={addSceneToCart.isPending || createScene.isPending || updateScene.isPending}
```

- [ ] **Step 6: Add the RoomPlannerPage order-flow test**

In `src/pages/roomPlanner/RoomPlannerPage.test.jsx`, mirroring its existing mock setup for a
loaded scene with items, add a test that clicking "Đặt cả phòng" persists (create/update),
adds the scene to the cart, and navigates to `/checkout`:

```jsx
it('orders the whole room: saves, adds to cart, and goes to checkout', async () => {
  // (Arrange a ready scene with ≥1 item per this file's existing helpers/mocks.)
  // addSceneToCart resolves { meta: { skipped: [] } }; createScene/updateScene resolve a scene id.
  await userEvent.click(screen.getByRole('button', { name: /Đặt cả phòng/ }))
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/checkout'))
})
```

Use the same `useNavigate`/hook mocking approach already present in the file; assert
`addSceneToCart` (or its api mock) was called before the navigate.

- [ ] **Step 7: Verify the planner suite + full FE suite**

Run: `npx vitest run src/pages/roomPlanner && npm run lint`
Expected: PASS, lint clean.
Run: `npx vitest run`
Expected: all green (≥ 425 + new tests).

- [ ] **Step 8: Commit** (stage + hold)

```bash
git add src/pages/roomPlanner/PlannerToolbar.jsx src/pages/roomPlanner/PlannerToolbar.test.jsx src/pages/roomPlanner/RoomPlannerPage.jsx src/pages/roomPlanner/RoomPlannerPage.test.jsx
git commit -m "feat(planner): add 'Đặt cả phòng' — order the room via checkout"
```

---

## Self-Review

**Spec coverage:**
- C1 BE enrichment (resource + eager-loads + tests) → Task 1. ✓
- C2 BoM (`summarizeItems` + `RoomSummary`, unpriced handling, neutral colour, mounted in aside) → Task 2. ✓
- C3 "Đặt cả phòng" (toolbar button `primary`, ensureSaved→addSceneToCart→/checkout, skipped-items toast) → Task 3. ✓
- Testing per layer (BE feature, FE unit + render + flow) → each task. ✓
- Non-goals (convert-to-order endpoint, shared-page product list, qty editing, tax/shipping) → untouched. ✓

**Placeholder scan:** No TBD/TODO. BE test commands reference `docs/07-testing.md` for the
exact Docker/sqlite invocation (real infra detail, not a placeholder). The RoomPlannerPage
order test (Task 3 Step 6) intentionally defers to the file's existing mock helpers rather
than duplicating them — the assertion (navigate to `/checkout` after add-to-cart) is explicit.

**Type/name consistency:** `summarizeItems(items) → { lines:[{variantId,name,price,qty,lineTotal}], total, hasUnpriced }` is produced in Task 2 and consumed by `RoomSummary` in the same task. `onOrder`/`ordering` props (Task 3) match between `PlannerToolbar` and `RoomPlannerPage`. `addSceneToCart`/`ensureSaved` reuse existing names verbatim.
