# Admin Product Form — Progressive Disclosure, Terminology & Auto-slug

- **Date:** 2026-06-28
- **Scope:** Frontend only (`Nestify-Furniture-e-commerce-frontend`). No backend, payload, or design-token changes.
- **Surfaces:** `src/pages/admin/products/AdminProductCreatePage.jsx`, `AdminProductEditPage.jsx`, and their child panels/components.
- **Design language:** Warm Luxury Editorial (existing tokens in `src/styles/tokens.css`). No new tokens.

## 1. Problem

The admin product form exposes every section at once in a long vertical scroll
(metadata + variants table + variant attributes + matrix generator + description/SEO +
media library). This violates the redesign brief's **Reduce Cognitive Load — Progressive
Disclosure** principle: only the primary workflow should be visible by default; advanced
configuration should be grouped and revealed on demand.

Two related UX issues surfaced while scoping:

- **Inconsistent terminology.** The UI mixes "Phiên bản" (variants table) and "biến thể"
  ("Thuộc tính biến thể", "sinh biến thể") for the *same* concept — a concrete sellable SKU.
- **Manual slug entry.** Slug is a required, hand-typed field on create even though it can be
  derived from the product name in the overwhelming majority of cases.

## 2. Goals / Non-goals

**Goals**
- Reorganise the product form into **tabs** so each view shows one coherent group.
- Unify variant terminology on **"Biến thể"** across the admin product surfaces.
- Auto-generate the slug from the product name on the **create** page until the user edits it.
- Keep all existing logic, mutations, payloads, validation rules, and (non-renamed)
  accessible names intact. Keep the test suite green.

**Non-goals**
- No backend changes. The API contract is unchanged: media (`POST /admin/products/{id}/media`)
  and variants (`POST /admin/products/{id}/variants`) remain nested under a product id, so the
  create page **keeps** its "save the product before adding variants/media" constraint.
- No change to the storefront. Customer-facing wording on `src/pages/product/ProductPage.jsx`
  stays as-is (friendlier language for shoppers).
- No design-token changes. No new fields. No variant-table removal (both the manual variant
  table and the matrix generator are retained — only regrouped).

## 3. Design

### 3.1 Tabs primitive — `components/admin/Tabs.jsx`

- Add dependency `@radix-ui/react-tabs` (consistent with the existing `@radix-ui/react-dialog`
  and `@radix-ui/react-toast`). Radix provides `role=tablist/tab/tabpanel`, roving-tabindex
  arrow-key navigation, and `aria-selected` for free.
- Wrap into a small styled component set exported from `components/admin/Tabs.jsx`:
  `Tabs`, `TabList`, `Tab`, `TabPanel`. Styling uses existing tokens — inactive tab
  `text-muted-foreground`, active tab `text-foreground` with an **accent (brass)** underline,
  hover `text-foreground`. Reusable by future admin pages.
- **Force-mount panels.** Render every `TabPanel` with Radix `forceMount` and hide inactive
  ones via the `hidden` attribute (CSS `display:none`). Rationale: the product editor is a
  single React Hook Form spanning multiple tabs (name/slug/category/status + description/SEO +
  `variant_options`). Keeping panels mounted means form values and validation work across tabs
  without `shouldUnregister` surprises, and the RichTextEditor / media state are not
  re-initialised on every tab switch.
- A `Tab` accepts an optional `disabled` prop (for the create page's locked tabs) and an
  optional `hasError` prop to render a small error dot (see §3.2 validation surfacing).

### 3.2 Edit page — `AdminProductEditPage.jsx` (4 tabs)

Tabs: **Thông tin · Biến thể · Mô tả & SEO · Hình ảnh.**

- **Thông tin** — the existing left metadata panel (Tên, Slug, Danh mục, Trạng thái).
- **Biến thể** — combines, in this order, the three current variant blocks:
  1. the variants data table (SKU / giá / tồn kho, pagination, edit-row),
  2. "Thuộc tính biến thể" (`VariantOptionsPanel`),
  3. the matrix generator (`VariantMatrixGenerator`).
- **Mô tả & SEO** — the existing `DescriptionSeoFields` panel (unchanged internally).
- **Hình ảnh** — the existing media library (upload, reorder, delete).

**Global Save.** The product `<form>` submit covers Thông tin + Mô tả & SEO + `variant_options`,
so the "Lưu sản phẩm" button must live **outside** the tabs, in the page title bar (sticky on
scroll). The form element wraps the tab container so a submit from any tab triggers the same
handler. Variant rows and media continue to save through their own mutations (modal / upload),
independent of the main form submit — unchanged.

**Validation surfacing.** Map each RHF field to its owning tab:
`{ name, slug, category_id, status } → "thong-tin"`,
`{ description, meta_title, meta_description, focus_keyword } → "mo-ta-seo"`.
On a failed submit (`handleSubmit`'s invalid callback, or by inspecting `formState.errors`),
render an error dot on every tab that owns an errored field and switch the active tab to the
first tab (in display order) that has an error, so the user sees the message even though that
panel was hidden.

### 3.3 Create page — `AdminProductCreatePage.jsx` (same shell, locked tabs)

Same 4-tab shell for visual consistency. Because no product id exists yet:

- **Thông tin** and **Mô tả & SEO** are active and usable.
- **Biến thể** and **Hình ảnh** tabs are **disabled** with the label/affordance
  "Lưu sản phẩm trước để mở khóa" (preserving today's "locked until saved" behaviour, just
  expressed as disabled tabs instead of a placeholder panel). On successful create the page
  navigates to the edit page as it does today (no behavioural change to the create→edit flow).

### 3.4 Terminology — unify on "Biến thể" (admin only)

Rename user-visible "phiên bản" → "biến thể" on admin product surfaces:

- `AdminProductEditPage.jsx`: table header section ("Phiên bản" → "Biến thể"),
  "{n} phiên bản" → "{n} biến thể", "Thêm phiên bản" → "Thêm biến thể",
  aria/title "Sửa phiên bản" → "Sửa biến thể", EmptyState "Chưa có phiên bản nào" →
  "Chưa có biến thể nào", helper copy ("Lưu thuộc tính… sinh biến thể bên dưới" stays "biến thể").
- `AdminProductCreatePage.jsx`: locked-tab copy + the create toast
  ("Đã tạo sản phẩm. Thêm biến thể và hình ảnh ngay nào.").
- `AdminProductsPage.jsx`: any "phiên bản" column/label → "biến thể".
- `VariantFormModal.jsx`: titles/labels "phiên bản" → "biến thể".
- "Thuộc tính biến thể" is **kept** (it already uses "biến thể"); it denotes the option axes,
  not a variant.
- **Not changed:** `src/pages/product/ProductPage.jsx` (storefront, customer-facing).

### 3.5 Auto-slug from name — create page

- New util `src/lib/slugify.js`:
  ```js
  export function slugify(input) {
    return (input ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')   // strip combining diacritics
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')       // non-alphanumeric → hyphen
      .replace(/^-+|-+$/g, '');          // trim leading/trailing hyphens
  }
  ```
  Output satisfies the BE `alpha_dash` rule and the FE schema regex `^[a-z0-9_-]+$`.
- **Create page behaviour:** track a `slugTouched` flag (set true on the slug input's
  `onChange` by the user). While `slugTouched` is false, watch `name` and
  `setValue('slug', slugify(name))` live. Once the user edits the slug, stop syncing. The slug
  input stays visible/editable (manual override always possible) with a hint such as
  "Tự tạo từ tên sản phẩm" while in auto mode. Slug remains a required field; auto-fill simply
  populates it.
- **Edit page:** slug stays manual — do **not** auto-overwrite an existing product's slug from
  its name (that would silently change the public URL / SEO and the derived variant SKUs).

## 4. Components & files

| File | Change |
|---|---|
| `package.json` | add `@radix-ui/react-tabs` |
| `src/components/admin/Tabs.jsx` (new) | accessible tab primitive (force-mount, disabled, hasError) |
| `src/components/admin/Tabs.test.jsx` (new) | role/selection/keyboard/disabled tests |
| `src/lib/slugify.js` (new) | Vietnamese-aware slugify |
| `src/lib/slugify.test.js` (new) | diacritics, đ, spacing, edge cases |
| `src/pages/admin/products/AdminProductEditPage.jsx` | tabs, global Save, validation surfacing, terminology |
| `src/pages/admin/products/AdminProductCreatePage.jsx` | tabs (locked), auto-slug, terminology |
| `src/pages/admin/products/AdminProductsPage.jsx` | terminology |
| `src/pages/admin/products/VariantFormModal.jsx` | terminology |
| `*.test.jsx` (create/edit) | navigate tabs before interacting; updated copy assertions |
| `docs/FE-TEAM-WORKFLOW.md` | document the admin tabbed-form + auto-slug pattern |

## 5. Testing strategy

- **slugify** — unit tests: `"Ghế Sofa Da Bò"` → `ghe-sofa-da-bo`; đ handling; multiple
  spaces/punctuation collapse to single hyphen; trailing hyphen trimmed; empty/undefined → `''`.
- **Tabs** — renders tablist, only the selected panel is visible, arrow-key navigation moves
  selection, a `disabled` tab cannot be selected, `hasError` shows the dot.
- **Create page** — name → slug auto-fills; editing slug stops the sync; tab navigation reaches
  the AI-fill flow (the "Gợi ý bằng AI" test now selects the "Mô tả & SEO" tab first); locked
  tabs are disabled; create payload unchanged.
- **Edit page** — submitting with a missing required field on a hidden tab switches to that tab
  and shows the error; variant/media flows still pass via their tabs; terminology assertions
  updated ("biến thể").
- Whole suite (`npm test -- --run`) and `npm run lint` clean before completion. Snyk scan on
  new/modified first-party files.

## 6. Constraints honoured

- No backend / payload / route changes.
- No design-token changes; tokens-only Tailwind classes.
- All non-renamed accessible names preserved; the only intentional copy change is
  "phiên bản" → "biến thể" on admin surfaces.
- Stage-only: per the standing project rule, work is staged, not committed, until the user asks.
