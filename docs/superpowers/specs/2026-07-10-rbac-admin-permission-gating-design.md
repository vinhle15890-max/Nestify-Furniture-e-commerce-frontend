# RBAC — Khai thác permission ở admin FE (Sub-project 1)

**Ngày:** 2026-07-10
**Trạng thái:** Đã duyệt thiết kế
**Phạm vi:** Bước 1 của lộ trình RBAC 5 sub-project. Cross-repo (BE + FE).

## Bối cảnh & mục tiêu

RBAC của Nestify **đã enforce chặt ở BE**: mọi route `admin/*` bọc middleware
`check.permission:<slug>` + `Gate::before` (super_admin bypass). Nhưng FE **gần như không dùng
permission**: `AdminRoute` chỉ chặn theo `isStaff` (role ≠ customer), sidebar `AdminLayout`
hiển thị **mọi** mục cho **mọi** staff. Hệ quả: một `order_staff` (chỉ có `manage_orders` +
`view_dashboard`) vẫn thấy "Voucher", "Danh mục", "Nhân viên"… bấm vào mới ăn 403 từ server.
RBAC trở nên "vô hình" và UX rối.

**Mục tiêu SP1:** FE *thực sự dùng* permission — ẩn/hiện menu và nút hành động theo đúng quyền
user, chặn sớm thay vì để ăn 403, mà không nới lỏng lớp enforce BE (BE vẫn là nguồn chân lý).
Đây cũng là nền dữ liệu (permission phẳng) cho các sub-project sau (ma trận Role×Permission,
audit, role preview).

### Vòng đời RBAC — SP1 thắp sáng mắt xích 4 (UI thích ứng theo quyền)
1. Định nghĩa permission → 2. Gom role → 3. Gán role → **4. Người hành động, UI thích ứng (SP1)**
→ 5. Ghi vết → 6. Rà soát.

### Ràng buộc giữ nguyên (guardrail)
- **Chưa commit** cho tới khi user yêu cầu.
- BE vẫn là nguồn enforce chân lý; FE gating chỉ là lớp UX, **không thay thế** BE 403.
- `cloudinary_id` / `preview_public_id` **không serialize** (không đụng ở SP1, nhắc để khỏi hồi quy).
- UI admin dùng palette `[data-theme='legacy']` + semantic token; **không** đụng storefront Design DNA.
- **Không thêm dependency mới** (react-router-dom, zustand đã có).
- Không có cột `role` trên `users`; vai trò qua pivot `user_role`. `isStaff` = có ≥1 role ≠ customer.

## Kiến trúc & luồng dữ liệu

```
BE: user.roles.permissions ──union──► UserResource.permissions[]  (super_admin ⇒ tất cả slug)
                                              │  /auth/me, /auth/login
                                              ▼
FE: authStore.user.permissions[] ──► can(user, slug) / canAny(user, slugs)  (lib/roles.js)
                                              │
        ┌─────────────────────────────────────┼───────────────────────────────┐
        ▼                                      ▼                               ▼
  Sidebar lọc theo nav→permission      RequirePermission (route)        Nút Refund gate
  (adminNav.js, nguồn dùng chung)      + AdminHome index redirect       (can('refund'))
```

## Mô hình dữ liệu & hợp đồng

### BE — `UserResource` thêm `permissions`
- `UserResource::toArray` thêm khóa `permissions`: **mảng slug phẳng** = union permission của mọi
  role user. Dùng `whenLoaded('roles', …)` để chỉ tính khi roles đã nạp; khi chưa nạp thì **bỏ
  khóa** (không trả `[]` để tránh FE hiểu nhầm "không có quyền nào").
- **Super_admin ⇒ toàn bộ permission slug** trong bảng `permissions` (mirror `Gate::before`), KHÔNG
  chỉ union pivot — tránh lệch khi thêm permission mới mà quên re-sync super_admin. Kỹ thuật: nếu
  `roles` chứa role tên `super_admin` → trả `Permission::pluck('slug')`; ngược lại → union
  `roles->flatMap(fn(r) => r.permissions->pluck('slug'))->unique()->values()`.
- Eager-load: `LoginController::me` và nhánh trả user ở `login` đổi `->load('roles')` thành
  `->load('roles.permissions')` (tránh N+1 khi tính union). Các nơi khác dựng `UserResource` mà
  KHÔNG nạp roles vẫn hoạt động (khóa `permissions` vắng mặt nhờ `whenLoaded`).

**Hợp đồng mới (`/auth/me`, `/auth/login`):** `user.permissions: string[]` — ví dụ
`["manage_orders","view_dashboard"]`; super_admin nhận đủ 10 slug. Các khóa cũ (`roles`,
`role_ids`, …) **giữ nguyên**.

### FE — `authStore`
Không đổi cấu trúc store: `permissions` nằm trong `user` (persist theo `user` sẵn có). Sau login/
refetch `/auth/me`, `user.permissions` tự có.

## Thành phần

### 1. `src/lib/roles.js` — helper quyền
- `can(user, slug)` → `Boolean(user?.permissions?.includes(slug))`.
- `canAny(user, slugs)` → `slugs.some((s) => can(user, s))`.
- Giữ nguyên `isStaff(user)`.
- Không phụ thuộc React (thuần hàm, dễ test). Không cần đặc biệt hóa super_admin ở FE — BE đã trả
  đủ slug cho super_admin nên `can` tự đúng.

### 2. `src/pages/admin/adminNav.js` — cấu hình điều hướng dùng chung (MỚI)
Tách `navGroups` ra khỏi `AdminLayout.jsx` thành nguồn chân lý duy nhất, mỗi item gắn quyền:

| Mục | `to` | permission |
|---|---|---|
| Tổng quan | `/admin` | `view_dashboard` |
| Danh mục | `/admin/categories` | `manage_categories` |
| Sản phẩm | `/admin/products` | `manage_products` |
| Duyệt SEO | `/admin/products/seo` | `manage_products` |
| Thư viện ảnh | `/admin/media` | `manage_products` |
| Đơn hàng | `/admin/orders` | `manage_orders` |
| Voucher | `/admin/vouchers` | `manage_vouchers` |
| Đánh giá | `/admin/reviews` | `moderate_reviews` |
| Nhân viên | `/admin/employees` | `manage_users` |
| Khách hàng | `/admin/customers` | `manage_users` |
| Nhật ký | `/admin/audit-logs` | `view_audit` |

- Mỗi item: `{ to, label, icon, end?, permission?, anyOf? }`. Item không khai báo quyền ⇒ luôn hiện
  (không có ở SP1 nhưng để mở).
- Export thêm helper `visibleGroups(user)` (lọc item theo `can`/`canAny`, bỏ group rỗng) và
  `firstAllowedPath(user)` (path đầu tiên user có quyền, theo thứ tự khai báo; `null` nếu không có).
- `AdminLayout` import `visibleGroups(user)` thay cho hằng `navGroups` cũ; sidebar chỉ render group/
  item còn lại. Group rỗng **ẩn cả tiêu đề**.

### 3. `src/routes/RequirePermission.jsx` — chặn route (MỚI)
- `<RequirePermission slug | anyOf>` → nếu `can/canAny` đúng: render `<Outlet />` (dùng như layout
  route) hoặc `children`; nếu sai: render `<PermissionDenied missing={…} />` (KHÔNG redirect — giữ
  ngữ cảnh URL, đúng lựa chọn "kết hợp").
- Bọc từng route con admin trong `router.jsx` bằng `RequirePermission` tương ứng (dựa cùng bảng
  trên). Với route con dùng chung quyền cha (vd `products`, `products/new`, `products/:id`,
  `products/seo` đều `manage_products`) có thể nhóm dưới một route layout `RequirePermission`.

### 4. `src/pages/admin/PermissionDenied.jsx` — trang 403 (MỚI)
- Thông báo thân thiện: "Bạn không có quyền truy cập mục này" + tên quyền còn thiếu (map slug →
  nhãn tiếng Việt, tái dùng bảng nhãn permission), semantic token, `[data-theme='legacy']`.
- Liệt kê link tới các mục user CÓ quyền (từ `visibleGroups(user)`); nếu rỗng → gợi ý liên hệ quản
  trị. Không dùng màu storefront DNA.

### 5. `src/pages/admin/AdminHome.jsx` — index redirect (MỚI, thay element `index`)
- Element cho `{ index: true }` của `/admin`.
- `can(user, 'view_dashboard')` → render `<AdminDashboardPage />`.
- Ngược lại → `<Navigate replace to={firstAllowedPath(user)} />`; nếu `firstAllowedPath` là `null`
  (staff không có quyền admin nào) → `<PermissionDenied />`.
- Đây là nhánh "tự nhảy" của lựa chọn kết hợp: chỉ áp ở **trang chủ /admin**, còn deep-link vào mục
  cụ thể thì hiện 403 (mục 3).

### 6. Gating nút hành động — Refund
- Mô hình quyền: có quyền vào 1 mục ⇒ làm được mọi thao tác trong mục đó (không có tầng read-only).
  Ngoại lệ **duy nhất**: nút **Hoàn tiền** trong `AdminOrderDetailPage` — trang cần `manage_orders`
  nhưng refund là permission `refund` riêng.
- Ẩn (không chỉ disable) nút/hành động Refund khi `!can(user, 'refund')`. Các nút khác trong một
  mục không cần gate riêng ở SP1.

## Xử lý lỗi / edge case
- **User cũ trong localStorage chưa có `permissions`** (persist từ trước): `can` trả `false` cho mọi
  slug cho tới khi đồng bộ xong. `AdminLayout` gọi `useMe()` khi mount và `setUser` store bằng dữ
  liệu mới nhất từ `/auth/me` (cùng pattern với `AccountPage`), nên phiên cũ tự nạp `permissions`
  ngay khi vào `/admin` — chỉ chớp nhoáng tới khi request trả về, không cần migration store.
- **super_admin**: nhận đủ slug ⇒ thấy mọi mục, mọi nút. Đúng kỳ vọng.
- **Deep-link mục thiếu quyền**: 403 page, không nhảy. **Trang chủ /admin thiếu view_dashboard**:
  nhảy tới mục đầu hợp lệ. Hai hành vi khác nhau là chủ ý (lựa chọn "kết hợp").
- **Đổi role khi đang mở tab**: cần refetch `/auth/me` để cập nhật; không xử lý realtime ở SP1.
- FE gating bị bypass (sửa JS trong trình duyệt) **không phải lỗ hổng** — BE 403 vẫn chặn thật.

## Kiểm thử

### BE (`docker compose exec app php artisan test --filter=…`)
- `UserResource` trả `permissions` = union đúng cho user thường (vd order_staff → chính xác 2 slug).
- Super_admin → trả **đủ** slug trong bảng `permissions` (kể cả slug không sync vào role nào khác).
- `/auth/me` và `/auth/login` có khóa `permissions`; **không** làm lộ `preview_public_id`/
  `cloudinary_id` ở bất kỳ resource nào (giữ nếp).
- Không N+1: roles.permissions được eager-load (khẳng định bằng cấu trúc, không cần đếm query).

### FE (Vitest + RTL)
- `roles.js`: `can`/`canAny` đúng với user có/không có slug, user `undefined`, `permissions` vắng.
- `adminNav.js`: `visibleGroups` lọc đúng theo role mẫu (order_staff chỉ còn Tổng quan + Đơn hàng;
  moderator chỉ Tổng quan + Đánh giá; super_admin đủ); `firstAllowedPath` đúng thứ tự; group rỗng
  bị loại.
- `AdminLayout`: render sidebar theo user mock → không thấy mục thiếu quyền, không thấy tiêu đề
  group rỗng.
- `RequirePermission`: có quyền → render children; thiếu quyền → `PermissionDenied` (không redirect).
- `AdminHome`: có `view_dashboard` → dashboard; thiếu nhưng có mục khác → `<Navigate>` tới đúng path;
  không có mục nào → `PermissionDenied`.
- `AdminOrderDetailPage`: nút Refund ẩn khi thiếu `refund`, hiện khi có.

## Ngoài phạm vi (để sub-project sau)
- `GET /admin/permissions` + CRUD role động → **SP2**.
- Ma trận Role × Permission (Trung tâm Phân quyền) → **SP3 (D1)**.
- Audit gắn permission + log 403 bị chặn → **SP4 (D2)**.
- "Xem với vai trò" (role preview) → **SP5 (D4)**.
- Cấp quyền tạm thời / override theo user (D3) → phase nâng cao, chưa lên lịch.
- Tầng read-only trong từng mục (view vs manage tách biệt) → không thuộc mô hình quyền hiện tại.
