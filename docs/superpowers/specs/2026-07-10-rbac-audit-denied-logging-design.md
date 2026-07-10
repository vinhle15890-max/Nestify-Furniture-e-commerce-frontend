# RBAC — Audit UI + log 403 bị chặn (Sub-project 4 / D2)

**Ngày:** 2026-07-10
**Trạng thái:** Đã duyệt thiết kế
**Phạm vi:** Bước 4 của lộ trình RBAC 5 sub-project. **Cross-repo (BE + FE)**, KHÔNG migration. Dựa trên SP1 (permission gating) + SP2 (role động) + SP3 (ma trận).

## Bối cảnh & mục tiêu

Sau SP1–SP3, admin đã có gating quyền, quản trị role động và ma trận quan sát. Nhưng khi **một thao tác bị chặn**
(403 do thiếu quyền), hệ thống **không để lại dấu vết** nào — không ai biết ai đã thử làm gì mà bị từ chối.
`CheckPermission` middleware chỉ trả 403 rồi thôi. Song song, trang Nhật ký (`AdminAuditLogsPage`) đã có nhưng
**không lọc được theo hành động** và hiển thị `action` dạng slug thô (`payment.refund`, `role.create`…) khó đọc.

**Mục tiêu SP4:**
1. **Ghi lại mọi lần bị chặn 403** (đã đăng nhập nhưng thiếu quyền) vào `audit_logs` — mắt xích "trách nhiệm
   giải trình" (accountability) của vòng đời RBAC.
2. **Nâng cấp trang Nhật ký**: lọc theo hành động + nhãn tiếng Việt + tô nổi bật các dòng "bị chặn".

### Ràng buộc giữ nguyên (guardrail)
- **Chưa commit** cho tới khi user yêu cầu.
- **KHÔNG migration**: bảng `audit_logs` đã đủ cột (`user_id, action, entity_type, entity_id, old_values,
  new_values, ip_address, user_agent, created_at`). User tự chạy migration/seeder trên prod (không áp dụng ở SP này).
- **`cloudinary_id` / `preview_public_id` không bao giờ serialize** — không liên quan nhưng giữ nếp.
- BE là nguồn enforce chân lý; việc ghi audit **không được** làm thay đổi hành vi 403 (audit lỗi → vẫn trả 403).
- FE plain JS (JSX), không TS; không thêm dependency; admin theme `[data-theme='legacy']`; copy VN; semantic token.
- Trang Nhật ký đã bọc `check.permission:view_audit` (BE) + `RequirePermission slug="view_audit"` (FE) — giữ nguyên.

## Quyết định thiết kế đã chốt
1. **Nguồn ghi denial:** **CHỈ** `CheckPermission` middleware. Ghi khi **đã đăng nhập nhưng thiếu quyền**
   (nhánh `!$user->can($permission)`). **KHÔNG** ghi 401 vô danh (chưa đăng nhập) — tránh nhiễu/spam từ bot.
2. **Không endpoint mới, không migration:** tái dùng `audit_logs` + `AuditLogService::list` +
   `AuditLogController::index`. Chỉ **mở rộng** filter thêm tham số `action`.
3. **Nội dung bản ghi denial:** `action = 'access.denied'`; `new_values = { permission, method, path }`
   (permission bị từ chối + route đã thử vào) → hiện ngay trong ô "Chi tiết" (resource đã serialize `new_values`,
   KHÔNG cần resource mới). `entity_type = null`, `entity_id = null` (không gắn thực thể cụ thể).
4. **UI:** lọc theo hành động (dropdown) + map nhãn VN cho `action` + tô đỏ (badge/nền nhẹ) dòng `access.denied`.

## Kiến trúc & thay đổi

### BE — `app/Http/Middleware/CheckPermission.php` (SỬA)
Ở nhánh từ chối (`$user` tồn tại nhưng `!$user->can($permission)`), **trước khi** ném/`abort` 403, ghi 1 `AuditLog`:
```
AuditLog::create([
    'user_id'     => $user->id,
    'action'      => 'access.denied',
    'entity_type' => null,
    'entity_id'   => null,
    'old_values'  => null,
    'new_values'  => [
        'permission' => $permission,
        'method'     => $request->method(),
        'path'       => $request->path(),
    ],
    'ip_address'  => $request->ip(),
    'user_agent'  => $request->userAgent(),
]);
```
- **Bọc `try/catch`** quanh `AuditLog::create`: nếu ghi audit lỗi (DB, v.v.), **nuốt lỗi** (log qua `Log::warning`
  nếu tiện) và **vẫn trả 403** như cũ. Audit là phụ trợ, không được chặn đường bảo mật.
- Nhánh chưa đăng nhập (401) **giữ nguyên** — KHÔNG ghi.
- Không đổi thông điệp/format 403 hiện tại (code `FORBIDDEN`, message VN sẵn có).

### BE — `app/Services/AuditLogService.php` (SỬA)
- `list(?string $entityType = null, ?string $action = null, int $perPage = 50)`:
  thêm `->when($action, fn ($q) => $q->where('action', $action))` ghép với filter `entity_type` sẵn có.
- Giữ nguyên `whereNotIn('action', self::BEHAVIORAL_ACTIONS)` (loại `recently_viewed`);
  `access.denied` KHÔNG nằm trong BEHAVIORAL_ACTIONS → sẽ hiển thị.

### BE — `app/Http/Controllers/Admin/AuditLogController.php` (SỬA)
- `index(Request $request)`: đọc thêm `$request->query('action')` và truyền vào `AuditLogService::list($entityType, $action)`.
- Response giữ nguyên hình dạng `{ data, meta.pagination }`.

### FE — `src/pages/admin/auditLogs/` (SỬA)
- **`api.js` / `hooks.js`**: `useAdminAuditLogs(page, action)` → truyền `action` vào query string (`?page=&action=`);
  bỏ trống khi `action` rỗng. Key query gồm `action` để cache tách theo filter.
- **`AUDIT_ACTION_LABELS`** (map slug → nhãn VN), đặt cạnh page (hoặc `auditLogs/constants.js`):
  - `order.cancel` → "Hủy đơn hàng"
  - `order.status_transition` → "Chuyển trạng thái đơn"
  - `payment.refund` → "Hoàn tiền"
  - `user.assign_roles` → "Gán vai trò cho người dùng"
  - `role.create` → "Tạo vai trò"
  - `role.update` → "Sửa vai trò"
  - `role.delete` → "Xoá vai trò"
  - `access.denied` → "Truy cập bị chặn (403)"
  - **Fallback:** slug thô nếu không có trong map (không vỡ khi BE thêm action mới).
- **`AdminAuditLogsPage.jsx`**:
  - Dropdown lọc "Tất cả hành động" + các entry của `AUDIT_ACTION_LABELS`; đổi filter → reset về trang 1.
  - Cột "Hành động" hiển thị `AUDIT_ACTION_LABELS[action] ?? action`.
  - Dòng `action === 'access.denied'`: thêm **badge đỏ** ("Bị chặn") và/hoặc **nền nhẹ** (`bg-destructive/5`
    hoặc token tương đương) để nổi bật. Ô "Chi tiết" hiển thị `new_values` (permission/method/path) như các dòng khác.

### Không đổi
- `AuditLogResource` (đã serialize `new_values`), `AuditLog` model, migration, route.
- Middleware alias `check.permission`, `Gate::before` super_admin bypass.
- Các đường ghi audit hiện có (order/payment/user/role) — chỉ **thêm** action `access.denied`.

## Xử lý lỗi / edge case
- **Audit ghi lỗi** → nuốt trong try/catch, vẫn trả 403. Không bao giờ để audit chặn bảo mật.
- **Super_admin** bypass qua `Gate::before` → `$user->can()` trả true → KHÔNG vào nhánh denial → KHÔNG ghi. Đúng.
- **Chưa đăng nhập (401)** → KHÔNG ghi (đã chốt). Tránh spam từ request vô danh.
- **Volume**: denial là nhánh ngoại lệ (chỉ khi thực sự bị chặn), không phải hot-path → chi phí ghi thấp;
  đã có index `(user_id, action)` phục vụ truy vấn lọc.
- **BE thêm action mới về sau** → FE fallback slug thô, không vỡ; dropdown chỉ liệt kê action đã biết.
- **Filter `action` không hợp lệ** (không có bản ghi) → trả trang rỗng, không lỗi.
- **`path()` chứa thông tin nhạy cảm?** — path admin route bình thường, không kèm query/secret; an toàn để lưu.

## Kiểm thử

### BE (PHPUnit — Docker sqlite)
- **`CheckPermission` denial logging:**
  - User đã đăng nhập thiếu quyền gọi route gated → tạo **đúng 1** `AuditLog` `action='access.denied'`,
    `new_values.permission` = slug đúng, `user_id` khớp; response vẫn **403**.
  - User đủ quyền (hoặc super_admin) → **KHÔNG** tạo bản ghi `access.denied`; response 2xx.
  - (Nếu khả thi) audit ghi lỗi được nuốt → vẫn 403 (có thể bỏ qua nếu khó mock; try/catch đủ rõ).
- **`AuditLogService::list` / controller filter:**
  - Truyền `action=access.denied` → chỉ trả các bản ghi action đó.
  - Không truyền `action` → hành vi cũ (loại behavioral, phân trang 50).

### FE (Vitest + RTL)
- Render bảng: `action` slug → hiển thị nhãn VN đúng; action lạ → hiển thị slug thô (fallback).
- Chọn dropdown filter → `useAdminAuditLogs` được gọi với `action` đúng (mock hook/api), reset trang 1.
- Dòng `access.denied` có badge "Bị chặn" / class nền phân biệt; dòng thường không có.
- Giữ các test AdminAuditLogsPage hiện có xanh.

## Ngoài phạm vi (SP sau / YAGNI)
- Ghi denial 401 vô danh, rate-limit/alert khi nhiều denial → chưa cần.
- Lọc theo user/khoảng thời gian, tìm kiếm full-text audit → YAGNI (thêm sau nếu cần).
- Trang "cảnh báo bảo mật" riêng, export CSV → ngoài phạm vi.
- "Xem với vai trò" → **SP5**. Cấp quyền lẻ/tạm cho user → D3 nâng cao.
