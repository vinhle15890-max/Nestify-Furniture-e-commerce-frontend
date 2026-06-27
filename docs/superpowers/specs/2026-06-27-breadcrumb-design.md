# Breadcrumb chuẩn (đa cấp + SEO + rút gọn)

**Date:** 2026-06-27 · **Status:** Approved — chờ lập plan

## Bối cảnh & vấn đề

Breadcrumb hiện chỉ tồn tại **inline trong `ProductPage.jsx`** dưới dạng `Trang chủ > {danh mục lá} > {tên SP}`.
Bốn thiếu sót so với các trang TMĐT lớn (Tiki/IKEA/Amazon):

1. **Mất chuỗi tổ tiên.** Chỉ hiện danh mục trực tiếp; nếu SP thuộc danh mục con thì danh mục cha biến mất.
   `CategoryResource` của BE chỉ trả `parent_id` (không tên/slug cha) → FE không đủ dữ liệu dựng full path.
2. **`CategoryPage` không có breadcrumb** nào.
3. **Không có structured data** `BreadcrumbList` → Google không hiển thị breadcrumb trong kết quả tìm kiếm.
4. **Viết inline, không tái dùng**, thiếu `aria-current="page"`.

## Quyết định (đã chốt với user)

- **Nguồn ancestry: FE tự dò từ cây danh mục** (`useCategories()` đã cache app-wide cho `CategoryNav` ở header,
  queryKey `['categories']`). **Không đụng BE, không migration, không test BE.** Cây 2 cấp đã đủ (parent + children).
- **Phạm vi:** component `Breadcrumb` tái dùng + sửa `ProductPage` + thêm vào `CategoryPage` + phát `BreadcrumbList` JSON-LD.
- **Giữ JSON-LD** và **rút gọn khi quá dài** (gập mục giữa + truncate nhãn).

## Kiến trúc — 3 tầng tách bạch

### a) Helper thuần `src/lib/categoryPath.js` (không React)

```js
// DFS cây danh mục, trả chuỗi từ gốc → danh mục có slug (gồm cả nó). Không thấy → [].
export function findCategoryPath(tree, slug) // => [{ id, name, slug }, ...]
```

- Input `tree` = mảng node `{ id, name, slug, children? }` (chính là `useCategories().data.data`).
- Đệ quy: với mỗi node, nếu `node.slug === slug` trả `[node]`; nếu con tìm thấy thì prepend `node`.
- Thuần, không phụ thuộc React → unit test trực tiếp.

### b) Component `src/components/Breadcrumb.jsx` (generic, không biết "category")

- **Props:**
  - `items: [{ label: string, to?: string }]` — mục **cuối không có `to`** = trang hiện tại.
  - `maxItems?: number` (mặc định `4`) — ngưỡng gập.
- **Render a11y chuẩn:** `<nav aria-label="Breadcrumb"><ol>` … `<li>`. Mục có `to` → `<Link>`; mục cuối →
  `<span aria-current="page">`. Separator `ChevronRight` (lucide) `aria-hidden`. Dùng đúng token hiện có
  (`text-muted-foreground`, `text-border-strong`, `hover:text-accent`) — **không đổi design token**.
- **Rút gọn:**
  - *Quá nhiều cấp* (`items.length > maxItems`): hiển thị **mục đầu + nút `…` (mở rộng) + 2 mục cuối**. Bấm `…`
    → state `expanded=true` → render đầy đủ. Nút `…`: `aria-label="Hiện đầy đủ đường dẫn"`.
  - *Nhãn quá dài* (vd tên SP): mỗi nhãn `max-w-[16rem] truncate` + `title={label}` → không vỡ layout mobile.
- **SEO — BreadcrumbList JSON-LD:** `useEffect` append/cleanup `<script type="application/ld+json">`
  (cùng pattern ProductPage đang dùng), **phát đầy đủ** mọi item (không bị ảnh hưởng bởi gập hiển thị), chỉ khi
  `items.length >= 2`. `itemListElement[].position` 1-based; `item` = URL tuyệt đối `window.location.origin + to`
  cho mục có `to`, và `window.location.href` cho mục hiện tại.

### c) Tích hợp trang (compose)

**`ProductPage.jsx`** — thay nav inline:
```
const { data: categoriesData } = useCategories()
const path = product.category ? findCategoryPath(categoriesData?.data ?? [], product.category.slug) : []
const crumbs = [
  { label: 'Trang chủ', to: '/' },
  ...(path.length
        ? path.map((c) => ({ label: c.name, to: `/c/${c.slug}` }))
        : product.category ? [{ label: product.category.name, to: `/c/${product.category.slug}` }] : []),
  { label: product.name },
]
<Breadcrumb items={crumbs} />
```
- Giữ Product JSON-LD đang có; Breadcrumb tự lo BreadcrumbList riêng.

**`CategoryPage.jsx`** — thêm mới phía trên tiêu đề:
```
const { data: categoriesData } = useCategories()           // cây ĐẦY ĐỦ từ gốc (không phải subtree)
const path = isAll ? [] : findCategoryPath(categoriesData?.data ?? [], categorySlug)
const crumbs = [
  { label: 'Trang chủ', to: '/' },
  ...(isAll
        ? [{ label: 'Tất cả sản phẩm' }]
        : path.length
            ? path.map((c, i) => (i === path.length - 1 ? { label: c.name } : { label: c.name, to: `/c/${c.slug}` }))
            : [{ label: category?.name ?? 'Danh mục' }]),
]
<Breadcrumb items={crumbs} />
```
> Lưu ý: chuỗi tổ tiên **chỉ** dò được từ cây đầy đủ `useCategories()` (queryKey `['categories']`), KHÔNG dùng
> subtree của `useCategory(slug)` vì subtree không chứa tổ tiên của chính nó. `CategoryPage` cần thêm hook
> `useCategories()` (hiện chỉ dùng `useCategory`).

## Data flow

`useCategories()` (cache `['categories']`, tải sẵn cho header) → `findCategoryPath(tree, slug)` (thuần) →
page compose `items` → `<Breadcrumb>` render + emit JSON-LD.

## Suy biến mềm (edge cases)

- **Cây chưa tải / slug lạ** (path rỗng): ProductPage fallback 1 crumb danh mục trực tiếp từ `product.category`;
  CategoryPage hiện `category?.name`. → không bao giờ vỡ. Khi cây tải xong, full path xuất hiện.
- **SP không có danh mục** → `[Trang chủ, tên SP]`.
- **`/c/all`** → `[Trang chủ, "Tất cả sản phẩm"]`.
- **1 item** (chỉ Trang chủ): không render breadcrumb (vô nghĩa) — guard `items.length >= 2`.

## Testing

**Helper** `src/lib/categoryPath.test.js`
- Chuỗi gốc→lá nhiều cấp đúng thứ tự; node cấp 1 trả `[self]`; slug không tồn tại → `[]`; tree rỗng → `[]`.

**Component** `src/components/Breadcrumb.test.jsx`
- Mục giữa là link (`to`), mục cuối **không** link + có `aria-current="page"`.
- Khi `items.length > maxItems`: hiện nút `…`; bấm → lộ các mục bị gập.
- Phát `<script type="application/ld+json">` chứa `"@type":"BreadcrumbList"` với `itemListElement` đủ số phần tử.
- `items.length < 2` → không render `nav`.

**Trang**
- `ProductPage.test.jsx`: mock `useCategories` (hoặc dựa fallback) — đảm bảo test cũ vẫn xanh; thêm assert chuỗi
  có danh mục.
- `CategoryPage.test.jsx`: mock `useCategories`; assert breadcrumb hiện `Trang chủ` + tên danh mục; nhánh `/c/all`.

## Docs cần cập nhật (sau khi build)

- Spec này.
- (Không cập nhật `FE_AI_CONTEXT.md`/ERD — thuần FE, không đổi contract/schema.)

## Không làm (YAGNI)

- Không thêm `ancestors` ở BE (đã chốt FE-only).
- Không breadcrumb cho trang admin / account / cart (không phải bề mặt SEO/điều hướng catalog).
- Không lưu lịch sử điều hướng kiểu "quay lại trang trước" — breadcrumb phản ánh **cấu trúc danh mục**, không phải history.
