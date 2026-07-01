# Personalization Storefront — Design Spec

**Date:** 2026-06-30
**Scope:** Storefront personalization cho khách hàng đã đăng nhập (recently viewed, category suggestions, "Bạn vừa xem" trên Product page, contextual greeting).
**Repos:** Nestify FE (React) + BE (Laravel).

## 1. Mục tiêu & ràng buộc

- Cá nhân hoá storefront cho **khách hàng đã đăng nhập** (role = customer).
- **Không** track cho guest. **Không** hiển thị cho admin/staff (nhất quán rule "staff không mua hàng").
- Tái dùng bảng `audit_logs` sẵn có làm nơi lưu lịch sử xem — không tạo bảng mới.
- Giữ nguyên design tokens (Warm Luxury Editorial). Không thêm token mới.
- Không commit cho tới khi được yêu cầu.

## 2. Kiến trúc dữ liệu (BE)

### 2.1 Ghi sự kiện xem
- `POST /api/products/{slug}/view` — middleware `auth:sanctum` + `verified`.
- Insert 1 dòng `audit_logs`: `user_id=<me>`, `action='product_viewed'`, `entity_type='product'`, `entity_id=<product.id>`, `new_values=null`.
- **Không lưu snapshot** sản phẩm — dữ liệu lấy sống lúc đọc (giá/ảnh luôn mới; sản phẩm archived tự biến mất).
- Slug không tồn tại → `404`. Thành công → `204`.
- FE chỉ gọi khi user là customer đăng nhập (fire-and-forget).

### 2.2 Đọc lịch sử
- `GET /api/me/recently-viewed?limit=10` — middleware `auth:sanctum` + `verified`.
- Query (Postgres):
  ```sql
  SELECT p.* FROM (
    SELECT DISTINCT ON (entity_id) entity_id, created_at
    FROM audit_logs
    WHERE user_id = ? AND action = 'product_viewed' AND entity_type = 'product'
    ORDER BY entity_id, created_at DESC
  ) v
  JOIN products p ON p.id = v.entity_id AND p.status = 'active'
  ORDER BY v.created_at DESC
  LIMIT ?
  ```
- Trả về **đúng shape như `GET /products`** items (id, name, slug, thumbnail, base_price, category {slug,name}) để FE tái dùng `ProductCard` + derive category.

### 2.3 Gợi ý theo danh mục
- Không có endpoint mới. FE lấy `category.slug` xuất hiện nhiều nhất trong recently-viewed → gọi `GET /products?filter[category]=X` (đã có).

### 2.4 Index
- Migration mới: index `audit_logs (user_id, action, entity_id, created_at DESC)` hỗ trợ DISTINCT ON.

### 2.5 Filter admin audit
- `AuditLogService::list` loại bỏ các action thuộc nhóm hành vi khách hàng.
- Thêm hằng số `BEHAVIORAL_ACTIONS = ['product_viewed']` (dễ mở rộng) → `whereNotIn('action', BEHAVIORAL_ACTIONS)`.

## 3. Surfaces FE

**Điều kiện hiển thị chung:** `token && !isStaff(user)`. Guest + admin không thấy.

### 3.1 Feature folder mới — `src/features/personalization/`
- `api.js`: `recordProductView(slug)`, `getRecentlyViewed(limit)`.
- `hooks.js`: `useRecordProductView()` (mutation, fire-and-forget), `useRecentlyViewed(limit)` (query).

### 3.2 Components
1. **`PersonalizedGreeting`** — "Chào mừng trở lại, {tên}" + dòng phụ theo có/không lịch sử. Chèn đầu HomePage (không thay Hero).
2. **`RecentlyViewedStrip`** — grid/carousel ngang `ProductCard`, tiêu đề "Bạn vừa xem". Prop `excludeSlug`. Ẩn (null) nếu rỗng.
3. **`SuggestedForYou`** — derive top category từ recently-viewed → `useInfiniteProducts({ category })`, loại sản phẩm đã xem, tiêu đề "Gợi ý cho bạn". Ẩn nếu thiếu dữ liệu.
4. **`PersonalizedSection`** — gom Greeting + RecentlyViewedStrip + SuggestedForYou; tự ẩn nếu không phải customer đăng nhập. Chèn giữa `<Hero />` và `<FeaturedCategories />` trong `HomePage`.

### 3.3 ProductPage
- Tái dùng `RecentlyViewedStrip` với `excludeSlug={productSlug}`, đặt cuối trang (sau reviews), chỉ render cho customer đăng nhập.
- Ghi view: `useRecordProductView()` trong `useEffect` khi `product.id` có + là customer đăng nhập.

## 4. Error handling

- `recordProductView`: lỗi → nuốt im lặng, không toast, không chặn render.
- `useRecentlyViewed` / suggestions lỗi hoặc rỗng → component trả null, không hiện lỗi.
- Mọi lỗi vẫn qua `ApiError` chuẩn; không raw error.
- BE `POST /view` với product archived → vẫn ghi bình thường; lọc lúc đọc bằng `status='active'`.

## 5. Testing

### FE (Vitest + RTL, TDD)
- `personalization/api` + `hooks`: mock `apiClient`, verify URL/params.
- `RecentlyViewedStrip`: render list; rỗng → null; loại `excludeSlug`.
- `SuggestedForYou`: derive đúng top category; loại sản phẩm đã xem; thiếu dữ liệu → null.
- `PersonalizedGreeting`: đúng tên + dòng phụ theo lịch sử.
- `PersonalizedSection`: ẩn khi guest/admin; hiện khi customer đăng nhập.
- `ProductPage`: gọi `recordProductView` đúng 1 lần khi customer; không gọi khi guest/admin.

### BE (PHPUnit, sqlite :memory:)
- `POST /view`: tạo audit_log đúng action/entity; guest → 401.
- `GET /me/recently-viewed`: dedup theo entity_id, đúng thứ tự, lọc archived, tôn trọng `limit`.
- `AuditLogService`: không trả `product_viewed` trong danh sách admin.

> Lưu ý: query DISTINCT ON là Postgres-specific. Test BE chạy sqlite → cần đường viết tương thích (hoặc skip phần DISTINCT ON trên sqlite, hoặc dùng query builder portable). Xác định lúc implement.

## 6. Docs cập nhật (sau khi code — rule keep-docs-in-sync)

- BE: `docs/14-workflows.md` (luồng mới) + `docs/FE_AI_CONTEXT.md` (2 endpoint).
- FE: `FE-TEAM-WORKFLOW.md` + spec này.
