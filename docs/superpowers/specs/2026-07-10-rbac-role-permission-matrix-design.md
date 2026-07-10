# RBAC — Ma trận Role×Permission (Sub-project 3 / D1)

**Ngày:** 2026-07-10
**Trạng thái:** Đã duyệt thiết kế
**Phạm vi:** Bước 3 của lộ trình RBAC 5 sub-project. **Thuần Frontend** (không đụng BE). Dựa trên SP1 (permission gating) + SP2 (role động).

## Bối cảnh & mục tiêu

Sau SP2, admin đã tạo/sửa/xoá role và tinh chỉnh quyền — nhưng chỉ **từng role một** (qua `RoleFormDialog`).
Không có góc nhìn **toàn cảnh**: "role nào có quyền gì" trên cùng một màn hình. Khi số role tăng, việc so sánh
chéo (ai có `refund`? role nào đụng `manage_users`?) phải mở lần lượt từng dialog.

**Mục tiêu SP3:** một **ma trận đọc** (hàng = role, cột = permission, ô = có/không quyền) cho admin thấy tức thì
bức tranh phân quyền. Đây là mắt xích "quan sát/kiểm tra" của vòng đời RBAC, và là nền trực quan cho SP4 (audit)
và SP5 (xem-với-vai-trò).

### Ràng buộc giữ nguyên (guardrail)
- **Chưa commit** cho tới khi user yêu cầu.
- **Thuần FE** — KHÔNG endpoint BE mới, KHÔNG migration, KHÔNG đụng resource/serialize (giữ nếp
  `cloudinary_id`/`preview_public_id` không lộ — không liên quan nhưng không phá).
- BE vẫn là nguồn enforce chân lý; ma trận chỉ **đọc**, mọi thay đổi quyền đi qua đường-ghi đã kiểm thử của SP2.
- Gate dưới `manage_users` sẵn có (route `/admin/roles` đã bọc `RequirePermission slug="manage_users"`).
- FE plain JS (JSX), không TS; không thêm dependency; admin theme `[data-theme='legacy']`; copy VN; semantic token.

## Quyết định thiết kế đã chốt
1. **Chế độ:** ma trận **chỉ đọc**, có **lối tắt Sửa** mở `RoleFormDialog` (SP2) cho từng role. KHÔNG viết
   đường-ghi mới, KHÔNG tick-chỉnh-tại-ô — tránh trùng lặp logic ghi và giữ rủi ro thấp.
2. **Vị trí:** **toggle `Bảng | Ma trận`** ngay trên `AdminRolesPage` (`/admin/roles`). Cùng dữ liệu, cùng nav,
   KHÔNG thêm route/menu mới. State chế độ là cục bộ (`useState`), không cần URL param.
3. **Nguồn dữ liệu:** tái dùng `useRoles` (`features/admin/users/hooks` — đã trả `permissions: string[]`,
   `locked`, `users_count` từ SP2) cho hàng, và `usePermissions` (`features/admin/roles/hooks` — trả toàn bộ
   `{ slug, display_name }`) cho cột. KHÔNG gọi API mới.
4. **Ẩn `customer`** khỏi ma trận: nó là baseline non-staff, 0 quyền admin → chỉ là hàng rỗng gây nhiễu. Hiện
   mọi role còn lại (super_admin + role nghề + role custom).
5. **Hàng `super_admin`:** hiển thị đủ quyền (data seed cho nó toàn bộ slug) + ghi chú nhỏ "toàn quyền (bypass)"
   để nhắc nó bypass qua `Gate::before` bất kể ô.

## Kiến trúc & component

Không có thay đổi BE. Toàn bộ nằm trong FE, dưới `src/pages/admin/roles/`.

### `AdminRolesPage.jsx` (mở rộng)
- Thêm state `view` (`'table' | 'matrix'`, mặc định `'table'`).
- Thêm toggle 2 nút trong vùng `actions`/dưới `PageHeader` (cạnh nút "Tạo vai trò"): "Bảng" / "Ma trận".
- Khi `view === 'matrix'` → render `<RolePermissionMatrix roles={roles} onEdit={setEditing} />` trong `Panel`
  thay cho bảng list. `RoleFormDialog` + confirm-xoá Modal giữ nguyên (dùng chung cho cả 2 view).
- `useRoles` đã gọi sẵn ở page; truyền `roles` xuống matrix (matrix không tự fetch — page là nơi lấy data).

### `RolePermissionMatrix.jsx` (MỚI)
- Props: `roles` (mảng role đã lọc bỏ customer — lọc ngay trong matrix để page không phải biết), `onEdit(role)`.
- Gọi `usePermissions()` để lấy cột; `isLoading` → `Spinner`; rỗng → `EmptyState`.
- Render `<table>`:
  - **Cột đầu (role) sticky trái** (`sticky left-0`), nền `bg-surface` để không bị chữ cột trôi đè.
  - Header cột = nhãn VN gọn (`PERMISSION_LABELS[slug] ?? display_name`), kèm `title={display_name || slug}`
    (tooltip đầy đủ). Nếu cần gọn, cho header xoay/dọc là tuỳ chọn CSS — không bắt buộc.
  - Mỗi hàng: ô role (tên + `name` mờ + badge "Hệ thống" nếu `locked` + nút **Sửa** `aria-label="Sửa vai trò {display_name}"`
    mở `onEdit(role)`); rồi mỗi cột: `role.permissions.includes(slug)` → icon `Check` (`text-foreground`),
    ngược lại → `–` (`text-muted-foreground`). Ô có quyền thêm `aria-label`/`title` = "{role} có quyền {permission}"
    để đọc được & test được.
  - Hàng `super_admin`: dưới tên thêm dòng nhỏ "Toàn quyền (bypass)".
  - Tràn ngang → bọc `overflow-x-auto` (10 cột × nhiều role).
- Chỉ đọc: KHÔNG có checkbox/onChange trên ô. Đổi quyền = nút Sửa → `RoleFormDialog`.

### Không đổi
- `RoleFormDialog` (SP2) tái dùng nguyên trạng cho lối tắt Sửa (locked → chỉ xem).
- Nav, route, BE, seeder: không đụng.

## Xử lý lỗi / edge case
- `usePermissions` lỗi/đang tải → Spinner (đang tải) hoặc thông báo lỗi qua `ApiError.message` (message VN sẵn).
- Role có `permissions` rỗng (role "rỗng quyền" hợp lệ từ SP2) → hàng toàn dấu `–`. Không chặn.
- Permission mới thêm ở BE mà chưa role nào giữ → cột toàn `–`. Đúng, không lỗi.
- `super_admin` nếu (giả định) data không đủ slug: vẫn hiện đúng theo `permissions` của nó; ghi chú "bypass" là
  lời nhắc ngữ nghĩa, KHÔNG suy diễn tick tất cả — tránh nói dối dữ liệu.
- Màn hình hẹp: sticky cột role + scroll ngang; không cố nhồi 10 cột vào viewport nhỏ.

## Kiểm thử (FE — Vitest + RTL)
- **`RolePermissionMatrix`**:
  - Render số cột = số permission trả về; mỗi cột có nhãn.
  - Role có `manage_orders` → ô giao với cột đó là trạng thái "có quyền" (assert qua `aria-label`/`title`
    "… có quyền …" hoặc icon Check hiện diện); role không có → không.
  - `super_admin` hiển thị ghi chú "bypass".
  - Click nút "Sửa vai trò {name}" → gọi `onEdit` với đúng role.
  - `customer` KHÔNG xuất hiện trong ma trận.
- **`AdminRolesPage`** (bổ sung): toggle sang "Ma trận" → render matrix (kiểm 1 phần tử đặc trưng của matrix
  xuất hiện); toggle về "Bảng" → bảng list quay lại. Giữ các test SP2 hiện có xanh.
- KHÔNG có BE test mới (không đụng BE).

## Ngoài phạm vi (SP sau / YAGNI)
- Tick-chỉnh-quyền ngay trên ô ma trận (đường-ghi mới) → loại: đã có `RoleFormDialog`.
- Lọc/tìm theo permission, tô sáng cột, xuất CSV → chưa cần (YAGNI); thêm sau nếu số role/permission lớn.
- Audit UI + log 403 bị chặn → **SP4**. "Xem với vai trò" → **SP5**. Cấp quyền lẻ/tạm cho user → D3 nâng cao.
- Endpoint tổng hợp ma trận riêng ở BE → không cần: 2 endpoint sẵn có đủ dữ liệu.
