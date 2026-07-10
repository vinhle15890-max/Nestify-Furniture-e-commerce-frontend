# RBAC — Quản lý role động (Sub-project 2)

**Ngày:** 2026-07-10
**Trạng thái:** Đã duyệt thiết kế
**Phạm vi:** Bước 2 của lộ trình RBAC 5 sub-project. Cross-repo (BE + FE). Dựa trên nền SP1.

## Bối cảnh & mục tiêu

Sau SP1 (FE khai thác permission: sidebar/route/nút theo quyền), role & permission-set vẫn **cứng
trong `RolePermissionSeeder`** — muốn thêm role mới hay đổi quyền của một role phải sửa seeder + chạy
lại. `RoleController` mới chỉ có `index` (GET /admin/roles); `RoleResource` chưa serialize permission;
chưa có `GET /admin/permissions`.

**Mục tiêu SP2:** cho admin **tạo/sửa/xoá role và tinh chỉnh tập permission ngay trên UI**, không cần
sửa code/seeder. Đây là mắt xích 1–2 (định nghĩa & gom quyền) của vòng đời RBAC, và là nền dữ liệu cho
SP3 (ma trận Role×Permission).

### Ràng buộc giữ nguyên (guardrail)
- **Chưa commit** cho tới khi user yêu cầu.
- `cloudinary_id`/`preview_public_id` không serialize (không đụng, giữ nếp).
- BE là nguồn enforce chân lý; role CRUD gate dưới `manage_users` (tái dùng, KHÔNG thêm permission mới).
- FE plain JS (JSX), không TS; không thêm dependency; admin theme `[data-theme='legacy']`; copy VN.
- **KHÔNG có migration** — SP2 dùng bảng sẵn có (`roles`, `role_permission`, `user_role`). User vẫn
  là người chạy seeder trên prod nếu cần.
- 2 role cấu trúc `super_admin` (bypass qua `Gate::before` khớp `name==='super_admin'`) và `customer`
  (baseline non-staff) **không được đổi tên/xoá** — code phụ thuộc tên chúng.

## Quyết định thiết kế đã chốt
1. **Mô hình sửa:** `super_admin` + `customer` **hard-lock**. Mọi role khác (5 role nghề seed sẵn +
   role custom mới) **sửa permission & xoá được** qua UI. `locked` suy từ `name ∈ {super_admin, customer}`
   — KHÔNG thêm cột.
2. **Seeder thành "chỉ tạo nếu vắng":** 5 role nghề bỏ `->sync()` permission mỗi lần chạy; chỉ set
   permission khi *lần đầu* tạo. UI thành nguồn chân lý sau seed đầu, deploy không ghi đè chỉnh sửa.
3. **Xoá role đang dùng → 409** (bắt gỡ khỏi user trước), không cascade âm thầm.
4. **`name` bất biến sau khi tạo**; chỉ đổi `display_name` + tập permission khi update.

## BE — dữ liệu & endpoint

Tất cả dưới nhóm route `check.permission:manage_users` hiện có (`routes/api.php`, cạnh `roles` index).

### `PermissionController::index` (MỚI) — `GET /admin/permissions`
- Trả `{ data: [{ slug, display_name }] }` toàn bộ permission (`Permission::orderBy('slug')->get()` qua
  `PermissionResource` mới: chỉ `slug` + `display_name`). Dùng cho ma trận tick ở FE.

### `RoleResource` (mở rộng)
- Thêm: `permissions` (mảng slug — `whenLoaded('permissions', fn() => $this->permissions->pluck('slug'))`),
  `users_count` (`whenCounted('users')`), `locked` (bool = `in_array($this->name, ['super_admin','customer'], true)`).
- Giữ `id`, `name`, `display_name`. `RoleController::index` đổi sang
  `Role::withCount('users')->with('permissions')->orderBy('id')->get()`.

### `RoleController` thêm `store` / `update` / `destroy`
Logic đặt trong **`RoleService` (MỚI)** (tách khỏi controller như `UserService`), ghi `AuditLog` cho
mỗi thao tác (`role.create` / `role.update` / `role.delete`) theo pattern `UserService::assignRoles`.

- **`POST /admin/roles`** (`StoreRoleRequest`): body `display_name` (bắt buộc) + `permissions` (mảng
  slug, mỗi phần tử `exists:permissions,slug`). `name` **tự sinh** = `Str::slug($display_name, '_')`
  (lowercase, underscore), validate **unique** trên `roles.name` (nếu trùng → 422 field `display_name`
  với thông báo VN, hoặc thêm hậu tố số — quyết định lúc build: ưu tiên báo 422 rõ ràng). Tạo role +
  `permissions()->sync(id theo slug)`. Trả `RoleResource` (201).
- **`PATCH /admin/roles/{role}`** (`UpdateRoleRequest`): đổi `display_name` + `permissions` (KHÔNG đổi
  `name`). Nếu `role.locked` → **`ForbiddenException`** (403, "Không thể sửa vai trò hệ thống."). Trả
  `RoleResource`.
- **`DELETE /admin/roles/{role}`**: nếu `role.locked` → 403. Nếu `role->users()->count() > 0` → ném
  **`RoleInUseException(usageCount)`** (MỚI, mirror `MediaInUseException`) → render **409** ở
  `bootstrap/app.php` với `error.code = 'ROLE_IN_USE'`, `message` VN, `details = { users_count }`.
  Ngược lại xoá (pivot `role_permission` cascade tự dọn). Trả 204/200.

### Enforce sẵn có không đổi
- `Gate::before` super_admin bypass, `check.permission` middleware, `guardLastSuperAdmin` (ở
  `UserService::assignRoles`) giữ nguyên. super_admin bị hard-lock nên không cần guard xoá riêng.

## FE — trang quản lý role

### Feature layer
- `src/features/admin/roles/api.js` (MỚI): `getRoles` (đã có ở users feature — cân nhắc chuyển/tái dùng),
  `getPermissions`, `createRole(payload)`, `updateRole(id, payload)`, `deleteRole(id)`.
- `src/features/admin/roles/hooks.js` (MỚI): `useRoles` (list, có permissions+users_count), `usePermissions`,
  `useCreateRole`, `useUpdateRole`, `useDeleteRole` (invalidate `['admin','roles']`). Lỗi surface qua
  `ApiError` (message VN sẵn).

### Trang & component
- **`src/pages/admin/roles/AdminRolesPage.jsx`** (MỚI): bảng role — tên hiển thị, `name` (mã), số
  permission, `users_count`; badge **"Hệ thống"** cho `locked`; nút Tạo mới; mỗi hàng nút Sửa/Xoá (ẩn/
  disable khi `locked`). Dùng primitive admin sẵn có (PageHeader/Panel/EmptyState…).
- **`RoleFormDialog.jsx`** (MỚI): input **Tên hiển thị** + **ma trận tick permission** (từ
  `usePermissions`, nhãn VN qua `PERMISSION_LABELS` của SP1 `adminNav.js`, fallback `display_name` BE).
  Tạo → gọi `useCreateRole`; sửa → `useUpdateRole` (khoá form nếu `locked`, chỉ xem). super_admin hiển
  thị ghi chú "Toàn quyền (bypass)".
- **Xoá**: confirm dialog; nếu `ApiError.code === 'ROLE_IN_USE'` → toast "Còn {N} nhân viên giữ vai trò
  này, hãy gỡ trước khi xoá" (đọc `details.users_count`).
- **Nav**: thêm mục **"Vai trò"** (`/admin/roles`, icon vd `ShieldCheck`/`KeyRound`) vào nhóm "Nhân sự"
  của `adminNav.js`, `permission: 'manage_users'`. Router bọc route mới dưới
  `<RequirePermission slug="manage_users" />` (khớp SP1). `AssignRolesDialog` sẵn có tự thấy role mới.

## Hoà giải seeder
- `RolePermissionSeeder`: vòng lặp 5 role nghề đổi từ `firstOrCreate(...)` **+ `->permissions()->sync(...)`
  mỗi lần** sang **chỉ sync khi role vừa được tạo** (kiểm `wasRecentlyCreated`). super_admin vẫn nhận
  full permission khi tạo; `customer` baseline. Kết quả: chạy lại seeder trên prod KHÔNG ghi đè
  permission-set mà admin đã tinh chỉnh qua UI. Idempotent-an-toàn giữ nguyên (không tạo trùng).

## Xử lý lỗi / edge case
- Tạo role trùng tên (slug đụng) → 422 field `display_name`, message VN.
- Sửa/xoá role `locked` → 403.
- Xoá role đang gán → 409 `ROLE_IN_USE` + `users_count`.
- Bỏ hết permission của một role là hợp lệ (role "rỗng quyền" — user giữ nó thành như customer trong
  admin: vào /admin nhưng mọi mục 403 / sidebar rỗng theo SP1). Không chặn — đó là lựa chọn của admin.
- Xoá permission khỏi role mà chính user hiện tại đang giữ → quyền của họ đổi ở lần refetch `/auth/me`
  kế tiep (SP1 đã sync `/auth/me` khi vào /admin); không xử lý realtime.
- Không cho giảm quyền tự khoá mình ra khỏi `manage_users`? **Ngoài phạm vi SP2** — guard "last super_admin"
  đã chặn kịch bản khoá toàn hệ thống; super_admin luôn bypass nên luôn quản được role.

## Kiểm thử
### BE (`docker compose exec … php artisan test --filter=…`)
- `GET /admin/permissions` trả đủ 10 slug (+ `manage_users` gate: 403 nếu thiếu).
- `RoleResource` serialize `permissions`/`users_count`/`locked` đúng; `locked=true` cho super_admin &
  customer, `false` cho role nghề/custom.
- `store`: tạo role, slugify name (`"Nhân viên kho" → nhan_vien_kho`), unique (trùng → 422), sync
  permission, ghi audit `role.create`.
- `update`: đổi display_name + permission, KHÔNG đổi name; role locked → 403; audit `role.update`.
- `destroy`: role không dùng → xoá + audit `role.delete`; role đang gán → 409 `ROLE_IN_USE` +
  `details.users_count`; role locked → 403.
- Seeder: chạy 2 lần KHÔNG ghi đè permission đã đổi của role nghề (mô phỏng: đổi permission rồi re-seed
  → giữ nguyên).

### FE (Vitest + RTL)
- `AdminRolesPage`: render list + badge "Hệ thống" cho locked; nút Sửa/Xoá ẩn/disable ở role locked.
- `RoleFormDialog`: render ma trận permission, tick/submit gọi create/update đúng payload.
- Xoá 409 → toast đọc `details.users_count`.
- `adminNav`: mục "Vai trò" chỉ hiện khi user có `manage_users` (test theo pattern SP1).

## Ngoài phạm vi (SP sau / YAGNI)
- Ma trận Role×Permission trực quan toàn cảnh (đọc) → **SP3**.
- Audit UI nâng cao + log 403 bị chặn → **SP4**.
- "Xem với vai trò" → **SP5**.
- Gán permission lẻ cho user (không qua role) / cấp quyền tạm thời → D3 phase nâng cao.
- Permission `manage_roles` tách riêng khỏi `manage_users` → chưa cần (YAGNI); nâng sau nếu muốn phân
  tách "quản user" vs "quản role".
- Đổi `name` sau khi tạo → loại (code/assignment key theo name).
