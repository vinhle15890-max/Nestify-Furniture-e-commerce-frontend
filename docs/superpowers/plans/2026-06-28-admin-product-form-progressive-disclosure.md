# Admin Product Form — Progressive Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganise the admin product create/edit form into tabs (progressive disclosure), unify variant terminology on "Biến thể", and auto-generate the slug from the product name on create.

**Architecture:** A new reusable Radix-based `Tabs` primitive groups the product editor into four force-mounted tab panels driven by a single React Hook Form. A Vietnamese-aware `slugify` util powers live slug generation on the create page. No backend, payload, route, or design-token changes.

**Tech Stack:** React 18, React Router v6, React Hook Form + Yup, TanStack Query, Tailwind v4 (token classes), Radix UI, Vitest + React Testing Library.

## Global Constraints

- Plain JavaScript only (`.jsx`/`.js`) — no TypeScript, no type annotations.
- Design tokens only — semantic Tailwind classes (`text-foreground`, `bg-surface`, `border-border`, `text-accent`, `text-destructive`, …). No raw hex. No new tokens. No edits to `src/styles/tokens.css`.
- All UI copy in Vietnamese. The only intentional copy change is "phiên bản" → "biến thể" on **admin** product surfaces. Do NOT change `src/pages/product/ProductPage.jsx` (storefront).
- No backend / payload / route changes. `toProductPayload` output is unchanged. Media and variant endpoints stay nested under a product id (the create page keeps "save before adding variants/media").
- Preserve every accessible name that is NOT part of the deliberate "phiên bản"→"biến thể" rename.
- **Stage-only:** per the standing project rule, each task ends by **staging** (`git add`) the files — do NOT run `git commit`. The user commits later.
- Before a task is "done": `npm run lint` clean and `npm test -- --run` (the touched files) green.

---

### Task 1: `slugify` utility

**Files:**
- Create: `src/lib/slugify.js`
- Test: `src/lib/slugify.test.js`

**Interfaces:**
- Produces: `slugify(input: string | null | undefined): string` — returns a lowercase `[a-z0-9-]` slug (BE `alpha_dash`-valid), Vietnamese diacritics stripped, `đ`→`d`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/slugify.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('strips Vietnamese diacritics', () => {
    expect(slugify('Ghế Sofa Da Bò')).toBe('ghe-sofa-da-bo')
  })

  it('maps đ/Đ to d', () => {
    expect(slugify('Đèn bàn gỗ')).toBe('den-ban-go')
  })

  it('collapses spaces and punctuation into single hyphens', () => {
    expect(slugify('Bàn   trà!@#  mới')).toBe('ban-tra-moi')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  -Sofa góc-  ')).toBe('sofa-goc')
  })

  it('returns empty string for empty/nullish input', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/lib/slugify.test.js`
Expected: FAIL — cannot resolve `./slugify`.

- [ ] **Step 3: Implement the utility**

Create `src/lib/slugify.js`:

```js
// Turns a product name into a URL slug that satisfies the backend `alpha_dash`
// rule and the form regex /^[a-z0-9_-]+$/: strip Vietnamese diacritics, map đ→d,
// lowercase, and reduce every run of non-alphanumerics to a single hyphen.
export function slugify(input) {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove combining diacritical marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/lib/slugify.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Stage**

```bash
git add src/lib/slugify.js src/lib/slugify.test.js
```

---

### Task 2: `Tabs` primitive

**Files:**
- Modify: `package.json` (+ `package-lock.json`) — add `@radix-ui/react-tabs`
- Create: `src/components/admin/Tabs.jsx`
- Test: `src/components/admin/Tabs.test.jsx`

**Interfaces:**
- Produces:
  - `<Tabs value? onValueChange? defaultValue? className?>` — controlled or uncontrolled root.
  - `<TabList ariaLabel? className?>` — the `role=tablist` row.
  - `<Tab value disabled?=false hasError?=false>` — a `role=tab` trigger; `hasError` renders a decorative dot (`[data-error-dot]`).
  - `<TabPanel value className?>` — a force-mounted `role=tabpanel`; hidden when inactive.

- [ ] **Step 1: Install the dependency**

Run: `npm install @radix-ui/react-tabs`
Expected: `package.json` gains `"@radix-ui/react-tabs": "^1.x.x"` under dependencies; `package-lock.json` updated.

- [ ] **Step 2: Write the failing test**

Create `src/components/admin/Tabs.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabList, Tab, TabPanel } from './Tabs'

function Sample({ disabledThird = false, errorOnA = false } = {}) {
  return (
    <Tabs defaultValue="a">
      <TabList ariaLabel="Demo">
        <Tab value="a" hasError={errorOnA}>Tab A</Tab>
        <Tab value="b">Tab B</Tab>
        <Tab value="c" disabled={disabledThird}>Tab C</Tab>
      </TabList>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
      <TabPanel value="c">Panel C</TabPanel>
    </Tabs>
  )
}

describe('admin Tabs', () => {
  it('shows the tablist and only the active panel', () => {
    render(<Sample />)
    expect(screen.getByRole('tablist', { name: 'Demo' })).toBeInTheDocument()
    expect(screen.getByText('Panel A')).toBeVisible()
    expect(screen.getByText('Panel B')).not.toBeVisible()
  })

  it('switches the visible panel when a tab is clicked', async () => {
    render(<Sample />)
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }))
    expect(screen.getByText('Panel B')).toBeVisible()
    expect(screen.getByText('Panel A')).not.toBeVisible()
  })

  it('moves selection with the arrow keys', async () => {
    render(<Sample />)
    screen.getByRole('tab', { name: 'Tab A' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByText('Panel B')).toBeVisible()
  })

  it('does not activate a disabled tab', async () => {
    render(<Sample disabledThird />)
    const tabC = screen.getByRole('tab', { name: 'Tab C' })
    expect(tabC).toBeDisabled()
    await userEvent.click(tabC)
    expect(screen.getByText('Panel C')).not.toBeVisible()
  })

  it('renders an error dot when hasError', () => {
    render(<Sample errorOnA />)
    expect(screen.getByRole('tab', { name: 'Tab A' }).querySelector('[data-error-dot]')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- --run src/components/admin/Tabs.test.jsx`
Expected: FAIL — cannot resolve `./Tabs`.

- [ ] **Step 4: Implement the primitive**

Create `src/components/admin/Tabs.jsx`:

```jsx
import * as RadixTabs from '@radix-ui/react-tabs'

// Reusable admin tab set built on Radix Tabs (roving-tabindex keyboard nav,
// aria wiring for free). Panels are force-mounted and merely hidden when
// inactive so a single form spanning multiple tabs keeps its state and
// validation across tab switches.
export function Tabs({ value, onValueChange, defaultValue, className, children }) {
  return (
    <RadixTabs.Root
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      className={className}
    >
      {children}
    </RadixTabs.Root>
  )
}

export function TabList({ ariaLabel, className, children }) {
  return (
    <RadixTabs.List
      aria-label={ariaLabel}
      className={`flex flex-wrap gap-1 border-b border-border ${className ?? ''}`}
    >
      {children}
    </RadixTabs.List>
  )
}

export function Tab({ value, disabled = false, hasError = false, children }) {
  return (
    <RadixTabs.Trigger
      value={value}
      disabled={disabled}
      className="group relative -mb-px flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:text-foreground"
    >
      {children}
      {hasError && (
        <span data-error-dot aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-destructive" />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform group-data-[state=active]:scale-x-100"
      />
    </RadixTabs.Trigger>
  )
}

export function TabPanel({ value, className, children }) {
  return (
    <RadixTabs.Content
      value={value}
      forceMount
      className={`pt-6 focus:outline-none data-[state=inactive]:hidden ${className ?? ''}`}
    >
      {children}
    </RadixTabs.Content>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- --run src/components/admin/Tabs.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Lint and stage**

```bash
npm run lint
git add package.json package-lock.json src/components/admin/Tabs.jsx src/components/admin/Tabs.test.jsx
```

---

### Task 3: Edit page — tabs, global Save, validation surfacing, "Biến thể" rename

**Files:**
- Modify: `src/pages/admin/products/AdminProductEditPage.jsx`
- Modify: `src/pages/admin/products/VariantFormModal.jsx`
- Modify: `src/pages/admin/products/AdminProductsPage.jsx`
- Test: `src/pages/admin/products/AdminProductEditPage.test.jsx`

**Interfaces:**
- Consumes: `Tabs, TabList, Tab, TabPanel` from `src/components/admin/Tabs.jsx` (Task 2).
- Produces: tab values used by the test — `"thong-tin"`, `"bien-the"`, `"mo-ta-seo"`, `"hinh-anh"`; tab labels `Thông tin`, `Biến thể`, `Mô tả & SEO`, `Hình ảnh`.

This task keeps every existing handler (`onSubmit`, `handleGenerateDescription`, `openCreateVariantModal`, `openEditVariantModal`, `handleVariantSaved`, `handleUploadMedia`, `handleDeleteMedia`, `handleMoveMedia`), all hooks, and all derived values **verbatim**. It only (a) renames "phiên bản"→"biến thể", (b) moves the existing JSX blocks into tab panels, (c) lifts Save into the title bar, (d) adds validation surfacing.

- [ ] **Step 1: Update the test for the renamed copy and tab navigation**

Edit `src/pages/admin/products/AdminProductEditPage.test.jsx`. Apply these changes (every other test stays as-is):

In the `hydrates product fields from location.state` test, replace its body assertions so panels behind tabs are revealed first:

```jsx
  it('hydrates product fields from location.state', async () => {
    renderPage()

    expect(await screen.findByLabelText('Tên sản phẩm')).toHaveValue('Ghế Sofa')
    expect(screen.getByLabelText('Slug')).toHaveValue('ghe-sofa')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    expect(screen.getByLabelText('Mô tả')).toHaveValue('Mô tả sofa')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    expect(screen.getByText('SOFA-NAU')).toBeInTheDocument()
  })
```

In `fills description and SEO fields from the AI draft`, switch to the SEO tab before clicking the AI button:

```jsx
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    await userEvent.click(screen.getByRole('button', { name: /Gợi ý bằng AI/ }))
```

In `adds a new variant`, switch to the variants tab first and rename the buttons/label:

```jsx
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
    await userEvent.type(screen.getByLabelText('SKU'), 'SOFA-XAM')
    await userEvent.type(screen.getByLabelText('Tên biến thể'), 'Xám')
    await userEvent.type(screen.getByLabelText('Giá'), '5500000')
    await userEvent.type(screen.getByLabelText('Số lượng kho'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
```

In `omits SKU so the server auto-generates it when left blank`, do the same:

```jsx
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
    // SKU left blank on purpose
    await userEvent.type(screen.getByLabelText('Tên biến thể'), 'Be')
    await userEvent.type(screen.getByLabelText('Giá'), '5000000')
    await userEvent.type(screen.getByLabelText('Số lượng kho'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
```

In `edits an existing variant`, switch tab and rename:

```jsx
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    await userEvent.click(screen.getByRole('tab', { name: 'Biến thể' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sửa biến thể' }))

    const nameInput = await screen.findByLabelText('Tên biến thể')
```

In the three media tests (`uploads a new media file`, `deletes a media item`, `reorders media when moving an item down`), add a switch to the images tab right after `await screen.findByLabelText('Tên sản phẩm')`:

```jsx
    await userEvent.click(screen.getByRole('tab', { name: 'Hình ảnh' }))
```

Add one new test for validation surfacing (append inside the `describe`):

```jsx
  it('switches to the info tab and flags it when a required field is missing on submit', async () => {
    renderPage()
    await screen.findByLabelText('Tên sản phẩm')

    // Move away from the info tab, then clear a required field and submit.
    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    await userEvent.clear(screen.getByLabelText('Tên sản phẩm'))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))

    expect(await screen.findByText('Vui lòng nhập tên sản phẩm.')).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Thông tin' }).querySelector('[data-error-dot]')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the edit test to verify it fails**

Run: `npm test -- --run src/pages/admin/products/AdminProductEditPage.test.jsx`
Expected: FAIL — no `tab` roles / "Thêm biến thể" not found yet.

- [ ] **Step 3: Rename "phiên bản" → "biến thể" in `VariantFormModal.jsx`**

Edit `src/pages/admin/products/VariantFormModal.jsx` — replace these exact strings:

- `'Vui lòng nhập tên phiên bản.'` → `'Vui lòng nhập tên biến thể.'`
- `'Đã cập nhật phiên bản.'` → `'Đã cập nhật biến thể.'`
- `'Đã thêm phiên bản mới.'` → `'Đã thêm biến thể mới.'`
- `title={isEditing ? 'Sửa phiên bản' : 'Thêm phiên bản mới'}` → `title={isEditing ? 'Sửa biến thể' : 'Thêm biến thể mới'}`
- `label="Tên phiên bản"` → `label="Tên biến thể"`
- `{isEditing ? 'Lưu thay đổi' : 'Thêm phiên bản'}` → `{isEditing ? 'Lưu thay đổi' : 'Thêm biến thể'}`

- [ ] **Step 4: Rename the list-page column header in `AdminProductsPage.jsx`**

Edit `src/pages/admin/products/AdminProductsPage.jsx` — replace:

- `<th className="px-4 py-3">Phiên bản</th>` → `<th className="px-4 py-3">Biến thể</th>`

- [ ] **Step 5: Restructure `AdminProductEditPage.jsx` into tabs**

Edit `src/pages/admin/products/AdminProductEditPage.jsx`.

5a. Add the Tabs import (next to the other component imports near the top):

```jsx
import { Tabs, TabList, Tab, TabPanel } from '../../../components/admin/Tabs'
```

5b. Above the `ProductEditor` function (module scope), add the field→tab mapping and tab order:

```jsx
// Which tab each react-hook-form field lives on, so a failed submit can jump to
// the first tab that has an error (its panel is hidden while another tab is active).
const FIELD_TAB = {
  name: 'thong-tin',
  slug: 'thong-tin',
  category_id: 'thong-tin',
  status: 'thong-tin',
  description: 'mo-ta-seo',
  meta_title: 'mo-ta-seo',
  meta_description: 'mo-ta-seo',
  focus_keyword: 'mo-ta-seo',
}
const TAB_ORDER = ['thong-tin', 'bien-the', 'mo-ta-seo', 'hinh-anh']
```

5c. Inside `ProductEditor`, after the existing `useState`/`useForm` setup, add the active-tab state, the errored-tabs set, the invalid handler, and a submit helper. Place this just before `const onSubmit`:

```jsx
  const [activeTab, setActiveTab] = useState('thong-tin')

  const erroredTabs = new Set(
    Object.keys(errors)
      .map((field) => FIELD_TAB[field])
      .filter(Boolean),
  )

  const focusFirstErrorTab = (formErrors) => {
    const tabs = new Set(
      Object.keys(formErrors)
        .map((field) => FIELD_TAB[field])
        .filter(Boolean),
    )
    const first = TAB_ORDER.find((tab) => tabs.has(tab))
    if (first) setActiveTab(first)
  }
```

5d. Keep the existing `onSubmit` body exactly as-is. The Save button (added in 5e) calls `handleSubmit(onSubmit, focusFirstErrorTab)`.

5e. Replace the entire returned JSX (`return ( … )`) of `ProductEditor` with the structure below. **Move the existing inner blocks verbatim** into the marked slots — do not rewrite their internals; only the wrappers/headers around them change as shown. The metadata fields lose their own `<form>`/submit-row (Save is global now); the variants table, `VariantOptionsPanel`, `VariantMatrixGenerator`, `DescriptionSeoFields`, and the media library move unchanged into panels.

```jsx
  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/products">Quay lại danh sách sản phẩm</BackLink>

      {/* Title bar: name + status + global Save */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate font-display text-2xl text-foreground">{product.name}</h2>
            <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">/{product.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/products')}>
            Hủy
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit(onSubmit, focusFirstErrorTab)}>
            Lưu sản phẩm
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList ariaLabel="Cấu hình sản phẩm">
          <Tab value="thong-tin" hasError={erroredTabs.has('thong-tin')}>Thông tin</Tab>
          <Tab value="bien-the">Biến thể</Tab>
          <Tab value="mo-ta-seo" hasError={erroredTabs.has('mo-ta-seo')}>Mô tả &amp; SEO</Tab>
          <Tab value="hinh-anh">Hình ảnh</Tab>
        </TabList>

        {/* THÔNG TIN — metadata fields (no inner <form>; Save is global) */}
        <TabPanel value="thong-tin">
          <Panel padded={false}>
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Thông tin sản phẩm</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Cấu hình metadata của sản phẩm.</p>
            </div>
            <div className="flex flex-col gap-4 p-5">
              {/* MOVE VERBATIM: the four fields from the current form —
                  Input "Tên sản phẩm", Input "Slug", the Danh mục <select> block,
                  and the Trạng thái <select> block. Drop the old submit-button row. */}
            </div>
          </Panel>
        </TabPanel>

        {/* BIẾN THỂ — variants table + options + matrix generator */}
        <TabPanel value="bien-the">
          <div className="flex flex-col gap-6">
            <Panel padded={false}>
              {/* MOVE VERBATIM: the current variants-table Panel contents
                  (header with <Layers/>, "Thêm biến thể" button, EmptyState,
                  the table, and the variant Pagination). Rename the header button
                  and EmptyState/aria copy to "biến thể" per the strings below. */}
            </Panel>
            <Panel padded={false}>
              <div className="border-b border-border px-5 py-4">
                <h3 className="font-display text-lg text-foreground">Thuộc tính biến thể</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Định nghĩa các thuộc tính (màu sắc, kích thước…) rồi sinh tự động các biến thể tổ hợp.
                </p>
              </div>
              <div className="flex flex-col gap-6 p-5">
                {/* MOVE VERBATIM: <VariantOptionsPanel/>, the helper <p>, and the
                    <VariantMatrixGenerator/> block — unchanged. */}
              </div>
            </Panel>
          </div>
        </TabPanel>

        {/* MÔ TẢ & SEO */}
        <TabPanel value="mo-ta-seo">
          {/* MOVE VERBATIM: the existing <DescriptionSeoFields … /> element. */}
        </TabPanel>

        {/* HÌNH ẢNH — media library */}
        <TabPanel value="hinh-anh">
          {/* MOVE VERBATIM: the existing media-library Panel (grid + upload <form>). */}
        </TabPanel>
      </Tabs>

      <VariantFormModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        productId={product.id}
        variant={editingVariant}
        onSaved={handleVariantSaved}
      />
    </div>
  )
```

5f. In the moved variants-table block, rename the user-facing variant copy:

- `Phiên bản` (the `<h3>` table-header text) → `Biến thể`
- `{allVariants.length} phiên bản · giá &amp; tồn kho` → `{allVariants.length} biến thể · giá &amp; tồn kho`
- both `Thêm phiên bản` button labels → `Thêm biến thể`
- EmptyState `title="Chưa có phiên bản nào"` → `title="Chưa có biến thể nào"`
- EmptyState `description="Thêm phiên bản đầu tiên để thiết lập SKU, giá bán và tồn kho cho sản phẩm này."` → `description="Thêm biến thể đầu tiên để thiết lập SKU, giá bán và tồn kho cho sản phẩm này."`
- the row action `aria-label="Sửa phiên bản"` and `title="Sửa phiên bản"` → `"Sửa biến thể"`
- the helper line `Lưu thuộc tính bằng nút “Lưu sản phẩm” ở trên, sau đó sinh biến thể bên dưới.` stays (already "biến thể").

- [ ] **Step 6: Run the edit test to verify it passes**

Run: `npm test -- --run src/pages/admin/products/AdminProductEditPage.test.jsx`
Expected: PASS (all existing tests + the new validation test).

- [ ] **Step 7: Lint and stage**

```bash
npm run lint
git add src/pages/admin/products/AdminProductEditPage.jsx \
        src/pages/admin/products/AdminProductEditPage.test.jsx \
        src/pages/admin/products/VariantFormModal.jsx \
        src/pages/admin/products/AdminProductsPage.jsx
```

---

### Task 4: Create page — tabs (locked), auto-slug, rename, docs

**Files:**
- Modify: `src/pages/admin/products/AdminProductCreatePage.jsx`
- Test: `src/pages/admin/products/AdminProductCreatePage.test.jsx`
- Modify: `docs/FE-TEAM-WORKFLOW.md`

**Interfaces:**
- Consumes: `Tabs, TabList, Tab, TabPanel` (Task 2), `slugify` (Task 1).
- Tab values/labels match Task 3: `thong-tin`/`Thông tin`, `bien-the`/`Biến thể` (disabled), `mo-ta-seo`/`Mô tả & SEO`, `hinh-anh`/`Hình ảnh` (disabled).

- [ ] **Step 1: Update the create test (auto-slug + tab nav + rename)**

Edit `src/pages/admin/products/AdminProductCreatePage.test.jsx`.

In `creates a product then navigates into its edit page`, the name/slug/category are all on the default "Thông tin" tab, so it needs no tab switch — but replace the manual slug typing with an assertion that the slug auto-filled from the name. Change the field-entry lines to:

```jsx
    await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Đèn bàn')
    expect(screen.getByLabelText('Slug')).toHaveValue('den-ban')
    await userEvent.selectOptions(await screen.findByLabelText('Danh mục'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))
```

In `fills description and SEO fields from the AI draft`, switch to the SEO tab before the AI button:

```jsx
    await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Đèn bàn gỗ')
    await userEvent.click(screen.getByRole('tab', { name: 'Mô tả & SEO' }))
    await userEvent.click(screen.getByRole('button', { name: /Gợi ý bằng AI/ }))
```

Append a test that manual slug edits stop the auto-sync:

```jsx
  it('stops auto-filling the slug once it is manually edited', async () => {
    render(<TestHarness />)

    await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Đèn bàn')
    expect(screen.getByLabelText('Slug')).toHaveValue('den-ban')

    const slug = screen.getByLabelText('Slug')
    await userEvent.clear(slug)
    await userEvent.type(slug, 'den-ban-custom')

    await userEvent.clear(screen.getByLabelText('Tên sản phẩm'))
    await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Đèn treo')
    expect(screen.getByLabelText('Slug')).toHaveValue('den-ban-custom')
  })
```

> Note: `TestHarness` / the render wrapper is whatever the existing create test already uses (reuse the same setup the other tests in this file use to render `<AdminProductCreatePage/>`).

Add a test that the locked tabs are disabled:

```jsx
  it('locks the variants and images tabs until the product is saved', () => {
    render(<TestHarness />)
    expect(screen.getByRole('tab', { name: 'Biến thể' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'Hình ảnh' })).toBeDisabled()
  })
```

- [ ] **Step 2: Run the create test to verify it fails**

Run: `npm test -- --run src/pages/admin/products/AdminProductCreatePage.test.jsx`
Expected: FAIL — slug not auto-filled / no `tab` roles.

- [ ] **Step 3: Add imports and auto-slug wiring to `AdminProductCreatePage.jsx`**

3a. Add imports near the top:

```jsx
import { Tabs, TabList, Tab, TabPanel } from '../../../components/admin/Tabs'
import { slugify } from '../../../lib/slugify'
```

3b. Inside `AdminProductCreatePage`, after the `useForm({...})` call, add the auto-slug state/effect (uses `watch`, `setValue` already destructured from `useForm`):

```jsx
  const [slugTouched, setSlugTouched] = useState(false)
  const nameValue = watch('name')

  useEffect(() => {
    if (slugTouched) return
    setValue('slug', slugify(nameValue), { shouldValidate: true })
  }, [nameValue, slugTouched, setValue])
```

3c. Ensure `useState` and `useEffect` are imported from React (the file currently imports `useMemo`):

```jsx
import { useEffect, useMemo, useState } from 'react'
```

3d. On the Slug `<Input>`, stop the sync once the user edits it. Replace `{...register('slug')}` on the slug input with a merged onChange:

```jsx
            <Input
              label="Slug"
              id="slug"
              error={errors.slug?.message}
              {...register('slug', { onChange: () => setSlugTouched(true) })}
            />
```

Add a hint under the slug field while auto mode is active (immediately after the slug `<Input>`):

```jsx
            {!slugTouched && (
              <p className="-mt-2 text-xs text-muted-foreground">Tự tạo từ tên sản phẩm. Bạn có thể chỉnh lại.</p>
            )}
```

- [ ] **Step 4: Restructure the create render into the locked-tab shell**

Replace the create page's content area (the `<div className="grid …">` two-column block **and** the trailing `<DescriptionSeoFields … />`) with the tab shell below. Keep the title bar (with the "Bản nháp" badge) and the `onSubmit`/`handleGenerateDescription` handlers unchanged. The "Tạo sản phẩm" button stays the submit action — keep the metadata fields inside a `<form onSubmit={handleSubmit(onSubmit)}>` (no nested sub-forms exist on the create page, so this is safe).

```jsx
      <Tabs defaultValue="thong-tin">
        <TabList ariaLabel="Cấu hình sản phẩm">
          <Tab value="thong-tin">Thông tin</Tab>
          <Tab value="bien-the" disabled>Biến thể</Tab>
          <Tab value="mo-ta-seo">Mô tả &amp; SEO</Tab>
          <Tab value="hinh-anh" disabled>Hình ảnh</Tab>
        </TabList>

        {/* THÔNG TIN */}
        <TabPanel value="thong-tin">
          <Panel padded={false}>
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Thông tin sản phẩm</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Cấu hình metadata của sản phẩm.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
              {/* MOVE VERBATIM from the current form: Input "Tên sản phẩm",
                  Input "Slug" (now with the onChange + hint from Step 3d),
                  the Danh mục <select> block, and the Trạng thái <select> block. */}
              <div className="flex items-center gap-2 border-t border-border pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  Tạo sản phẩm
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/admin/products')}>
                  Hủy
                </Button>
              </div>
            </form>
          </Panel>
        </TabPanel>

        {/* BIẾN THỂ — locked until the product exists */}
        <TabPanel value="bien-the">
          <Panel>
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-border-strong">
                <Layers size={24} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-foreground">Biến thể</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Lưu sản phẩm trước, sau đó bạn có thể thêm biến thể (SKU, giá, tồn kho).
              </p>
            </div>
          </Panel>
        </TabPanel>

        {/* MÔ TẢ & SEO */}
        <TabPanel value="mo-ta-seo">
          <DescriptionSeoFields
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            slug={watch('slug')}
            namePlaceholder={watch('name')}
            onGenerate={handleGenerateDescription}
            isGenerating={generateDescription.isPending}
            onEditorError={(error) =>
              addToast({ title: 'Không thể chèn ảnh.', description: error.message, variant: 'error' })
            }
          />
        </TabPanel>

        {/* HÌNH ẢNH — locked until the product exists */}
        <TabPanel value="hinh-anh">
          <Panel>
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-border-strong">
                <Images size={24} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-foreground">Hình ảnh / Video</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Lưu sản phẩm trước để tải lên hình ảnh và video.
              </p>
            </div>
          </Panel>
        </TabPanel>
      </Tabs>
```

3e. Rename the create toast: `'Đã tạo sản phẩm. Thêm phiên bản và hình ảnh ngay nào.'` → `'Đã tạo sản phẩm. Thêm biến thể và hình ảnh ngay nào.'`

(The `Layers` and `Images` lucide imports already exist in this file; keep them.)

- [ ] **Step 5: Run the create test to verify it passes**

Run: `npm test -- --run src/pages/admin/products/AdminProductCreatePage.test.jsx`
Expected: PASS (existing + the two new tests).

- [ ] **Step 6: Update the workflow doc**

Edit `docs/FE-TEAM-WORKFLOW.md` — add a short subsection documenting the admin product form pattern: the four-tab layout (`Thông tin · Biến thể · Mô tả & SEO · Hình ảnh`) built on `components/admin/Tabs.jsx`, the global Save in the title bar with validation that jumps to the first errored tab, the create page's disabled "locked until saved" tabs, the `slugify` auto-slug behaviour on create (stops once the slug is hand-edited; edit page keeps slugs manual), and the "Biến thể" terminology (admin only; storefront keeps "phiên bản"). Match the surrounding doc's heading style and brevity.

- [ ] **Step 7: Full suite, lint, stage**

Run: `npm test -- --run` (expect green; one pre-existing lazy-route timeout test may flake under parallel load — re-run that file in isolation if so) and `npm run lint`.

```bash
git add src/pages/admin/products/AdminProductCreatePage.jsx \
        src/pages/admin/products/AdminProductCreatePage.test.jsx \
        docs/FE-TEAM-WORKFLOW.md
```

---

## Self-Review

**Spec coverage:**
- §3.1 Tabs primitive → Task 2. ✅
- §3.2 Edit page 4 tabs + global Save + validation surfacing → Task 3. ✅
- §3.3 Create page locked tabs → Task 4 (Step 4). ✅
- §3.4 Terminology "Biến thể" (Edit page, VariantFormModal, ProductsPage, Create toast/locked copy) → Task 3 (Steps 3–5) + Task 4 (Step 3e/4). Storefront untouched. ✅
- §3.5 Auto-slug + `slugify` → Task 1 + Task 4 (Step 3). Edit keeps manual slug (Task 3 leaves slug field as-is). ✅
- §4 file table → covered across tasks. ✅
- §5 testing → unit tests (Tasks 1–2), updated RTL tests + validation test (Tasks 3–4). ✅
- §6 constraints → Global Constraints + stage-only steps. ✅

**Placeholder scan:** "MOVE VERBATIM" markers reference concrete existing blocks in the named files with exact strings to change; no TBD/TODO/"add error handling". The only indirection is reusing the create test's existing render wrapper (`TestHarness`), explicitly called out.

**Type consistency:** Tab values `thong-tin`/`bien-the`/`mo-ta-seo`/`hinh-anh` and labels are identical across Tasks 3 and 4 and the tests. `slugify` signature matches Task 1. `FIELD_TAB`/`TAB_ORDER`/`focusFirstErrorTab`/`erroredTabs` are self-consistent within Task 3. `Tabs`/`TabList`/`Tab`/`TabPanel` props (`value`, `disabled`, `hasError`, `ariaLabel`, `onValueChange`, `defaultValue`) match the Task 2 definitions.
