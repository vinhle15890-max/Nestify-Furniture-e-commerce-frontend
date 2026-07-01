# Khóa / Mở-khóa người dùng (admin) — Design

**Date:** 2026-07-01
**Repos:** BE `Nestify-Furniture-e-commerce-backend` (branch `dev`), FE `Nestify-Furniture-e-commerce-frontend` (branch `GiaBao/feat`)
**Status:** Approved (brainstorm) — chờ implementation plan

## Vấn đề

Trang quản lý người dùng (admin) hiện chỉ **hiển thị** trạng thái tài khoản ("Hoạt động" / "Đã lưu trữ") và cho **phân quyền**, nhưng **không có thao tác khóa/mở-khóa** tài khoản. Admin không thể đình chỉ một khách hàng hay nhân viên vi phạm.

## Hiện trạng (đã khảo sát)

- BE `User.status` = enum `active | archived` (đã cast + fillable), có `scopeActive()`.
- BE `AuthService::login` **đã** ném `AccountArchivedException` khi `status === Archived` → user `archived` **không đăng nhập được**. Cơ chế khóa đã tồn tại một nửa.
- BE `Admin\UserController` chỉ có `index` + `assignRoles`. **Không** có endpoint đổi status.
- BE có sẵn pattern audit (`user.assign_roles`) và `UserService::guardLastSuperAdmin`.
- FE `AdminEmployeesPage` (staff) + `AdminCustomersPage` (customers) + `CustomerDetailDrawer` hiển thị badge status nhưng **không** có action đổi.
- FE `features/admin/users/{api,hooks}.js`: `getUsers` / `getRoles` / `assignUserRoles` — không có mutation status.

## Quyết định chốt

1. **Phạm vi:** khóa được **cả khách hàng và nhân viên**.
2. **Mô hình:** **tái dùng** `archived` làm trạng thái "đã khóa" — **không migration**, không thêm status mới. `active` = đang hoạt động, `archived` = đã khóa.
3. **Workflow khóa:** hộp thoại xác nhận → **thu hồi toàn bộ token (đăng xuất ngay)** → **ghi audit log**. **Không** nhập lý do.
4. **Guard an toàn:** không cho tự khóa chính mình; không cho khóa super_admin cuối cùng.

## 1. Mô hình dữ liệu — không đổi schema

Tái dùng `User.status`. Chỉ đổi **nhãn UI**: "Đã lưu trữ" → **"Đã khóa"** (khớp ngữ nghĩa khóa tài khoản).

## 2. Backend

**Endpoint:** `PATCH /admin/users/{id}/status` — trong nhóm `check.permission:manage_users` (cùng chỗ `assignRoles`).
Body: `{ "status": "active" | "archived" }` (validate qua FormRequest; chỉ nhận đúng 2 giá trị enum).
Trả: `{ "data": UserResource }` (status mới).

**`UserService::setStatus(User $user, UserStatus $status): User`:**
- **Guard → `ForbiddenException` (403):**
  - Tự-khóa: `auth()->id() === $user->id` → chặn.
  - Khóa super_admin cuối cùng: tái dùng logic `guardLastSuperAdmin` (nếu `$status === Archived` và target là super_admin duy nhất còn active) → chặn.
- **Khi khóa (`→ archived`):** set status → `$user->tokens()->delete()` (thu hồi token → phiên chết ngay).
- **Khi mở khóa (`→ active`):** set status (không đụng token).
- **Audit:** action `user.lock` (khóa) / `user.unlock` (mở), `entity_type='user'`, `entity_id=user.id`, `old_values={status:cũ}`, `new_values={status:mới}`, `ip_address` — theo pattern `assignRoles`. Các event này **hiện bình thường** trong admin audit log (KHÁC `product_viewed`; không thêm vào `BEHAVIORAL_ACTIONS`).
- Bọc trong `DB::transaction`, log `Log::info('[User] setStatus', ...)`.

Controller `setStatus()` mỏng: `findOrFail` → gọi service → trả `UserResource`.

## 3. Frontend

- `features/admin/users/api.js`: `updateUserStatus(id, status)` → `apiClient.patch('/admin/users/${id}/status', { status })`.
- `features/admin/users/hooks.js`: `useUpdateUserStatus()` — mutation, `onSuccess` invalidate `['admin','users']`; lỗi trả `ApiError` (message tiếng Việt) cho toast.
- **Nút Khóa / Mở khóa** tại:
  - Hàng bảng `AdminEmployeesPage` (cạnh "Phân quyền").
  - Hàng bảng `AdminCustomersPage`.
  - Footer `CustomerDetailDrawer`.
  - **Ẩn** nút trên hàng của **chính mình** (so `authStore` user id).
- **Confirm dialog** (Radix AlertDialog, tone cảnh báo): nêu tên user + hậu quả ("sẽ bị đăng xuất và không thể đăng nhập") cho hành động khóa; xác nhận mới gọi mutation → toast kết quả.
- Nhãn badge: "Đã khóa" cho `archived`, "Hoạt động" cho `active`.

## 4. Kiểm thử

**BE** — `tests/Feature/Admin/UserStatusTest.php`:
- Admin khóa customer → status `archived`; token của customer bị thu hồi.
- Admin khóa staff → `archived`.
- Admin mở khóa → `active`.
- Chặn tự-khóa (403).
- Chặn khóa super_admin cuối cùng (403); khóa được khi còn super_admin khác.
- Guest 401; user không có `manage_users` → 403.
- User `archived` không đăng nhập được (login 403 `AccountArchived`).
- Audit log ghi `user.lock` / `user.unlock` đúng old/new.
- Validate: status ngoài enum → 422.

**FE:**
- `useUpdateUserStatus` gọi đúng endpoint + invalidate.
- Nút xác nhận → gọi mutation với id + status đúng.
- Nút Khóa **ẩn** trên hàng của chính mình.
- Badge render "Đã khóa" cho archived.

## 5. Docs cần cập nhật

- BE `docs/14-workflows.md` — workflow khóa + side-effect token.
- BE `docs/FE_AI_CONTEXT.md` — endpoint `PATCH /admin/users/{id}/status`.
- FE `docs/FE-TEAM-WORKFLOW.md` — workflow khóa/mở-khóa ở admin users.

## YAGNI (không làm)

- Không nhập lý do khóa.
- Không thêm status mới / migration.
- Không khóa hàng loạt (bulk), không lịch tự mở khóa.
