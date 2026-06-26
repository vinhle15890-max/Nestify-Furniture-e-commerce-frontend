# Auto-generated codes: SKU, order number, voucher code

**Date:** 2026-06-26 · **Status:** Implemented

Mục tiêu: không bắt người dùng nhập tay các "mã" — tự sinh.

## 1. SKU biến thể (auto)

- **BE:** `ProductVariantController@store` đổi `sku` → `nullable`. `ProductService::createVariant` sinh SKU khi bỏ trống: `Str::upper(Str::slug(product.slug))` + `-NN` (NN tăng dần, lặp tới khi unique) → vd `GHE-SOFA-DA-01`.
- **FE:** `VariantFormModal` — ô SKU không còn bắt buộc (placeholder "Để trống để tự tạo" + hint), gửi `sku: undefined` khi trống. SKU hiện trong bảng phiên bản sau khi tạo.
- **Test:** BE `tests/Feature/Admin/VariantSkuAutogenTest.php` (3); FE `AdminProductEditPage.test` (bỏ trống → createVariant không có sku).

## 2. Mã đơn hàng (order_number, auto)

- **BE:** migration `add_order_number_to_orders_table` (cột `order_number` string unique nullable). `OrderService::create` set `NES-{yymmdd}-{id:4}` ngay sau khi tạo order (trong transaction). Thêm vào `Order::$fillable`, `OrderResource` + `Admin/OrderResource`. **Chạy `php artisan migrate`.**
- **FE:** hiển thị `order.order_number ?? `#${order.id}`` ở `OrdersPage`, `OrderDetailPage`, `AdminOrdersPage`, `AdminOrderDetailPage` (fallback `#id` cho đơn cũ).
- **Lưu ý:** PayOS vẫn dùng `order.id` số làm `orderCode` (không đổi).
- **Test:** BE `CreateOrderTest::test_order_gets_a_human_friendly_order_number`.

## 3. Mã voucher (nút Tạo mã)

- **FE only:** `VoucherFormModal` thêm nút **"Tạo mã"** → sinh mã ngẫu nhiên `NES` + 5 ký tự (bỏ ký tự dễ nhầm 0/O/1/I). Vẫn cho nhập tay; unique do BE kiểm tra khi submit.
- **Test:** `AdminVouchersPage.test` (click Tạo mã → khớp `/^NES[A-Z2-9]{5}$/`).

## Docs

- `FE_AI_CONTEXT.md`: OrderResource thêm `order_number`; variant create `sku` optional/auto.
- `Diagrams/NestifyERD.puml`: orders.order_number. (Báo cáo: tự cập nhật ảnh ERD — xem hand-off.)
