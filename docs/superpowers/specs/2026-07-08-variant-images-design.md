# Per-Variant Product Images — Design Spec

**Date:** 2026-07-08
**Feature:** #7 in the Becoming-migration backlog. Lets a product image be tagged
to a specific variant (color/finish), so the storefront gallery and the Room
Planner Preview show the *right* image for the selected variant. Closes the
interim "ảnh minh hoạ" disclaimer debt from [[variant-image-preview-decision]].

**Scope:** cross-stack (Laravel BE + React FE). The author writes both repos; the
user runs the migration and deploys. `affects_appearance` is **out of scope**
(YAGNI — see §E).

---

## A. Data model (BE migration)

Add a **nullable** `variant_id` FK to `product_media`:

```php
$table->foreignId('variant_id')->nullable()->after('product_id')
      ->constrained('product_variants')->nullOnDelete();
```

- `null` = agnostic (applies to all variants — today's behavior).
- set = the media belongs to exactly one variant.
- `nullOnDelete`: deleting a variant makes its media agnostic, never deletes the
  photo (media is product-owned).
- Existing rows → `null` after migration ⇒ **zero regression**.
- No M:N pivot (one image → at most one variant is enough for furniture; the
  earlier decision picked the nullable FK). No `affects_appearance` column.

## B. BE API

- `ProductMediaResource`: add `'variant_id' => $this->variant_id`.
- `ProductMedia` model: add `variant_id` to `$fillable`.
- **Upload** `POST /api/admin/products/{product}/media`: accept optional
  `variant_id` (`nullable`, must be a variant of **this** product).
- **New** `PATCH /api/admin/products/{product}/media/{media}`: update `variant_id`
  (nullable; must belong to this product). This backs the re-tag dropdown.
- Validation (shared rule): `variant_id`, when present, must reference a
  `product_variants` row whose `product_id === {product}.id` → else `422`
  (`VALIDATION_FAILED`). Prevents tagging media to another product's variant.
- Public `GET /api/products/{slug}` already returns `media` via
  `ProductResource` → each item now carries `variant_id` (variants + media are
  already eager-loaded on product detail; no new query).

## C. Admin UI (`AdminProductEditPage`, per media card)

Each media card gains a `<select>` "Áp dụng cho":
- options: `Tất cả phiên bản` (value `''` → `null`) + each `product.variants`
  (`value=id`, `label=variant.name`).
- current value = `media.variant_id ?? ''`.
- `onChange` → `useUpdateMedia({ productId, mediaId, variant_id })` (PATCH), then
  invalidate the product query.
- Upload form unchanged (tag after upload via the dropdown).

New FE data layer: `updateMedia` in `features/admin/products/api.js` +
`useUpdateMedia` hook (mirrors `useReorderMedia`/`useDeleteMedia`).

## D. Storefront gallery (`ProductPage`)

- `visibleMedia = media.filter(m => m.variant_id == null || m.variant_id === selectedVariant?.id)`.
- Gallery main image + thumbnail strip map over `visibleMedia` (not `media`).
- When `selectedVariant?.id` changes → `setSelectedMediaIndex(0)` (active resets
  to the first image of the filtered set). New effect keyed on `selectedVariant?.id`.
- `activeMedia = visibleMedia[selectedMediaIndex]`.
- Product with no tagged media → all agnostic → `visibleMedia === media` ⇒
  identical to today.

## E. PlannerPreview + disclaimer

- `previewImage`: first **variant-specific** image
  (`media.find(m => m.type==='image' && m.variant_id === selectedVariant?.id)`),
  else first agnostic image (`variant_id == null`), else `null`.
- `previewIsVariantSpecific = Boolean(variant-specific match)`.
- **Disclaimer becomes fallback-aware** (not deleted):
  `showVariantNote = !previewIsVariantSpecific && (hasOptions || variants.length > 1)`.
  Showing a variant's own image → no disclaimer. Showing a fallback image with
  multiple variants → keep the honest "ảnh minh hoạ" note. This is the correct
  "remove the interim disclaimer" outcome: it self-retires as admins tag images.
- `PlannerPreview` component itself is unchanged — it just receives a better
  `image` and the refined `showVariantNote`.

## F. Testing

- **BE (feature tests):** PATCH tags/untags a media's `variant_id`; PATCH with a
  variant from another product → 422; upload accepts `variant_id`; resource
  exposes `variant_id`.
- **FE admin:** changing a card's dropdown calls `updateMedia` with the right
  `{ productId, mediaId, variant_id }`.
- **FE storefront:** selecting a variant filters the gallery to variant+agnostic
  and hides other-variant media; `previewImage` prefers the variant image;
  disclaimer hidden when the variant has its own image, shown on fallback.

## G. Rollout

Additive nullable migration → safe. Deploy order: BE (migrate + deploy) first,
FE second. FE degrades cleanly while all media are agnostic (renders exactly as
today). Admin tags images incrementally; the disclaimer retires per-variant as
images are tagged.

## Non-goals

- `affects_appearance` / precise size-vs-visual disclaimer scoping (YAGNI: the
  "is the shown image a fallback?" signal covers the honest case; the current
  `variants.length>1` already tolerates over-warning size-only products).
- M:N media↔variant sharing.
- Room-image snapshots (that's #6, a separate spec).
