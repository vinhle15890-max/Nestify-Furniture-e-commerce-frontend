# Room Planner — Shared-loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps dùng checkbox.

**Goal:** Trang chia sẻ liệt kê SP trong phòng (link tới từng SP) + nút "Thêm cả phòng vào giỏ" (best-effort, guest→login giữ đường về, thêm xong ở lại + link giỏ).

**Architecture:** Mapper mang thêm `product_slug`/`product_name`; `summarizeItems` thêm `slug`/`productName`; helper thuần `addRoomToCart(lines, addItemAsync)` (Promise.allSettled); component `SharedRoomItems` (list + CTA) nhúng vào `SharedRoomPage` responsive.

**Tech Stack:** React 18 JSX, react-router-dom (useNavigate/useLocation/Link), TanStack Query (useAddCartItem), zustand (authStore/toastStore), Vitest + RTL.

## Global Constraints

- Thuần FE, KHÔNG BE, KHÔNG thêm dependency, KHÔNG commit (guardrail — task đóng bằng `npm run lint` + `npm test -- --run` xanh).
- Semantic token; nút CTA `primary`, KHÔNG `imagined`/`confirmed`.
- Best-effort add: lỗi 1 món không chặn phần còn lại; không giả vờ thành công.

---

### Task 1: Mapper mang `product_slug` + `product_name`

**Files:** Modify `src/features/roomPlanner/mappers.js`; Test `src/features/roomPlanner/mappers.test.js`.

- [ ] **Step 1: Test đỏ** (thêm vào `mappers.test.js`)

```js
it('sceneToEditorState giữ product_slug/product_name của variant', () => {
  const state = sceneToEditorState({
    id: 1, name: 'P', width: 4, depth: 4, height: 3,
    items: [{ variant: { id: 9, sku: 'S', name: 'Đỏ', product_slug: 'ghe-sofa', product_name: 'Ghế Sofa' }, position: {}, rotation: {}, scale: {} }],
  })
  expect(state.items[0].variant.product_slug).toBe('ghe-sofa')
  expect(state.items[0].variant.product_name).toBe('Ghế Sofa')
})

it('sceneToEditorState fallback null khi thiếu slug/name', () => {
  const state = sceneToEditorState({ id: 1, width: 4, depth: 4, height: 3, items: [{ variant: { id: 9 }, position: {}, rotation: {}, scale: {} }] })
  expect(state.items[0].variant.product_slug).toBeNull()
  expect(state.items[0].variant.product_name).toBeNull()
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/features/roomPlanner/mappers.test.js`

- [ ] **Step 3: Sửa `mappers.js`** — trong object `variant` của `sceneToEditorState`, thêm 2 dòng (cạnh `thumbnail`):

```js
        model_3d_url: item.variant?.model_3d_url ?? null,
        price: item.variant?.price ?? null,
        thumbnail: item.variant?.thumbnail ?? null,
        product_slug: item.variant?.product_slug ?? null,
        product_name: item.variant?.product_name ?? null,
```

- [ ] **Step 4: Chạy → XANH.**
- [ ] **Step 5: Checkpoint** — lint xanh. KHÔNG commit.

---

### Task 2: `summarizeItems` thêm `slug` + `productName`

**Files:** Modify `src/features/roomPlanner/summary.js`; Test `src/features/roomPlanner/summary.test.js`.

**Interfaces:** Produces line `{ variantId, name, price, qty, lineTotal, slug, productName }`.

- [ ] **Step 1: Test đỏ** (thêm vào `summary.test.js`)

```js
it('line mang slug + productName của variant', () => {
  const { lines } = summarizeItems([{ variant: { id: 9, name: 'Đỏ', price: 100, product_slug: 'ghe', product_name: 'Ghế' } }])
  expect(lines[0].slug).toBe('ghe')
  expect(lines[0].productName).toBe('Ghế')
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/features/roomPlanner/summary.test.js`

- [ ] **Step 3: Sửa `summary.js`** — dòng `byVariant.set`:

```js
      byVariant.set(id, {
        variantId: id,
        name: variant.name ?? '',
        price,
        qty: 1,
        slug: variant.product_slug ?? null,
        productName: variant.product_name ?? null,
      })
```

- [ ] **Step 4: Chạy → XANH.**
- [ ] **Step 5: Checkpoint** — lint xanh. KHÔNG commit.

---

### Task 3: Helper `addRoomToCart`

**Files:** Create `src/features/roomPlanner/addRoomToCart.js`; Test `src/features/roomPlanner/addRoomToCart.test.js`.

**Interfaces:** `addRoomToCart(lines, addItemAsync) → Promise<{ added, skipped }>`.

- [ ] **Step 1: Test đỏ** — `addRoomToCart.test.js`

```js
import { describe, it, expect, vi } from 'vitest'
import { addRoomToCart } from './addRoomToCart'

describe('addRoomToCart', () => {
  it('best-effort: đếm added/skipped, không chặn khi 1 món lỗi', async () => {
    const addItemAsync = vi.fn(({ variant_id }) => (variant_id === 2 ? Promise.reject(new Error('hết hàng')) : Promise.resolve()))
    const lines = [{ variantId: 1, qty: 2 }, { variantId: 2, qty: 1 }, { variantId: 3, qty: 1 }]
    const res = await addRoomToCart(lines, addItemAsync)
    expect(res).toEqual({ added: 2, skipped: 1 })
    expect(addItemAsync).toHaveBeenCalledTimes(3)
    expect(addItemAsync).toHaveBeenCalledWith({ variant_id: 1, quantity: 2 })
  })

  it('bỏ line thiếu variantId', async () => {
    const addItemAsync = vi.fn(() => Promise.resolve())
    const res = await addRoomToCart([{ variantId: null, qty: 1 }, { variantId: 5, qty: 1 }], addItemAsync)
    expect(res).toEqual({ added: 1, skipped: 0 })
    expect(addItemAsync).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/features/roomPlanner/addRoomToCart.test.js`

- [ ] **Step 3: Tạo `addRoomToCart.js`**

```js
// Thêm mọi món trong phòng vào giỏ theo kiểu best-effort: một món lỗi (hết hàng,
// không bán, không phải customer) không được chặn phần còn lại. Trả số đã thêm /
// bỏ qua để lớp gọi báo lại trung thực.
export async function addRoomToCart(lines, addItemAsync) {
  const valid = (lines ?? []).filter((l) => l.variantId != null)
  const results = await Promise.allSettled(
    valid.map((l) => addItemAsync({ variant_id: l.variantId, quantity: l.qty })),
  )
  const added = results.filter((r) => r.status === 'fulfilled').length
  return { added, skipped: results.length - added }
}
```

- [ ] **Step 4: Chạy → XANH.**
- [ ] **Step 5: Checkpoint** — lint xanh. KHÔNG commit.

---

### Task 4: Component `SharedRoomItems`

**Files:** Create `src/pages/roomPlanner/SharedRoomItems.jsx`; Test `src/pages/roomPlanner/SharedRoomItems.test.jsx`.

**Interfaces:** Consumes `summarizeItems`, `addRoomToCart`, `useAddCartItem`, `useAuthStore`, `useToastStore`. Props `{ items }`.

- [ ] **Step 1: Test đỏ** — `SharedRoomItems.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SharedRoomItems } from './SharedRoomItems'

const navigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate, useLocation: () => ({ pathname: '/room-planner/shared/tok' }) }))

const mutateAsync = vi.fn(() => Promise.resolve())
vi.mock('../../features/cart/hooks', () => ({ useAddCartItem: () => ({ mutateAsync }) }))

let token = null
vi.mock('../../store/authStore', () => ({ useAuthStore: (sel) => sel({ token }) }))
const addToast = vi.fn()
vi.mock('../../store/toastStore', () => ({ useToastStore: (sel) => sel({ addToast }) }))

const items = [
  { variant: { id: 1, name: 'Đỏ', price: 100, product_slug: 'ghe', product_name: 'Ghế' } },
  { variant: { id: 2, name: 'Xanh', price: 200, product_slug: 'ban', product_name: 'Bàn' } },
]
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('SharedRoomItems', () => {
  beforeEach(() => { navigate.mockClear(); mutateAsync.mockClear(); addToast.mockClear(); token = null })

  it('liệt kê SP có link /p/{slug}', () => {
    wrap(<SharedRoomItems items={items} />)
    expect(screen.getByRole('link', { name: /Ghế/ })).toHaveAttribute('href', '/p/ghe')
  })

  it('guest bấm thêm → điều hướng /login giữ from', async () => {
    wrap(<SharedRoomItems items={items} />)
    await userEvent.click(screen.getByRole('button', { name: /thêm cả phòng/i }))
    expect(navigate).toHaveBeenCalledWith('/login', { state: { from: { pathname: '/room-planner/shared/tok' } } })
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('đã đăng nhập → thêm từng dòng rồi hiện link giỏ', async () => {
    token = 'abc'
    wrap(<SharedRoomItems items={items} />)
    await userEvent.click(screen.getByRole('button', { name: /thêm cả phòng/i }))
    expect(mutateAsync).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('link', { name: /xem giỏ/i })).toHaveAttribute('href', '/cart')
  })
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/pages/roomPlanner/SharedRoomItems.test.jsx`

- [ ] **Step 3: Tạo `SharedRoomItems.jsx`**

```jsx
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { Button } from '../../components/Button'
import { formatPrice } from '../../lib/format'
import { summarizeItems } from '../../features/roomPlanner/summary'
import { addRoomToCart } from '../../features/roomPlanner/addRoomToCart'
import { useAddCartItem } from '../../features/cart/hooks'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

// Danh sách SP trong phòng chia sẻ + "Thêm cả phòng vào giỏ". Người xem chưa đăng
// nhập → đưa sang login (giữ đường về đúng trang này). Thêm best-effort, ở lại +
// link giỏ. Không confirmed/imagined — mua thật vẫn chốt ở Checkout.
export function SharedRoomItems({ items }) {
  const { lines, total, hasUnpriced } = summarizeItems(items)
  const token = useAuthStore((s) => s.token)
  const addToast = useToastStore((s) => s.addToast)
  const addCart = useAddCartItem()
  const navigate = useNavigate()
  const location = useLocation()
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)

  const onAddRoom = async () => {
    if (!token) {
      navigate('/login', { state: { from: { pathname: location.pathname } } })
      return
    }
    setBusy(true)
    const res = await addRoomToCart(lines, addCart.mutateAsync)
    setBusy(false)
    if (res.added > 0) setAdded(true)
    addToast({
      title: res.skipped > 0
        ? `Đã thêm ${res.added} món (${res.skipped} món không khả dụng).`
        : `Đã thêm ${res.added} món vào giỏ.`,
      variant: res.added > 0 ? 'success' : 'error',
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">Trong phòng này</h2>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line.variantId} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-muted-foreground">
              {line.slug
                ? <Link to={`/p/${line.slug}`} className="text-foreground hover:underline">{line.productName ?? line.name}</Link>
                : <span className="text-foreground">{line.productName ?? line.name}</span>}
              {line.qty > 1 && <span className="text-muted-foreground"> ×{line.qty}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{line.price === null ? '—' : formatPrice(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">Tổng tạm tính</span>
        <span className="tabular-nums font-medium text-foreground">{formatPrice(total)}{hasUnpriced ? '+' : ''}</span>
      </div>
      <Button type="button" variant="primary" onClick={onAddRoom} disabled={busy || lines.length === 0}>
        <ShoppingCart size={16} /> Thêm cả phòng vào giỏ
      </Button>
      {added && (
        <Link to="/cart" className="text-center text-sm text-accent hover:underline">Xem giỏ hàng →</Link>
      )}
    </div>
  )
}
```

> Kiểm `formatPrice` tồn tại ở `src/lib/format.js` (đã dùng ở CatalogTray). Nếu tên khác, dùng đúng export hiện có.

- [ ] **Step 4: Chạy → XANH.**
- [ ] **Step 5: Checkpoint** — lint xanh. KHÔNG commit.

---

### Task 5: Nhúng vào `SharedRoomPage` (responsive)

**Files:** Modify `src/pages/roomPlanner/SharedRoomPage.jsx`; Test `src/pages/roomPlanner/SharedRoomPage.test.jsx` (bổ sung nếu có).

- [ ] **Step 1: Sửa `SharedRoomPage.jsx`** — import + đổi `main` thành flex canvas + aside:

```jsx
import { SharedRoomItems } from './SharedRoomItems'
// ...
      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 flex-1">
          <SharedSceneCanvas room={state.room} items={state.items} />
        </div>
        <aside className="max-h-[45%] shrink-0 overflow-y-auto border-t border-border bg-surface-alt/40 p-4 md:max-h-none md:w-80 md:border-l md:border-t-0">
          <SharedRoomItems items={state.items} />
        </aside>
      </main>
```

- [ ] **Step 2: Chạy test trang chia sẻ** (nếu có `SharedRoomPage.test.jsx`, cập nhật mock để không vỡ; thêm assert panel hiện tên SP). Run: `npm test -- --run src/pages/roomPlanner/SharedRoomPage.test.jsx`

- [ ] **Step 3: Full suite + lint.** `npm test -- --run` và `npm run lint` XANH.

- [ ] **Step 4: nestify-review** trên `SharedRoomItems.jsx` + `SharedRoomPage.jsx`: CTA `primary` (không imagined/confirmed), giọng warm-guide, màu hợp lệ, mobile-safe.

- [ ] **Step 5: Checkpoint cuối.** KHÔNG commit (chờ user).

---

## Self-Review

- **Spec coverage:** §4 mapper+summary = Task 1+2; §5 add helper = Task 3; §6 component = Task 4; §7 layout = Task 5; §8 test rải Task 1–5. Đủ.
- **Placeholder scan:** không TBD; code cụ thể từng step.
- **Type consistency:** line `{ variantId, name, price, qty, lineTotal, slug, productName }` khớp Task 2↔4; `addRoomToCart(lines, addItemAsync)→{added,skipped}` khớp Task 3↔4; `navigate('/login',{state:{from:{pathname}}})` khớp LoginPage.
- **Guardrail:** Checkpoint thay Commit.
