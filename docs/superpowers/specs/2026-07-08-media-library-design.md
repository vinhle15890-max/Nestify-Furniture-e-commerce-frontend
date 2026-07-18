# Media Library (shared, reusable assets) — Design Spec

Date: 2026-07-08
Status: **BUILT (2026-07-08)**. Cross-stack (Laravel BE + Cloudinary + React admin FE) — implemented
per this spec, uncommitted, pending user-run migrations + deploy. Notable deviations from the
plan below:
1. **`useOffsetQuery` object-signature corrections on the FE** — the Media Library hooks
   (`useMediaLibrary` etc.) required passing the query-params/options as an object to
   `useOffsetQuery`, matching (and slightly correcting) its actual call signature rather than the
   positional shape assumed when this spec was written.
2. **Category "retire `uploadRaw`" was NOT done.** The plan's Backend API §Category image said the
   multipart/`uploadRaw` category path would be retired once `CategoryService` uses library assets.
   In the shipped code the legacy `image_url`/`image_public_id` direct-upload path is **kept** for
   backward compat — `uploadRaw` is still used by a separate, generic `UploadController` outside
   the category form, so removing it was out of scope for this feature.
3. **SQLite can't tighten `product_media.media_asset_id` to `NOT NULL`** — the backfill migration's
   final step (`ALTER ... MODIFY ... NOT NULL`) is guarded with `if (DB::getDriverName() !== 'sqlite')`;
   the column stays nullable under the SQLite test DB and is properly tightened on MySQL/Postgres.
4. **`MediaLibraryModal` reuses the shared `Modal` widget**, widened via `contentClassName="max-w-3xl"`,
   rather than a bespoke Radix Dialog wrapper.

Post-review cleanups (applied after the whole-branch review, all tests re-verified green):
- Removed the now-dead `MediaService::delete(ProductMedia)` (its only caller `ProductMediaController::destroy`
  switched to `detach()`; it also referenced the dropped `product_media.cloudinary_id` column).
- Removed the orphaned FE `useUploadCategoryImage` hook + `categoriesApi.uploadImage` (the category form
  now sets `media_asset_id` via the picker instead of a direct upload).
- `MediaGrid` renders `<video>` for `type: 'video'` assets (was always `<img>`).

Standing constraints: user runs BE migrations + deploys; nothing committed until user asks.

## Purpose

Turn the site's image-adding flow into a **WordPress-style Media Library**: upload an
image once, then **reuse the same asset** across many products/variants/categories by
picking it from a browsable library, instead of always uploading a fresh copy.

**Why it's a data-model change, not a UI tweak:** today `product_media` *is* the asset —
each row owns a unique `cloudinary_id`, is `cascadeOnDelete` on its product, and a delete
issues a Cloudinary `destroy`. Reuse is impossible without separating **the asset** from
**its usage**.

## Decisions (user, 2026-07-08)

1. **Scope = full site.** `media_assets` is a global store; both the product gallery and
   category images reference it. (Grounding: the only single-image consumer besides the
   product gallery is category images — `image_url`/`image_public_id`. SEO/AI jobs only
   *read* media URLs.)
2. **Detach ≠ delete; block hard-delete while referenced.** Removing an image from a
   product/category deletes only the *attachment* (asset stays in the library). Hard-deleting
   an asset from the library is allowed only when its reference count is 0; otherwise blocked
   with the usage count shown.
3. **Model = repurpose `product_media` into the junction** (rather than a new parallel
   table), so `product.media()`, `ProductMediaResource`, and the media routes stay intact;
   only the *source* of `url`/`type`/`alt_text` moves to the asset.
4. **`alt_text` lives on the asset** (a reused photo carries its description). Per-product alt
   override is a deliberate non-goal (YAGNI).
5. **Order history is unaffected.** `SnapshotOrderData` copies the image **URL string** into
   the order (`'thumbnail' => …->url`), not an FK — past orders never pin an asset and do not
   count as "in use."

## Out of scope (YAGNI)

- Per-attachment `alt_text` override.
- Folders / tags / date-hierarchy organization (flat library + search + type filter + an
  "unused only" filter is enough).
- Image editing/cropping in the library.
- Bulk delete from the library UI (single delete with the in-use guard is enough for MVP).

---

## Data model

### `media_assets` (new — the reusable asset)
| Column | Notes |
|---|---|
| `id` | PK |
| `cloudinary_id` | unique. **Never exposed** in API responses (internal — matches existing rule). |
| `url` | Cloudinary `secure_url`. |
| `type` | `image` \| `video` (MediaType enum). |
| `alt_text` | nullable — asset-level default description. |
| `width`, `height`, `bytes` | nullable unsigned — captured from the Cloudinary upload response. |
| `original_filename` | nullable — for library search / display. |
| `timestamps` | |

### `product_media` (repurposed → attachment/junction)
- **Keeps:** `id`, `product_id` (cascadeOnDelete), `variant_id` (nullable, nullOnDelete),
  `sort_order`, timestamps.
- **Adds:** `media_asset_id` FK → `media_assets`. `restrictOnDelete` (an asset can't be DB-
  deleted while attachments reference it — enforces decision 2 at the DB level too).
- **Drops:** `cloudinary_id`, `url`, `type`, `alt_text` (now on the asset).

### `categories`
- **Adds:** `media_asset_id` FK → `media_assets`, nullable, `nullOnDelete`.
- `image_url` / `image_public_id`: backfilled into assets, then **stop being written**. Kept
  read-only for one release, dropped in a follow-up migration. `CategoryResource.image_url`
  reads through the asset relation, so the storefront contract is unchanged.

### Reference counting
An asset is "in use" if any row references it:
`usage_count = product_media.where(media_asset_id).count() + categories.where(media_asset_id).count()`.
A `MediaAsset::usageCount()` (or a service helper) sums these. Extensible: any future
consumer adds its table to this sum.

### Deletion rules
- **Detach** (product): delete the `product_media` attachment row. Asset + Cloudinary
  untouched. **Detach** (category): null the `categories.media_asset_id`.
- **Hard-delete asset**: allowed only when `usage_count === 0` → Cloudinary `destroy` +
  delete row. Otherwise `409 MEDIA_IN_USE` with `{ usage_count }`. (DB `restrictOnDelete`
  is the backstop.)

### Backfill (migration sequence)
1. Create `media_assets`.
2. Add nullable `media_asset_id` to `product_media` and `categories`.
3. **Data backfill (idempotent — only touches rows not yet migrated):**
   - For each `product_media` row **where `media_asset_id IS NULL`** → create a `media_asset`
     (`cloudinary_id`, `url`, `type`, `alt_text`) and set `product_media.media_asset_id`.
     (1:1 — reuse didn't exist before, so no duplicate `cloudinary_id`.) The `WHERE NULL` guard
     makes re-runs no-ops.
   - For each `category` with an image **and `media_asset_id IS NULL`** → create a `media_asset`
     from `image_public_id`/`image_url` and set `categories.media_asset_id`.
4. Make `product_media.media_asset_id` **non-nullable** + drop the moved columns
   (`cloudinary_id`, `url`, `type`, `alt_text`) in a follow-up step of the same migration set.
5. Categories keep `image_url`/`image_public_id` for now (read-only).

> The user runs these migrations against real/prod DB; the author never does. The backfill
> must be safe to re-run.

---

## Backend API

### Media Library (new)
- `GET /api/admin/media` — offset-paginated (like other admin lists). Filters: `type`,
  `search` (filename/alt_text), `unused=1` (usage_count 0). Newest first. Each item is a
  `MediaAssetResource` **including `usage_count`**.
- `POST /api/admin/media` — upload a new asset into the library (Cloudinary + `media_assets`),
  **no attachment**. Body: `file`, optional `alt_text`. `201` `MediaAssetResource`. On
  Cloudinary failure → `503 MEDIA_UPLOAD_FAILED`.
- `PATCH /api/admin/media/{asset}` — edit `alt_text`. `200`.
- `DELETE /api/admin/media/{asset}` — hard-delete; `409 MEDIA_IN_USE` (`{ usage_count }`) when
  referenced, else `204`.

### Product gallery (existing routes; semantics shift)
- `POST /api/admin/products/{product}/media` — **upload-and-attach** (unchanged signature):
  upload → create `media_asset` → create attachment. A direct product upload therefore also
  appears in the library.
- `POST /api/admin/products/{product}/media/attach` (**new**) — attach existing library
  assets: `{ media_asset_ids: int[], variant_id?: int|null }`. Each id must exist in
  `media_assets`; `variant_id` (if set) must belong to the product (existing rule). Creates
  attachment rows with sequential `sort_order` appended after current max. Returns the
  refreshed ordered media list.
- `DELETE /api/admin/products/{product}/media/{media}` — now **detach** (delete attachment
  row only; no Cloudinary call). `204`. Ownership check unchanged.
- `PATCH .../media/{media}` (retag variant) and `PATCH .../media/reorder` — unchanged (operate
  on attachment rows).

### Category image
- Category `store` / `update` accept `media_asset_id` (nullable integer, `exists:media_assets,id`).
  Set = point at a library asset; `null` = detach. The multipart/`uploadRaw` category path is
  retired (the FE uploads via `POST /admin/media` first, then submits the id).

### Resources
- **`MediaAssetResource`**: `id, url, type, alt_text, width, height, bytes, original_filename,
  usage_count, created_at`. No `cloudinary_id`.
- **`ProductMediaResource`** (attachment): same output shape as today
  (`id, variant_id, url, type, alt_text, sort_order`) — `url`/`type`/`alt_text` delegate to the
  asset relation — **plus** `media_asset_id`.

### `MediaService` refactor
- `uploadToLibrary(UploadedFile $file, MediaType $type, ?string $alt): MediaAsset` — Cloudinary
  upload (existing `image` vs `video` transformation logic) + `media_assets` row, capturing
  `width/height/bytes/original_filename` from the response.
- `attachToProduct(Product $product, int[] $assetIds, ?int $variantId): void` — create
  attachment rows, appended `sort_order`.
- `detach(ProductMedia $attachment): void` — delete row only (no Cloudinary).
- `deleteAsset(MediaAsset $asset): void` — guard `usageCount() === 0` (throw
  `MediaInUseException` otherwise) → Cloudinary `destroy` + delete.
- `usageCount(MediaAsset $asset): int`.
- `reorder(...)` unchanged.
- `uploadRaw`/`destroyRaw` retire once `CategoryService` uses library assets. `MediaService`
  stays the ONLY caller of Cloudinary.

### Errors
`503 MEDIA_UPLOAD_FAILED` (upload) · `409 MEDIA_IN_USE` (delete referenced asset, `{usage_count}`) ·
`422` (attach/category with non-existent `media_asset_id`, or foreign `variant_id`).

### BE tests
- `media_assets` upload creates row + captures dimensions; `cloudinary_id` never serialized.
- Library list: pagination, `type`/`search`/`unused` filters, `usage_count` correct.
- `attach`: attaches existing assets, appends sort_order, foreign asset id → 422, variant of
  another product → 422.
- Detach: removes attachment only, asset survives, Cloudinary NOT called.
- Delete asset: unused → Cloudinary destroy + 204; in-use → 409 with usage_count, asset
  survives.
- Upload-and-attach: creates asset + attachment, asset visible in library.
- Category: set/replace/clear `media_asset_id`; `CategoryResource.image_url` reads through
  asset; non-existent id → 422.
- Backfill migration test: seed old-shape rows → run backfill → assets created + FKs wired +
  URLs preserved (idempotent on re-run).
- Order snapshot regression: snapshot still copies URL string; unaffected by asset delete.
- MediaService mocked where Cloudinary would be hit (existing pattern).

---

## Admin frontend

### `MediaLibraryModal` (reusable picker)
Radix Dialog (inherits admin `data-theme="legacy"`). Tabs:
- **"Thư viện"** — `MediaGrid` of asset thumbnails, `SearchInput` (filename/alt), type filter,
  offset `Pagination`, per-tile usage badge ("N nơi"). Selection **multi** (checkboxes) or
  **single** via a `multiple` prop. `attachedAssetIds` marks/disables already-attached tiles.
- **"Tải lên"** — `MediaUploadDropzone` → `POST /admin/media` → new asset appears + auto-
  selected. Multiple files.

Props: `open, onClose, multiple, accept, attachedAssetIds, onSelect(assets)`. Shared by the
product gallery and the category form.

### Product edit (`AdminProductEditPage`)
- Direct-upload input → a single **"Thêm ảnh"** button opening the picker (`multiple`). Confirm
  → `POST .../media/attach { media_asset_ids, variant_id? }`. Upload-new = the picker's "Tải
  lên" tab, so one entry point covers reuse + upload.
- Per-card controls stay: variant dropdown (retag), reorder, **remove → "Gỡ" (detach)**.

### Standalone Media Library page (`/admin/media`)
- New nav item **"Thư viện ảnh"** (catalog group, `ImageIcon`); route under the admin shell,
  lazy-loaded like the other admin pages.
- Full-page `MediaGrid` (shared with the modal) + search/filter/pagination + Upload button.
- Per asset: usage ("Đang dùng bởi N nơi"), edit `alt_text`, delete (a `409 MEDIA_IN_USE`
  surfaces the count in a toast).

### Category form (`AdminCategoriesPage`)
- Image upload → the same picker (`multiple={false}`) — selecting sets `media_asset_id`; shows
  current thumbnail + "Đổi ảnh" / "Gỡ".

### Structure
- New feature module `src/features/admin/media/`: `api.js` (`listMedia`, `uploadMedia`,
  `updateMediaAlt`, `deleteMedia`) + `hooks.js` (offset `useMediaLibrary`, `useUploadMedia`,
  `useUpdateMediaAsset`, `useDeleteMediaAsset`). Product **attach** lives in the existing
  products feature (`attachMedia` + `useAttachMedia`) alongside detach/retag/reorder.
- Shared subcomponents `MediaGrid` + `MediaUploadDropzone` (single source of truth for both
  the modal and the page). Empty/error via `EmptyState` + toasts.

### FE tests
- Picker: grid renders, search filters, tab switch, multi-select `onSelect` payload,
  upload→auto-select.
- Library page: lists, edit alt, delete-in-use → blocked toast with count.
- Product edit: "Thêm ảnh" → attach called with asset ids; "Gỡ" → detach.
- Category form: pick → `media_asset_id` set on submit.

---

## Verification checklist
- BE: new media + regression suites green (sqlite `:memory:` Docker image); backfill migration
  test green.
- FE: `npm run lint` clean; `npm test -- --run` green (new + regression); `npm run build` exit 0.
- Docs: update BE `docs/FE_AI_CONTEXT.md` (new media endpoints, `MediaAssetResource`,
  `ProductMediaResource.media_asset_id`, category `media_asset_id`, attach/detach semantics).
- Manual (user, after migration + deploy): upload once → reuse on a 2nd product from the
  library; detach from one product leaves it usable elsewhere; delete-in-use is blocked; a
  category image set from the library renders on the storefront.
