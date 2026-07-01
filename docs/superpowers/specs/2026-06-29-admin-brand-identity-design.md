# Admin Brand Identity — Design Spec

**Date:** 2026-06-29
**Scope:** Direction #1 of the redesign brief — strengthen brand identity across the admin/ERP
back-office. Storefront is out of scope (handled separately as direction #2 Personalization).
**Mode:** STAGE-ONLY (no commits until the user explicitly asks).

## Problem

The admin back-office works correctly but reads as a generic CRUD template: every page header,
empty state, and zero-data screen looks like a default dashboard. There is no recurring visual
motif tying the screens to the Nestify furniture brand. The goal is "enterprise platform with
personality", not bespoke per-page art.

## Constraints (binding)

- Plain JavaScript (`.jsx`), no TypeScript.
- Design **tokens only** — no raw hex, no new tokens. Palette is fixed: brass `--color-accent`
  (`#B08D57`), ink `--color-foreground`, olive `--color-secondary`, cream surfaces, Fraunces
  display + Inter, soft shadows, radius 12/16 (`src/styles/tokens.css`).
- Do **not** touch storefront files or storefront tokens.
- All UI copy Vietnamese; no i18n infrastructure.
- TDD (Vitest + RTL). `npm run lint` and `npm test -- --run` must be clean.
- Reuse existing admin primitives (`PageHeader`, `Panel`, `EmptyState`); extend, don't fork.

## Shape

Two parts, per the approved brainstorm:

1. **Brand layer** — a small set of reusable pieces threaded through existing primitives, so every
   admin empty/zero-data screen is lifted at once (DRY, no per-page bespoke art).
2. **One signature moment** — the Dashboard revenue hero gets a brand motif (no new block; the
   existing ink hero block is enhanced).

The brand motif is **line-art furniture illustration** (the user's chosen motif character).

## Components

### 1. `src/components/admin/BrandIllustration.jsx` (new)

A single component rendering inline SVG line-art furniture motifs.

- Props: `name` (motif key), `size` (px, default e.g. 56), `className`, plus a11y passthrough.
- Motif set (exactly 5): `sofa`, `lamp`, `chair`, `package`, `search`.
- Drawn with `stroke="currentColor"`, thin stroke (~1.5px), no hardcoded fills. Color comes from
  Tailwind token classes on the wrapper (`text-accent` brass for the primary line, optionally
  `text-border-strong` for secondary lines) — never raw hex.
- A11y: when standalone (its own meaning) it exposes `role="img"` + `aria-label`; when purely
  decorative beside text it is `aria-hidden="true"`. The consumer decides via props; the
  component supports both.
- Internal structure: a `MOTIFS` map (`name → render fn / path group`) in the same file. Unknown
  `name` → safe fallback (render nothing harmful, e.g. the `package` motif or an empty `<svg>`),
  never throw.

### 2. `src/components/admin/EmptyState.jsx` (modify, backward-compatible)

Add an optional `illustration` prop (a motif name).

- When `illustration` is provided → render `<BrandIllustration name={illustration} aria-hidden />`
  in place of the lucide icon circle (the empty state's title/description carry the meaning).
- When `illustration` is absent → keep the existing `icon` lucide rendering **unchanged**
  (regression-safe for all current callers that pass `icon`).
- Title, description, action props unchanged.

### 3. Entrance micro-animation (shared)

- One keyframe defined once in `src/styles/globals.css` (fade in + translateY ~4px), applied via a
  utility class consumed by the empty-state illustration and the Dashboard hero motif.
- Wrapped so it is disabled under `@media (prefers-reduced-motion: reduce)` (no motion for users
  who opt out; the element still renders, just without the transition).

### 4. Dashboard hero (modify `AdminDashboardPage.jsx`)

- The existing ink-background "Doanh thu" block becomes the signature moment: add a `lamp` motif as
  a low-opacity brass watermark in a corner, `aria-hidden="true"`, `pointer-events-none`,
  positioned absolutely within the (now `relative`, `overflow-hidden`) hero block.
- No new block is added; layout/KPIs stay as-is.

## Motif → context mapping

| Motif | Surfaces |
|---|---|
| `sofa` | Sản phẩm (products list), Danh mục (categories list) |
| `package` | Đơn hàng (orders list), Biến thể (product edit variants empty) |
| `lamp` | Voucher (vouchers list), Dashboard hero watermark |
| `chair` | Nhân viên, Khách hàng, Đánh giá |
| `search` | Nhật ký audit, future "filter returned nothing" states |

## Wiring

**Convert bare inline empties → branded `EmptyState`** (currently a lone `<p>…</p>`):

| Page | Motif | Copy (title / description) |
|---|---|---|
| `AdminProductsPage.jsx` | `sofa` | "Chưa có sản phẩm nào" / "Thêm sản phẩm đầu tiên để bắt đầu bán." |
| `AdminCategoriesPage.jsx` | `sofa` | "Chưa có danh mục nào" / "Tạo danh mục để sắp xếp sản phẩm." |
| `AdminOrdersPage.jsx` | `package` | "Chưa có đơn hàng nào" / "Đơn hàng của khách sẽ xuất hiện ở đây." |
| `AdminVouchersPage.jsx` | `lamp` | "Chưa có voucher nào" / "Tạo voucher để chạy khuyến mãi." |
| `AdminReviewsPage.jsx` | `chair` | "Không có đánh giá chờ duyệt" / "Mọi đánh giá đã được xử lý." |
| `AdminAuditLogsPage.jsx` | `search` | "Chưa có nhật ký nào" / "Hoạt động quản trị sẽ được ghi lại ở đây." |

Copy is a starting point; keep it short, Vietnamese, action-oriented where a next step exists.
Preserve each page's existing zero-vs-filtered distinction if it already has one (do not regress
the customers page's "khớp tìm kiếm" wording).

**Add `illustration` to existing `EmptyState` callers:**

| Page | Motif |
|---|---|
| `AdminEmployeesPage.jsx` | `chair` |
| `AdminCustomersPage.jsx` | `chair` |
| `AdminProductEditPage.jsx` (variants empty) | `package` |

**Out of scope (leave as-is):** modals/dialogs and inline micro-copy that are not zero-data screens
— `AddEmployeeDialog` ("Không tìm thấy người dùng phù hợp"), `CategoryFormModal` `<option>`
"Không có", `AdminOrderDetailPage` / `AdminProductEditPage` not-found redirects. Admin login is out
of scope (shared/storefront auth — do not touch).

## Testing

- `BrandIllustration.test.jsx` — renders the correct motif for each `name`; exposes `role="img"`
  + `aria-label` when standalone; honors `aria-hidden` when decorative; unknown `name` falls back
  safely (no throw).
- `EmptyState.test.jsx` — with `illustration`, renders `BrandIllustration` and not the icon circle;
  without it, still renders the `icon` (regression guard).
- 1–2 representative page tests (e.g. `AdminProductsPage`) — empty state shows the illustration and
  the action-oriented copy.
- Full suite green; lint clean.

## Task breakdown (each TDD + staged, in order)

1. `BrandIllustration` component (5 motifs) + test.
2. Extend `EmptyState` with `illustration` (backward-compatible) + test.
3. Entrance animation utility in `globals.css` + reduced-motion guard.
4. Wiring: convert 6 bare empties + add `illustration` to 3 existing callers + representative
   page test(s).
5. Dashboard hero `lamp` watermark.
6. Doc sync: add a "brand layer" subsection to `docs/FE-TEAM-WORKFLOW.md`.

## Non-goals

- No new design tokens or palette changes.
- No per-page unique illustrations (one shared component, 5 motifs).
- No storefront changes (that is direction #2, separate spec).
- No PageHeader/Panel structural redesign — brand expression is concentrated in empty states +
  the Dashboard hero to avoid visual noise.
