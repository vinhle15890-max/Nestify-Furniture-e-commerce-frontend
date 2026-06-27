# Breadcrumb chuẩn (đa cấp + SEO + rút gọn) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng breadcrumb đa cấp (Trang chủ > danh mục cha > danh mục con > sản phẩm) tái dùng được, có rút gọn khi quá dài và phát `BreadcrumbList` JSON-LD cho SEO, trên `ProductPage` và `CategoryPage`.

**Architecture:** FE-only. Một helper thuần dò chuỗi tổ tiên từ cây danh mục đã cache (`useCategories`, queryKey `['categories']`); một component `Breadcrumb` generic nhận `items` để render a11y + phát JSON-LD; hai trang compose `items` từ helper. Không đụng BE/migration/contract.

**Tech Stack:** React 18 + Vite (plain JSX), React Router v6 (`Link`), TanStack Query v5, lucide-react, Vitest + React Testing Library + jsdom, Tailwind v4 (CSS-first tokens).

## Global Constraints

- **KHÔNG commit cho tới khi user yêu cầu.** Mỗi task kết bằng bước **stage** (`git add`) — KHÔNG `git commit`.
- **Không TypeScript** — chỉ `.js`/`.jsx`. Path alias `@/` → `src/` (import dùng đường dẫn tương đối như file lân cận).
- **Giữ nguyên design token** — chỉ dùng class semantic sẵn có (`text-muted-foreground`, `text-foreground`, `text-border-strong`, `hover:text-accent`, `focus-visible:ring-ring`…). Không hardcode hex.
- **UI copy tiếng Việt.** Icon dùng lucide-react (không emoji).
- **Chạy test FE:** `cd Nestify-Furniture-e-commerce-frontend && npx vitest run <path>`. Trước khi kết: `npm run lint` sạch.
- **Đường dẫn gốc FE:** `Nestify-Furniture-e-commerce-frontend/`.
- **maxItems mặc định = 4.** Gập = mục đầu + nút `…` (mở rộng) + 2 mục cuối. JSON-LD luôn phát ĐẦY ĐỦ mọi item, chỉ khi `items.length >= 2`. Nhãn dài: `max-w-[16rem] truncate` + `title`.
- **Shape item:** `{ label: string, to?: string }`. Mục cuối (không `to`) = trang hiện tại (`aria-current="page"`).
- **Cây danh mục node shape:** `{ id, name, slug, children?: [] }` (chính là phần tử trong `useCategories().data.data`).

---

## File Structure

- `src/lib/categoryPath.js` (Create) — helper thuần `findCategoryPath(tree, slug)`.
- `src/lib/categoryPath.test.js` (Create) — unit test helper.
- `src/components/Breadcrumb.jsx` (Create) — component generic render + JSON-LD + rút gọn.
- `src/components/Breadcrumb.test.jsx` (Create) — test component.
- `src/pages/product/ProductPage.jsx` (Modify) — thay nav inline bằng `<Breadcrumb>`.
- `src/pages/catalog/CategoryPage.jsx` (Modify) — thêm `<Breadcrumb>` + `useCategories()`.
- `src/pages/catalog/CategoryPage.test.jsx` (Modify) — mock `getCategories`, assert breadcrumb.

---

## Task 1: Helper `findCategoryPath`

**Files:**
- Create: `src/lib/categoryPath.js`
- Test: `src/lib/categoryPath.test.js`

**Interfaces:**
- Produces: `findCategoryPath(tree: Array<{id,name,slug,children?}>, slug: string): Array<{id,name,slug}>` — chuỗi từ gốc đến node có `slug` (gồm cả node đó), theo thứ tự gốc→lá. Không thấy / tree rỗng → `[]`.

- [ ] **Step 1: Viết test fail** — `src/lib/categoryPath.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { findCategoryPath } from './categoryPath'

const tree = [
  {
    id: 1, name: 'Phòng khách', slug: 'phong-khach',
    children: [
      { id: 2, name: 'Sofa', slug: 'sofa', children: [{ id: 3, name: 'Sofa góc', slug: 'sofa-goc' }] },
      { id: 4, name: 'Bàn trà', slug: 'ban-tra' },
    ],
  },
  { id: 5, name: 'Phòng ngủ', slug: 'phong-ngu' },
]

describe('findCategoryPath', () => {
  it('trả chuỗi gốc → lá (gồm cả node đích)', () => {
    expect(findCategoryPath(tree, 'sofa-goc')).toEqual([
      { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
      { id: 2, name: 'Sofa', slug: 'sofa' },
      { id: 3, name: 'Sofa góc', slug: 'sofa-goc' },
    ])
  })

  it('node cấp 1 trả về chỉ chính nó', () => {
    expect(findCategoryPath(tree, 'phong-ngu')).toEqual([{ id: 5, name: 'Phòng ngủ', slug: 'phong-ngu' }])
  })

  it('slug không tồn tại → []', () => {
    expect(findCategoryPath(tree, 'khong-co')).toEqual([])
  })

  it('tree rỗng / không hợp lệ → []', () => {
    expect(findCategoryPath([], 'sofa')).toEqual([])
    expect(findCategoryPath(undefined, 'sofa')).toEqual([])
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/lib/categoryPath.test.js`
Expected: FAIL (module chưa tồn tại).

- [ ] **Step 3: Implement** — `src/lib/categoryPath.js`:

```js
// Dò chuỗi tổ tiên trong cây danh mục: trả [gốc, …, node có slug] (gồm cả node đó).
// Mỗi phần tử chỉ giữ { id, name, slug }. Không thấy / tree không hợp lệ → [].
export function findCategoryPath(tree, slug) {
  if (!Array.isArray(tree)) return []
  for (const node of tree) {
    if (node.slug === slug) {
      return [{ id: node.id, name: node.name, slug: node.slug }]
    }
    const childPath = findCategoryPath(node.children ?? [], slug)
    if (childPath.length > 0) {
      return [{ id: node.id, name: node.name, slug: node.slug }, ...childPath]
    }
  }
  return []
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/lib/categoryPath.test.js`
Expected: PASS (4 test).

- [ ] **Step 5: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/lib/categoryPath.js src/lib/categoryPath.test.js
# KHÔNG commit — chờ user cho phép
```

---

## Task 2: Component `Breadcrumb`

**Files:**
- Create: `src/components/Breadcrumb.jsx`
- Test: `src/components/Breadcrumb.test.jsx`

**Interfaces:**
- Consumes: `react-router-dom` `Link`; `lucide-react` `ChevronRight`, `MoreHorizontal`.
- Produces: `<Breadcrumb items={[{label, to?}]} maxItems={4} />`. Render `nav[aria-label="Breadcrumb"]` khi `items.length >= 2`; mục cuối `aria-current="page"`. Phát `<script type="application/ld+json">` `BreadcrumbList` đầy đủ.

- [ ] **Step 1: Viết test fail** — `src/components/Breadcrumb.test.jsx`:

```jsx
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Breadcrumb } from './Breadcrumb'

function renderCrumb(items, props) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={items} {...props} />
    </MemoryRouter>,
  )
}

const short = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Phòng khách', to: '/c/phong-khach' },
  { label: 'Ghế Sofa Da' },
]

afterEach(cleanup)

describe('Breadcrumb', () => {
  it('không render khi chỉ có 1 mục', () => {
    const { container } = renderCrumb([{ label: 'Trang chủ', to: '/' }])
    expect(container.querySelector('nav')).toBeNull()
  })

  it('mục giữa là link, mục cuối là trang hiện tại (aria-current)', () => {
    renderCrumb(short)
    expect(screen.getByRole('link', { name: 'Phòng khách' })).toHaveAttribute('href', '/c/phong-khach')
    const current = screen.getByText('Ghế Sofa Da')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.closest('a')).toBeNull()
  })

  it('gập mục giữa khi vượt maxItems và mở lại khi bấm …', async () => {
    const long = [
      { label: 'Trang chủ', to: '/' },
      { label: 'Phòng khách', to: '/c/phong-khach' },
      { label: 'Sofa', to: '/c/sofa' },
      { label: 'Sofa góc', to: '/c/sofa-goc' },
      { label: 'Ghế Sofa Da' },
    ]
    renderCrumb(long, { maxItems: 4 })
    // bị gập: 'Sofa' (mục giữa) chưa hiển thị
    expect(screen.queryByRole('link', { name: 'Sofa' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Hiện đầy đủ đường dẫn' }))
    expect(screen.getByRole('link', { name: 'Sofa' })).toBeInTheDocument()
  })

  it('phát JSON-LD BreadcrumbList đầy đủ các mục', () => {
    renderCrumb(short)
    const script = document.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script.textContent)
    expect(data['@type']).toBe('BreadcrumbList')
    expect(data.itemListElement).toHaveLength(3)
    expect(data.itemListElement[0]).toMatchObject({ position: 1, name: 'Trang chủ' })
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/components/Breadcrumb.test.jsx`
Expected: FAIL (component chưa tồn tại).

- [ ] **Step 3: Implement** — `src/components/Breadcrumb.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MoreHorizontal } from 'lucide-react'

// Breadcrumb generic: items = [{ label, to? }]; mục cuối (không `to`) = trang hiện tại.
// Gập mục giữa khi vượt maxItems; phát BreadcrumbList JSON-LD đầy đủ cho SEO.
export function Breadcrumb({ items = [], maxItems = 4 }) {
  const [expanded, setExpanded] = useState(false)

  // SEO: BreadcrumbList JSON-LD — luôn đầy đủ mọi item, không phụ thuộc việc gập hiển thị.
  useEffect(() => {
    if (items.length < 2 || typeof document === 'undefined') return undefined
    const origin = window.location?.origin ?? ''
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-nestify-breadcrumb', 'true')
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        ...(item.to ? { item: origin + item.to } : { item: window.location?.href ?? '' }),
      })),
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [items])

  if (items.length < 2) return null

  // Gập: giữ mục đầu + 2 mục cuối; phần giữa thay bằng nút "…".
  const collapsed = !expanded && items.length > maxItems
  const visible = collapsed ? [items[0], ...items.slice(-2)] : items
  const ellipsisAfterFirst = collapsed

  const renderItem = (item, isLast) => {
    const labelEl = (
      <span className="block max-w-[16rem] truncate" title={item.label}>
        {item.label}
      </span>
    )
    if (isLast || !item.to) {
      return (
        <span aria-current="page" className="text-foreground">
          {labelEl}
        </span>
      )
    }
    return (
      <Link to={item.to} className="text-muted-foreground transition-colors hover:text-accent">
        {labelEl}
      </Link>
    )
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight size={14} className="shrink-0 text-border-strong" aria-hidden="true" />}
              {renderItem(item, isLast)}
              {index === 0 && ellipsisAfterFirst && (
                <>
                  <ChevronRight size={14} className="shrink-0 text-border-strong" aria-hidden="true" />
                  <button
                    type="button"
                    aria-label="Hiện đầy đủ đường dẫn"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center text-muted-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <MoreHorizontal size={16} aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

> Ghi chú: khi `collapsed`, `visible = [đầu, kế-cuối, cuối]`. Nút `…` chèn **sau mục đầu** (index 0) kèm 1 separator. Các separator khác chèn trước mỗi mục `index > 0`. Khi bấm `…` → `expanded=true` → render đầy đủ.

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/components/Breadcrumb.test.jsx`
Expected: PASS (4 test).

- [ ] **Step 5: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/components/Breadcrumb.jsx src/components/Breadcrumb.test.jsx
```

---

## Task 3: Tích hợp `ProductPage`

**Files:**
- Modify: `src/pages/product/ProductPage.jsx`
- Test: `src/pages/product/ProductPage.test.jsx` (chạy lại; cập nhật nếu cần)

**Interfaces:**
- Consumes: `findCategoryPath` (Task 1), `Breadcrumb` (Task 2), `useCategories` (`src/features/catalog/hooks`).

- [ ] **Step 1: Thêm imports** — trong `src/pages/product/ProductPage.jsx`, sau dòng `import { resolveVariant } from '../../lib/variantOptions'` thêm:

```jsx
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'
import { useCategories } from '../../features/catalog/hooks'
```

> Đồng thời BỎ `ChevronRight` khỏi import `lucide-react` nếu sau khi xóa nav inline không còn chỗ nào dùng `ChevronRight` trong file (kiểm tra bằng search; breadcrumb cũ là nơi duy nhất dùng nó). Nếu còn dùng nơi khác thì giữ.

- [ ] **Step 2: Lấy cây danh mục + dựng crumbs** — ngay sau dòng `const product = data?.data` (khu vực khai báo hook/biến đầu component), thêm:

```jsx
  const { data: categoriesData } = useCategories()
```

Và ngay trước `return (` của nhánh render chính (sau `const averageRating = ...`), thêm:

```jsx
  const categoryPath = product?.category
    ? findCategoryPath(categoriesData?.data ?? [], product.category.slug)
    : []
  const breadcrumbItems = [
    { label: 'Trang chủ', to: '/' },
    ...(categoryPath.length > 0
      ? categoryPath.map((c) => ({ label: c.name, to: `/c/${c.slug}` }))
      : product?.category
        ? [{ label: product.category.name, to: `/c/${product.category.slug}` }]
        : []),
    { label: product.name },
  ]
```

- [ ] **Step 3: Thay nav inline bằng `<Breadcrumb>`** — xóa toàn bộ khối:

```jsx
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-accent">
          Trang chủ
        </Link>
        {product.category && (
          <>
            <ChevronRight size={14} className="text-border-strong" />
            <Link to={`/c/${product.category.slug}`} className="transition-colors hover:text-accent">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} className="text-border-strong" />
        <span className="text-foreground">{product.name}</span>
      </nav>
```

thay bằng:

```jsx
      <Breadcrumb items={breadcrumbItems} />
```

- [ ] **Step 4: Chạy test ProductPage, xác nhận PASS**

Run: `npx vitest run src/pages/product/ProductPage.test.jsx`
Expected: PASS. (Test mock `catalogApi` nên `getCategories` trả undefined → `categoryPath = []` → fallback hiện link danh mục trực tiếp `Phòng khách`; mục cuối là tên SP với `aria-current`. Nếu có assertion cũ dựa vào cấu trúc nav cũ bị vỡ, cập nhật để query `link`/`text` tương ứng — không nới lỏng ý nghĩa test.)

- [ ] **Step 5: Lint**

Run: `npx eslint src/pages/product/ProductPage.jsx`
Expected: sạch (không còn `ChevronRight`/`Link` thừa nếu đã bỏ — `Link` vẫn dùng nơi khác trong file nên giữ).

- [ ] **Step 6: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/pages/product/ProductPage.jsx src/pages/product/ProductPage.test.jsx
```

---

## Task 4: Tích hợp `CategoryPage`

**Files:**
- Modify: `src/pages/catalog/CategoryPage.jsx`
- Test: `src/pages/catalog/CategoryPage.test.jsx`

**Interfaces:**
- Consumes: `findCategoryPath` (Task 1), `Breadcrumb` (Task 2), `useCategories` (đã có trong `hooks.js`).

- [ ] **Step 1: Cập nhật test trước** — trong `src/pages/catalog/CategoryPage.test.jsx`, thêm mock `getCategories` vào `beforeEach` (sau `getCategory`):

```jsx
    catalogApi.getCategories.mockResolvedValue({
      data: [{ id: 1, name: 'Phòng khách', slug: 'phong-khach', children: [] }],
    })
```

Và thêm test mới (cuối `describe`):

```jsx
  it('hiển thị breadcrumb với danh mục hiện tại', async () => {
    renderPage()
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/')
    expect(within(nav).getByText('Phòng khách')).toHaveAttribute('aria-current', 'page')
  })
```

> Thêm `within` vào import dòng 2: `import { render, screen, waitFor, within } from '@testing-library/react'`.

- [ ] **Step 2: Chạy test, xác nhận test mới FAIL**

Run: `npx vitest run src/pages/catalog/CategoryPage.test.jsx`
Expected: test `hiển thị breadcrumb…` FAIL (chưa render breadcrumb); các test cũ vẫn PASS.

- [ ] **Step 3: Thêm imports + hook + crumbs** — trong `src/pages/catalog/CategoryPage.jsx`:

Sửa import hook (dòng 8) thêm `useCategories`:

```jsx
import { useCategory, useCategories, useInfiniteProducts } from '../../features/catalog/hooks'
```

Thêm imports component/helper (sau dòng 8):

```jsx
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'
```

Trong component, sau `const category = categoryQuery.data?.data` (≈ dòng 28) thêm:

```jsx
  const { data: categoriesData } = useCategories()
  const categoryPath = isAll ? [] : findCategoryPath(categoriesData?.data ?? [], categorySlug)
  const breadcrumbItems = [
    { label: 'Trang chủ', to: '/' },
    ...(isAll
      ? [{ label: 'Tất cả sản phẩm' }]
      : categoryPath.length > 0
        ? categoryPath.map((c, i) =>
            i === categoryPath.length - 1 ? { label: c.name } : { label: c.name, to: `/c/${c.slug}` },
          )
        : [{ label: category?.name ?? 'Danh mục' }]),
  ]
```

- [ ] **Step 4: Render `<Breadcrumb>`** — ngay sau `<div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">` (mở đầu return, ≈ dòng 51), TRƯỚC `<Reveal>`, thêm:

```jsx
      <Breadcrumb items={breadcrumbItems} />
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run src/pages/catalog/CategoryPage.test.jsx`
Expected: PASS (4 test: 3 cũ + 1 mới).

- [ ] **Step 6: Lint + full suite vùng liên quan**

Run: `npx eslint src/pages/catalog/CategoryPage.jsx src/components/Breadcrumb.jsx src/lib/categoryPath.js && npx vitest run src/components/Breadcrumb.test.jsx src/lib/categoryPath.test.js src/pages/catalog/ src/pages/product/`
Expected: lint sạch; tất cả test PASS.

- [ ] **Step 7: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/pages/catalog/CategoryPage.jsx src/pages/catalog/CategoryPage.test.jsx
```

---

## Self-Review (đã rà)

- **Spec coverage:** helper dò ancestry (T1), component generic + a11y + gập + JSON-LD (T2), ProductPage đầy đủ chuỗi + fallback (T3), CategoryPage + `/c/all` + fallback (T4). Edge `items<2` không render (T2). Rút gọn nhãn `truncate` + `title` (T2). ✓
- **Placeholder:** không có TODO trống — mọi step có code/lệnh thật.
- **Type consistency:** `findCategoryPath(tree, slug) -> [{id,name,slug}]` dùng nhất quán ở T3/T4; `Breadcrumb({items, maxItems})` với item `{label, to?}` khớp mọi nơi compose; JSON-LD đọc `item.label`/`item.to`. ✓
- **Tương thích test cũ:** ProductPage/CategoryPage mock `catalogApi` → `getCategories` undefined ở ProductPage (fallback link danh mục trực tiếp, không vỡ); CategoryPage được thêm mock `getCategories` rõ ràng. ✓
- **Docs:** thuần FE, không đổi contract → không sửa `FE_AI_CONTEXT.md`/ERD (đúng spec).
