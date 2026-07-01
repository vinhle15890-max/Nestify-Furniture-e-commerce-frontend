# Admin Brand Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin/ERP back-office a recurring furniture brand motif (line-art illustrations) through reusable primitives, plus one signature moment on the Dashboard hero.

**Architecture:** A single `BrandIllustration` SVG component (5 furniture motifs, token-colored strokes) is threaded into the shared `EmptyState` primitive via a new optional `illustration` prop. Bare inline empty states across admin lists are converted to branded `EmptyState`s. The Dashboard revenue hero gains a low-opacity `lamp` watermark. A small entrance animation (reduced-motion-safe) is defined once in `globals.css`.

**Tech Stack:** React 18 (plain JSX), Tailwind v4 (CSS-first tokens), lucide-react, Vitest + React Testing Library.

## Global Constraints

- Plain JavaScript (`.jsx`) only — no TypeScript, no type annotations.
- Design **tokens only** — no raw hex, no new tokens. Brass = `text-accent`, ink = `text-foreground`, surfaces = `bg-surface`/`bg-surface-alt`, etc. (`src/styles/tokens.css`).
- Do **not** touch any storefront file or storefront token. Admin only.
- All UI copy in Vietnamese. No i18n infrastructure.
- TDD: failing test first, then implementation. `npm run lint` and `npm test -- --run` must be clean.
- Reuse existing primitives (`PageHeader`, `Panel`, `EmptyState`, `Card`); extend, don't fork.
- **STAGE-ONLY**: every task ends with `git add` of its files. **Do NOT `git commit`** (the user commits when they ask).
- Test command: `npm test -- --run <file>` for one file; `npm test -- --run` for the full suite.

---

### Task 1: `BrandIllustration` component

**Files:**
- Create: `src/components/admin/BrandIllustration.jsx`
- Test: `src/components/admin/BrandIllustration.test.jsx`

**Interfaces:**
- Produces: `BrandIllustration({ name, size = 56, decorative = false, className = '', ...rest })` — a React component rendering an inline `<svg viewBox="0 0 64 64">`. `name` ∈ `'sofa' | 'lamp' | 'chair' | 'package' | 'search'`. When `decorative` is true → `aria-hidden="true"` and no role; otherwise → `role="img"` + a Vietnamese `aria-label`. Unknown `name` falls back to the `package` motif and a generic label (never throws). Extra props (`...rest`, e.g. `data-*`) pass through to the `<svg>`.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/BrandIllustration.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrandIllustration } from './BrandIllustration'

describe('BrandIllustration', () => {
  it('renders each motif as an svg', () => {
    for (const name of ['sofa', 'lamp', 'chair', 'package', 'search']) {
      const { container } = render(<BrandIllustration name={name} />)
      expect(container.querySelector('svg')).toBeTruthy()
    }
  })

  it('exposes role="img" and a label when standalone', () => {
    const { container } = render(<BrandIllustration name="sofa" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg.getAttribute('aria-label')).toBeTruthy()
  })

  it('is aria-hidden with no role when decorative', () => {
    const { container } = render(<BrandIllustration name="lamp" decorative />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
  })

  it('falls back safely for an unknown motif name', () => {
    const { container } = render(<BrandIllustration name="nope" />)
    expect(container.querySelector('svg path, svg rect, svg circle, svg line')).toBeTruthy()
  })

  it('passes through extra props to the svg', () => {
    const { container } = render(<BrandIllustration name="lamp" decorative data-brand-watermark />)
    expect(container.querySelector('svg')).toHaveAttribute('data-brand-watermark')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/components/admin/BrandIllustration.test.jsx`
Expected: FAIL — module `./BrandIllustration` not found.

- [ ] **Step 3: Implement the component**

Create `src/components/admin/BrandIllustration.jsx`:

```jsx
// Line-art furniture motifs that carry the Nestify brand across admin empty states
// and the dashboard hero. Strokes use `currentColor`, so color comes from a token
// class on the consumer (e.g. `text-accent`). viewBox is a fixed 64×64 grid.

const MOTIFS = {
  sofa: (
    <>
      <path d="M14 32 V24 a4 4 0 0 1 4-4 h28 a4 4 0 0 1 4 4 v8" />
      <path d="M10 44 v-8 a4 4 0 0 1 4-4 h36 a4 4 0 0 1 4 4 v8" />
      <line x1="14" y1="38" x2="50" y2="38" />
      <line x1="16" y1="44" x2="16" y2="48" />
      <line x1="48" y1="44" x2="48" y2="48" />
    </>
  ),
  lamp: (
    <>
      <path d="M24 14 h16 l4 12 H20 z" />
      <line x1="32" y1="26" x2="32" y2="46" />
      <line x1="24" y1="48" x2="40" y2="48" />
      <path d="M29 46 l-5 2 M35 46 l5 2" />
    </>
  ),
  chair: (
    <>
      <path d="M22 10 V32 H44" />
      <line x1="22" y1="32" x2="22" y2="50" />
      <line x1="44" y1="32" x2="44" y2="50" />
    </>
  ),
  package: (
    <>
      <rect x="16" y="22" width="32" height="28" rx="2" />
      <line x1="16" y1="30" x2="48" y2="30" />
      <line x1="32" y1="22" x2="32" y2="30" />
    </>
  ),
  search: (
    <>
      <circle cx="28" cy="28" r="12" />
      <line x1="37" y1="37" x2="48" y2="48" />
    </>
  ),
}

const MOTIF_LABELS = {
  sofa: 'Ghế sofa',
  lamp: 'Đèn',
  chair: 'Ghế',
  package: 'Gói hàng',
  search: 'Tìm kiếm',
}

export function BrandIllustration({ name, size = 56, decorative = false, className = '', ...rest }) {
  const motif = MOTIFS[name] ?? MOTIFS.package
  const a11y = decorative
    ? { 'aria-hidden': 'true' }
    : { role: 'img', 'aria-label': MOTIF_LABELS[name] ?? 'Hình minh hoạ' }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
      {...a11y}
    >
      {motif}
    </svg>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/components/admin/BrandIllustration.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Stage**

```bash
git add src/components/admin/BrandIllustration.jsx src/components/admin/BrandIllustration.test.jsx
```

---

### Task 2: Extend `EmptyState` with `illustration` + entrance animation

**Files:**
- Modify: `src/components/admin/EmptyState.jsx`
- Test: `src/components/admin/EmptyState.test.jsx` (create if absent)
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `BrandIllustration` from Task 1.
- Produces: `EmptyState({ icon, illustration, title, description, action })`. When `illustration` (a motif name string) is passed → renders `<BrandIllustration name={illustration} decorative size={72} className="animate-rise text-accent" />` instead of the icon circle. When `illustration` is absent → existing `icon` rendering is unchanged. New CSS class `animate-rise` (fade + 4px rise, disabled under reduced motion).

- [ ] **Step 1: Write the failing test**

Create/replace `src/components/admin/EmptyState.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Package } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders a brand illustration when `illustration` is given', () => {
    const { container } = render(
      <EmptyState illustration="sofa" title="Chưa có sản phẩm nào" description="Thêm sản phẩm đầu tiên." />,
    )
    const svg = container.querySelector('svg.animate-rise')
    expect(svg).toBeTruthy()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Chưa có sản phẩm nào')).toBeInTheDocument()
  })

  it('falls back to the lucide icon circle when no illustration is given', () => {
    const { container } = render(<EmptyState icon={Package} title="Trống" />)
    // lucide icons render an svg, but without the brand animation class
    expect(container.querySelector('svg.animate-rise')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('Trống')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/components/admin/EmptyState.test.jsx`
Expected: FAIL — no `svg.animate-rise` (illustration branch not implemented).

- [ ] **Step 3: Implement the EmptyState change**

Replace the whole body of `src/components/admin/EmptyState.jsx`:

```jsx
import { BrandIllustration } from './BrandIllustration'

// Centered empty/zero-data state for admin tables and panels. Pass `illustration`
// (a BrandIllustration motif name) for a branded line-art state, or `icon` for the
// neutral lucide circle. `illustration` wins when both are passed.
export function EmptyState({ icon: Icon, illustration, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {illustration ? (
        <BrandIllustration name={illustration} decorative size={72} className="animate-rise text-accent" />
      ) : (
        Icon && (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-border-strong">
            <Icon size={24} aria-hidden="true" />
          </span>
        )
      )}
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Add the entrance animation to `globals.css`**

In `src/styles/globals.css`, add this block immediately AFTER the `.animate-slow-zoom` rule (the block ending at the line `}` after `animation: slow-zoom 22s ease-out forwards;`) and BEFORE the `@media (prefers-reduced-motion: reduce)` block:

```css
/* ── Admin brand illustration entrance ── */
@keyframes brand-rise {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
.animate-rise {
  animation: brand-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
```

Then, inside the existing `@media (prefers-reduced-motion: reduce)` block, add a line next to `.animate-slow-zoom { animation: none; }`:

```css
  .animate-rise { animation: none; }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- --run src/components/admin/EmptyState.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Stage**

```bash
git add src/components/admin/EmptyState.jsx src/components/admin/EmptyState.test.jsx src/styles/globals.css
```

---

### Task 3: Wire branded empty states across admin lists

**Files:**
- Modify: `src/pages/admin/products/AdminProductsPage.jsx`
- Modify: `src/pages/admin/categories/AdminCategoriesPage.jsx`
- Modify: `src/pages/admin/orders/AdminOrdersPage.jsx`
- Modify: `src/pages/admin/vouchers/AdminVouchersPage.jsx`
- Modify: `src/pages/admin/reviews/AdminReviewsPage.jsx`
- Modify: `src/pages/admin/auditLogs/AdminAuditLogsPage.jsx`
- Modify: `src/pages/admin/users/AdminEmployeesPage.jsx`
- Modify: `src/pages/admin/users/AdminCustomersPage.jsx`
- Modify: `src/pages/admin/products/AdminProductEditPage.jsx`
- Test: `src/pages/admin/products/AdminProductsPage.test.jsx` (create if absent)

**Interfaces:**
- Consumes: `EmptyState` (now with `illustration`) from Task 2.

Each change replaces a bare `<Card><p>…</p></Card>` empty block with an `EmptyState` (kept inside the existing `Card` for the surface), OR adds an `illustration` prop to an existing `EmptyState`. The motif mapping is fixed: products/categories → `sofa`; orders/variants → `package`; vouchers → `lamp`; reviews/employees/customers → `chair`; audit logs → `search`.

- [ ] **Step 1: Write the failing representative page test**

Create `src/pages/admin/products/AdminProductsPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminProductsPage } from './AdminProductsPage'
import * as hooks from '../../../features/admin/products/hooks'

vi.mock('../../../features/admin/products/hooks')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a branded empty state with an action-oriented message when there are no products', () => {
    hooks.useAdminProducts.mockReturnValue({ data: { data: [], meta: { last_page: 1 } }, isLoading: false })
    const { container } = renderPage()
    expect(screen.getByText('Chưa có sản phẩm nào')).toBeInTheDocument()
    expect(screen.getByText('Thêm sản phẩm đầu tiên để bắt đầu bán.')).toBeInTheDocument()
    expect(container.querySelector('svg.animate-rise')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/pages/admin/products/AdminProductsPage.test.jsx`
Expected: FAIL — text "Chưa có sản phẩm nào" (without the period) / `svg.animate-rise` not found.

- [ ] **Step 3: Convert `AdminProductsPage.jsx`**

Add the import (alongside the existing `PageHeader` import):

```jsx
import { EmptyState } from '../../../components/admin/EmptyState'
```

Replace the empty block:

```jsx
        ) : products.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào.</p>
          </Card>
        ) : (
```

with:

```jsx
        ) : products.length === 0 ? (
          <Card>
            <EmptyState
              illustration="sofa"
              title="Chưa có sản phẩm nào"
              description="Thêm sản phẩm đầu tiên để bắt đầu bán."
            />
          </Card>
        ) : (
```

- [ ] **Step 4: Convert `AdminCategoriesPage.jsx`**

Add `import { EmptyState } from '../../../components/admin/EmptyState'`. Replace:

```jsx
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có danh mục nào.</p>
          </Card>
```

with:

```jsx
          <Card>
            <EmptyState
              illustration="sofa"
              title="Chưa có danh mục nào"
              description="Tạo danh mục để sắp xếp sản phẩm."
            />
          </Card>
```

- [ ] **Step 5: Convert `AdminOrdersPage.jsx`**

Add `import { EmptyState } from '../../../components/admin/EmptyState'`. Replace:

```jsx
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có đơn hàng nào.</p>
          </Card>
```

with:

```jsx
          <Card>
            <EmptyState
              illustration="package"
              title="Chưa có đơn hàng nào"
              description="Đơn hàng của khách sẽ xuất hiện ở đây."
            />
          </Card>
```

- [ ] **Step 6: Convert `AdminVouchersPage.jsx`**

Add `import { EmptyState } from '../../../components/admin/EmptyState'`. Replace:

```jsx
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có voucher nào.</p>
          </Card>
```

with:

```jsx
          <Card>
            <EmptyState
              illustration="lamp"
              title="Chưa có voucher nào"
              description="Tạo voucher để chạy khuyến mãi."
            />
          </Card>
```

- [ ] **Step 7: Convert `AdminReviewsPage.jsx`**

Add `import { EmptyState } from '../../../components/admin/EmptyState'`. Replace:

```jsx
          <Card>
            <p className="text-sm text-muted-foreground">Không có đánh giá chờ duyệt.</p>
          </Card>
```

with:

```jsx
          <Card>
            <EmptyState
              illustration="chair"
              title="Không có đánh giá chờ duyệt"
              description="Mọi đánh giá đã được xử lý."
            />
          </Card>
```

- [ ] **Step 8: Convert `AdminAuditLogsPage.jsx`**

Add `import { EmptyState } from '../../../components/admin/EmptyState'`. Replace:

```jsx
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có nhật ký nào.</p>
          </Card>
```

with:

```jsx
          <Card>
            <EmptyState
              illustration="search"
              title="Chưa có nhật ký nào"
              description="Hoạt động quản trị sẽ được ghi lại ở đây."
            />
          </Card>
```

- [ ] **Step 9: Add `illustration` to the three existing `EmptyState` callers**

In `src/pages/admin/users/AdminEmployeesPage.jsx`, add `illustration="chair"` to the `EmptyState` (keep the existing `icon`, `title`, `description`):

```jsx
          <EmptyState
            illustration="chair"
            icon={Users}
            title="Chưa có nhân viên"
            description="Không có nhân viên nào khớp bộ lọc. Dùng “Thêm nhân viên” để cấp vai trò cho một người dùng."
          />
```

In `src/pages/admin/users/AdminCustomersPage.jsx`:

```jsx
          <EmptyState
            illustration="chair"
            icon={UserRound}
            title="Không có khách hàng"
            description="Không có khách hàng nào khớp tìm kiếm."
          />
```

In `src/pages/admin/products/AdminProductEditPage.jsx` (variants empty state), add `illustration="package"`:

```jsx
                <EmptyState
                  illustration="package"
                  icon={Layers}
                  title="Chưa có biến thể nào"
                  description="Thêm biến thể đầu tiên để thiết lập SKU, giá bán và tồn kho cho sản phẩm này."
                  action={
                    <Button onClick={openCreateVariantModal}>
                      <Plus size={16} aria-hidden="true" />
                      Thêm biến thể
                    </Button>
                  }
                />
```

(`illustration` wins over `icon` in the component, so the lucide `icon` prop is now inert but harmless — leaving it avoids touching unrelated imports.)

- [ ] **Step 10: Run the representative test to verify it passes**

Run: `npm test -- --run src/pages/admin/products/AdminProductsPage.test.jsx`
Expected: PASS.

- [ ] **Step 11: Full suite + lint**

Run: `npm test -- --run` (expect green) and `npm run lint` (expect clean).

- [ ] **Step 12: Stage**

```bash
git add src/pages/admin/products/AdminProductsPage.jsx \
        src/pages/admin/products/AdminProductsPage.test.jsx \
        src/pages/admin/categories/AdminCategoriesPage.jsx \
        src/pages/admin/orders/AdminOrdersPage.jsx \
        src/pages/admin/vouchers/AdminVouchersPage.jsx \
        src/pages/admin/reviews/AdminReviewsPage.jsx \
        src/pages/admin/auditLogs/AdminAuditLogsPage.jsx \
        src/pages/admin/users/AdminEmployeesPage.jsx \
        src/pages/admin/users/AdminCustomersPage.jsx \
        src/pages/admin/products/AdminProductEditPage.jsx
```

---

### Task 4: Dashboard hero watermark + doc sync

**Files:**
- Modify: `src/pages/admin/AdminDashboardPage.jsx`
- Test: `src/pages/admin/AdminDashboardPage.test.jsx`
- Modify: `docs/FE-TEAM-WORKFLOW.md`

**Interfaces:**
- Consumes: `BrandIllustration` from Task 1.

- [ ] **Step 1: Add the failing hero-watermark test**

In `src/pages/admin/AdminDashboardPage.test.jsx`, add this test inside the existing `describe('AdminDashboardPage', …)` block (the file already has `renderPage()` and mocks `dashboardApi.getDashboard`):

```jsx
  it('renders a decorative brand watermark in the revenue hero', async () => {
    const { container } = renderPage()
    expect(await screen.findByText('Doanh thu')).toBeInTheDocument()
    expect(container.querySelector('[data-brand-watermark]')).toBeTruthy()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/pages/admin/AdminDashboardPage.test.jsx`
Expected: FAIL — no `[data-brand-watermark]` element.

- [ ] **Step 3: Implement the hero watermark**

In `src/pages/admin/AdminDashboardPage.jsx`, add the import at the top (next to the `PageHeader` import):

```jsx
import { BrandIllustration } from '../../components/admin/BrandIllustration'
```

Replace the revenue hero block:

```jsx
        <div className="rounded-card border border-border bg-foreground p-7 text-surface lg:row-span-1">
          <div className="flex items-center gap-2 text-sm text-surface/70">
            <TrendingUp size={18} className="text-accent" />
            Doanh thu
          </div>
          <p className="mt-4 font-display text-[clamp(2rem,3.5vw,3rem)] leading-none">{formatPrice(stats.revenue)}</p>
          <p className="mt-3 text-sm text-surface/60">Tổng doanh thu đã ghi nhận</p>
        </div>
```

with (adds `relative overflow-hidden` + the absolutely-positioned watermark; text content is unchanged and stays above the watermark via `relative`):

```jsx
        <div className="relative overflow-hidden rounded-card border border-border bg-foreground p-7 text-surface lg:row-span-1">
          <BrandIllustration
            name="lamp"
            decorative
            data-brand-watermark
            size={150}
            className="animate-rise pointer-events-none absolute -bottom-6 -right-4 text-accent/20"
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-surface/70">
              <TrendingUp size={18} className="text-accent" />
              Doanh thu
            </div>
            <p className="mt-4 font-display text-[clamp(2rem,3.5vw,3rem)] leading-none">{formatPrice(stats.revenue)}</p>
            <p className="mt-3 text-sm text-surface/60">Tổng doanh thu đã ghi nhận</p>
          </div>
        </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/pages/admin/AdminDashboardPage.test.jsx`
Expected: PASS (existing tests + the new watermark test).

- [ ] **Step 5: Update the workflow doc**

In `docs/FE-TEAM-WORKFLOW.md`, append a new subsection (match the surrounding heading style and brevity — find the last numbered section and add the next one, e.g. `### 10e. Admin brand layer`):

```markdown
### Admin brand layer (line-art illustrations)

The admin/ERP carries a furniture brand motif through one shared component,
`components/admin/BrandIllustration.jsx` — inline SVG line-art with 5 motifs
(`sofa`, `lamp`, `chair`, `package`, `search`), stroked with `currentColor` so the
color comes from a token class (e.g. `text-accent`). It is wired into the shared
`EmptyState` via an optional `illustration` prop (a motif name); when present it
renders the branded illustration, otherwise `EmptyState` keeps its neutral lucide
`icon`. Admin list empty states use it with action-oriented Vietnamese copy. The
Dashboard revenue hero carries a low-opacity `lamp` watermark as the signature
moment. Entrance is the `animate-rise` utility (`globals.css`), disabled under
`prefers-reduced-motion`. No new tokens; admin only (storefront untouched).
```

- [ ] **Step 6: Full suite + lint**

Run: `npm test -- --run` (expect green) and `npm run lint` (expect clean).

- [ ] **Step 7: Stage**

```bash
git add src/pages/admin/AdminDashboardPage.jsx \
        src/pages/admin/AdminDashboardPage.test.jsx \
        docs/FE-TEAM-WORKFLOW.md
```

---

## Self-review notes

- **Spec coverage:** BrandIllustration (Task 1) ✓; EmptyState `illustration` + animation + reduced-motion (Task 2) ✓; motif→context mapping + 6 conversions + 3 prop additions (Task 3) ✓; Dashboard hero watermark (Task 4) ✓; doc sync (Task 4) ✓; tests for BrandIllustration / EmptyState / representative page / hero ✓.
- **Out of scope preserved:** modals/dialogs, `<option>` "Không có", not-found redirects, login — untouched.
- **Type/name consistency:** `BrandIllustration` props (`name`, `size`, `decorative`, `className`, `...rest`), `EmptyState` `illustration` prop, and the `animate-rise` class name are used identically across all four tasks.
- **Stage-only:** every task ends in `git add`, never `git commit`.
