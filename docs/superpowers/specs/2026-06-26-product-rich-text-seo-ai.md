# Product description: rich text + SEO meta + AI draft

**Date:** 2026-06-26 · **Status:** Implemented

## Goal

Make the admin product description produce SEO-strong content. Three parts (all chosen by the user):
1. **Rich text editor** (semantic HTML) for `description`.
2. **SEO meta fields** (`meta_title`, `meta_description`, `focus_keyword`) with live counters + Google snippet preview.
3. **AI draft button** that fills description + meta from the product's basics (Gemini).
4. Storefront renders it as real SEO (sanitized HTML + lazy media + `<title>`/meta/Open Graph + `schema.org/Product` JSON-LD).

## Backend (Laravel)

- Migration `2026_06_26_100000_add_seo_fields_to_products_table` — `meta_title` (≤70), `meta_description` (500), `focus_keyword` (≤100), all nullable. **Run `php artisan migrate` to apply.**
- `Product::$fillable` + `ProductResource` expose the 3 fields.
- `Create/UpdateProductRequest` validate them (`max:70/300/100`). `description` stays `nullable|string` (HTML, not stripped).
- **AI endpoint** `POST /api/admin/products/ai/description` (`manage_products`, `throttle:ai`):
  - `ProductDescriptionGenerator` service → Gemini `gemini-2.0-flash` with `responseMimeType=application/json` + schema → `{ description(HTML), meta_title, meta_description, focus_keyword }`.
  - Controller `Admin\ProductAiController@generate`, request `GenerateProductDescriptionRequest`.
  - Failure → `503 AI_SERVICE_UNAVAILABLE` (global render).
- Tests: `tests/Feature/Admin/ProductSeoTest.php` (5, Gemini faked).

## Frontend (React, TipTap)

- Deps: `@tiptap/react|pm|starter-kit|extension-link|extension-image|extension-placeholder`; bumped `dompurify` → 3.4.11 (patched the prior moderate advisory).
- `components/admin/RichTextEditor.jsx` (+ `.css`) — toolbar H2/H3, bold(`<strong>`)/italic(`<em>`), lists, link, image (alt required, uploaded via `lib/cloudinary.js` → `POST /api/media/sign` → direct Cloudinary). Controlled (`value`/`onChange` HTML).
- `AdminProductEditPage` — new full-width **"Mô tả & SEO"** panel (below the variants grid): editor + "Gợi ý bằng AI" button + meta fields with counters (60/160) + snippet preview. `useGenerateDescription` hook + `generateProductDescription` api.
- Storefront `ProductPage` — `enhanceDescriptionHtml` (DOMPurify whitelist + lazy `<img>`), render trong `.product-description` (file `ProductDescription.css`, style theo design token: heading serif, list có bullet, ảnh bo góc — vì Tailwind v4 không có plugin typography), và một effect đặt `document.title` + meta description + Open Graph + JSON-LD Product từ meta fields (fallback name/description).

## Create flow (thay modal bằng trang tạo)

Nút **"Thêm sản phẩm"** không còn mở `ProductFormModal` (đã xóa) — điều hướng tới `/admin/products/new` (`AdminProductCreatePage`), dùng đúng layout edit: card Thông tin + panel **Mô tả & SEO** (rich text + AI) full. Phiên bản/hình ảnh hiển thị trạng thái khóa "Lưu sản phẩm để mở khóa". Khi **Lưu** → `createProduct` → điều hướng thẳng vào `/admin/products/{id}` (edit) để thêm phiên bản/ảnh. Không tạo bản nháp rác.

Tách dùng chung: `productForm.js` (`productSchema`, `flattenCategories`, `toProductPayload`) + `DescriptionSeoFields.jsx` (panel Mô tả & SEO) cho cả create + edit.

## Tests

- BE: `ProductSeoTest` (5) + existing Product suite (35) green.
- FE: `AdminProductEditPage.test` (AI fill), `AdminProductCreatePage.test` (create→edit nav + AI), `AdminProductsPage.test` (điều hướng tới trang tạo), `lib/cloudinary.test` (3), `ProductPage.test` (JSON-LD/title). Full suite **224 green**.

## Contract docs

- `Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md` — ProductResource + create/update payload + AI endpoint.
- `Nestify-Furniture-e-commerce-backend/docs/13-fe-rich-text-editor.md` — implementation notes.
- Diagrams: `NestifyERD.puml` (products SEO cols), `NestifyUseCaseAdmin.puml` (UC-A02a AI gen). Report HTML/doc/docx **not** edited — see hand-off note.
