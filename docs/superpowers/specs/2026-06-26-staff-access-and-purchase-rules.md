# Staff admin access + purchase restriction

**Date:** 2026-06-26 · **Status:** Implemented

Hai lỗi phân quyền:

1. **Nhân viên (role khác `super_admin`) không vào được trang quản trị** — reload bao nhiêu
   lần cũng bị đá về trang chủ.
2. **Tài khoản quản trị (kể cả super admin) vẫn mua hàng được** — yêu cầu: chỉ khách hàng
   mới được mua.

## Nguồn gốc (root cause)

- `AdminRoute.jsx` và `Header.jsx` hard-code `user.roles.includes('super_admin')` → mọi role
  nhân viên khác (admin, store_manager, order_staff, catalog_staff, moderator) bị chặn, dù BE
  vẫn cho qua theo từng `check.permission`.
- `OrderController@store` không kiểm tra role → ai đăng nhập cũng đặt được đơn.

## Định nghĩa chuẩn "staff" vs "customer"

Khớp với `UserService` đã có: **customer = không có role nào ngoài `customer`** (user mới đăng
ký không có role nào). **staff = có bất kỳ role nào khác `customer`** (super_admin tính là staff).

## Thay đổi

**BE**
- `User::isStaff()` — `roles->contains(name !== 'customer')`.
- Chặn mua hàng ở **một chokepoint duy nhất**: `OrderService::create` ném
  `StaffCannotPurchaseException` khi user là staff. Đây là điểm chung cho **cả 2 đường tạo đơn**:
  checkout giỏ hàng (`POST /orders`) và chuyển phòng 3D thành đơn
  (`POST /room-scenes/{id}/convert-to-order` → `RoomSceneService::convertToOrder` gọi
  `OrderService::create`). Render toàn cục trong `bootstrap/app.php` → `403 STAFF_CANNOT_PURCHASE`.
- `LoginController`, `RegisterController` — `->load('roles')` để response auth luôn có `roles`
  (trước đây `whenLoaded` bỏ trống → FE phải chờ `/me`). `me`/`profile` đã load sẵn.
- Test: `CreateOrderTest::test_staff_cannot_create_order`,
  `ConvertToOrderTest::test_staff_cannot_convert_scene_to_order` (customer happy-path vẫn xanh).

**FE**
- `src/lib/roles.js` — `isStaff(user)` (mirror BE). + `roles.test.js`.
- `AdminRoute.jsx`, `Header.jsx` — gate bằng `isStaff(user)` thay cho `super_admin`.
- `ProductPage.jsx` — staff thấy "Tài khoản quản trị không thể mua hàng." thay cho nút Thêm vào giỏ.
- `CheckoutPage.jsx` — staff bị chặn ở bước thanh toán (early-return notice).
- Test bổ sung: `layout.test`, `App.test` (role staff vào được admin), `ProductPage.test`
  (staff không thấy nút mua).

## Docs

- `FE_AI_CONTEXT.md`: mục Auth (roles luôn có, gate = bất kỳ staff role) + `POST /orders`
  thêm lỗi `403 STAFF_CANNOT_PURCHASE`.
- Không đổi schema/ERD/use-case (chỉ là quy tắc authorization).
