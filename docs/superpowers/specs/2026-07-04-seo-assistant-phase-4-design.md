# SEO Assistant — Phase 4: Sinh SEO hàng loạt (bulk generation)

**Ngày:** 2026-07-04
**Trạng thái:** Đã duyệt, đang triển khai
**Tiền đề:** Nối tiếp Phase 0-3 (per-field + score + tone + variations + from-images). Ở lại Vertex/Gemini `gemini-2.5-flash`, thinkingBudget=0.

## Mục tiêu

Cho phép admin sinh mô tả + meta SEO cho **nhiều sản phẩm cùng lúc** (nền, qua queue), kết quả **đáp vào bảng staging** để admin **duyệt từng SP** rồi mới ghi lên sản phẩm thật. Không chạm dữ liệu thật cho tới khi Áp dụng.

## Quyết định thiết kế (chốt từ brainstorming)

1. **Mô hình duyệt:** bảng staging `product_seo_drafts` + duyệt từng SP (an toàn nhất).
2. **Phạm vi:** cả hai — nút "Sinh cho SP thiếu SEO" (tự quét) **và** chọn tay danh sách id.
3. **Trường sinh:** `field=all` (mô tả + meta_title + meta_description + focus_keyword), tái dùng `ProductDescriptionGenerator::generate($input, 'all')`.
4. **Queue:** `Bus::batch` các job-per-SP + `RateLimited('ai-seo')` 10/phút + backoff 429. `job_batches` cho tiến độ.

## Data model

### Migration `product_seo_drafts`
| cột | kiểu | ghi chú |
|---|---|---|
| id | bigint PK | |
| product_id | FK products cascade, **unique** | 1 bản nháp sống/SP, upsert khi sinh lại |
| batch_id | string nullable | liên kết `job_batches.id` |
| status | string | `pending` \| `applied` \| `failed` \| `dismissed` |
| description | text nullable | |
| meta_title | string nullable | |
| meta_description | string(500) nullable | |
| focus_keyword | string nullable | |
| error | text nullable | thông báo lỗi khi `failed` |
| generated_at | timestamp nullable | |
| timestamps | | |

### `job_batches` — đã có sẵn trong migration gốc `create_jobs_table` (không cần thêm)

### Model `ProductSeoDraft`
- `belongsTo(Product)`; `Product::seoDraft()` → `hasOne(ProductSeoDraft)`.
- fillable: product_id, batch_id, status, description, meta_title, meta_description, focus_keyword, error, generated_at.
- casts: generated_at → datetime.

## Backend

### `App\Jobs\GenerateSeoDraftJob` (ShouldQueue, Batchable)
- Nhận `int $productId`.
- `tries=3`, `backoff()` = `[30, 60, 120]`.
- `middleware()` = `[new RateLimited('ai-seo')]`.
- `handle(ProductDescriptionGenerator $generator)`:
  - Nếu batch đã cancel → return.
  - Load product (kèm category, media). Nếu không tồn tại → return.
  - Build input từ product: `name`, `category` = category?->name, `attributes` = product->attributes, `keyword` = product->focus_keyword, `description` = product->description (ngữ cảnh), `image_urls` = media type=image → url (tối đa 4, generator tự allowlist Cloudinary).
  - `$result = $generator->generate($input, 'all')`.
  - `updateOrCreate(['product_id'=>id], [... field từ result, status=pending, batch_id=$this->batch()?->id, generated_at=now(), error=null])`.
- `failed(Throwable $e)`: `updateOrCreate(['product_id'=>id], [status=failed, error=Str::limit($e->getMessage()), batch_id, generated_at=now()])`.
- Trong `handle`, lỗi AI (RuntimeException từ generator) ném ra → Laravel retry theo backoff; hết tries → `failed()`.

### RateLimiter
`AppServiceProvider::configureRateLimiters()` thêm:
```php
RateLimiter::for('ai-seo', fn () => Limit::perMinute(10));
```

### `App\Http\Controllers\Admin\BulkSeoController`
Đặt trong nhóm `check.permission:manage_products`, prefix `products/seo`.

- `POST products/seo/bulk` — body `{scope:'missing'|'selected', product_ids?:int[]}`
  - `missing`: `Product::active()->where(fn=> whereNull meta_title orWhereNull meta_description)->whereDoesntHave('seoDraft', status=pending)->pluck('id')`.
  - `selected`: validate `product_ids` (exists), loại SP đã có draft pending.
  - Rỗng → `{batch_id:null, queued:0}`.
  - `Bus::batch(ids->map(fn id => new GenerateSeoDraftJob(id)))->name('seo-bulk')->allowFailures()->dispatch()`.
  - Trả `{data:{batch_id, queued}}`.
- `GET products/seo/drafts?status=pending|failed` (default pending) — list draft + product(name, thumbnail=first image media url) + seoScore tính ở FE. Paginate 20.
- `POST products/{product}/seo/draft/apply` — lấy draft pending/failed của product; ghi các field **có giá trị** lên product (`fill` + save); draft.status=applied. 404 nếu không có draft.
- `POST products/{product}/seo/draft/dismiss` — draft.status=dismissed.
- `GET products/seo/bulk/{batchId}` — `Bus::findBatch(id)` → `{total, pending, processed, failed, finished}`; 404 nếu không thấy.

Request validation qua FormRequest `BulkSeoRequest` (scope in-list, product_ids array of exists).

### Routes (routes/api.php, trong nhóm manage_products)
```
POST   products/seo/bulk
GET    products/seo/drafts
GET    products/seo/bulk/{batchId}
POST   products/{product}/seo/draft/apply
POST   products/{product}/seo/draft/dismiss
```
Không throttle HTTP (đợt sinh do queue + RateLimited kiểm soát).

## Frontend

### Trang "Duyệt SEO" `/admin/products/seo` (`AdminSeoReviewPage.jsx`)
- Tab **Chờ duyệt / Lỗi** (status pending/failed).
- Header: nút **"Sinh cho SP thiếu SEO"** → POST bulk scope=missing → toast `Đã xếp N sản phẩm`; nếu batch_id → poll `GET bulk/{id}` mỗi 3s tới `finished`, hiện thanh tiến độ; xong → refetch drafts.
- Mỗi dòng draft: thumbnail + tên SP + meta_title + meta_description (truncate) + **điểm SEO** (tái dùng `computeSeoScore` từ `lib/seoScore.js`) + nút **Áp dụng** (POST apply → xóa dòng) / **Bỏ** (POST dismiss → xóa dòng) / **Sửa** (link tới `/admin/products/:id` tab Mô tả & SEO). Tab Lỗi hiện `error` + nút **Sinh lại** (bulk scope=selected 1 id).
- Empty state khi không có draft.

### Trang list SP (`AdminProductsPage` hiện có)
- Thêm cột checkbox multi-select + thanh hành động khi có chọn: **"Sinh SEO ({n})"** → POST bulk scope=selected, product_ids → toast + link "Xem màn duyệt".

### `features/admin/seo/api.js` + `hooks.js`
- `bulkGenerateSeo({scope, product_ids})`, `getSeoDrafts(status)`, `getSeoBatch(batchId)`, `applySeoDraft(productId)`, `dismissSeoDraft(productId)`.
- hooks: `useSeoDrafts(status)`, `useBulkGenerateSeo()`, `useApplyDraft()`, `useDismissDraft()`, `useSeoBatch(batchId, enabled)`.

### Nav
Thêm mục "Duyệt SEO" vào sidebar admin (dưới Sản phẩm) — chỉ khi có quyền manage_products.

## Throttle / quota
database queue + 1 worker (đã có ở prod) + `RateLimited('ai-seo')` 10/phút + job backoff `[30,60,120]` khi 429/lỗi. Job lỗi sau 3 lần → draft `failed`, hiện tab "Lỗi", admin **Sinh lại** được. `allowFailures()` để 1 SP lỗi không dừng cả batch.

## Testing

### BE (`ProductSeoBulkTest.php`)
- migration chạy, model quan hệ.
- `GenerateSeoDraftJob`: Http::fake success → draft pending, field đúng, image_urls Cloudinary từ media; lỗi generator → `failed()` ghi draft failed + error.
- bulk controller: `Bus::fake`; scope=missing chọn đúng SP thiếu meta + loại SP đã có draft pending + assertBatched count; scope=selected; rỗng → queued 0 không dispatch.
- apply: ghi field lên product + status applied; chỉ ghi field có giá trị; 404 khi không draft.
- dismiss: status dismissed.
- drafts list: trả pending mặc định, lọc failed.
- authz: non-permission user 403.

### FE
- `AdminSeoReviewPage.test.jsx`: render draft pending, hiện điểm SEO; Áp dụng gọi API + xóa dòng; Bỏ; nút "Sinh cho SP thiếu SEO" gọi bulk missing; tab Lỗi hiện error + Sinh lại.
- list page: multi-select + bulk "Sinh SEO" gọi API scope=selected.

## Docs
- `docs/FE_AI_CONTEXT.md`: thêm 5 endpoint bulk + bảng draft + luồng duyệt.

## Ngoài phạm vi (YAGNI)
- Không lịch tự động (cron) sinh SEO — chỉ admin bấm.
- Không version/lịch sử nhiều draft/SP — 1 draft sống, upsert.
- Không sinh embedding trong đợt này (chỉ description/meta) — tránh 429 embedding quota.
