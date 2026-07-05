# Khách tự hủy đơn trước khi giao (+ auto ghi nhận hoàn tiền)

**Ngày:** 2026-07-04
**Trạng thái:** Đã duyệt, đang triển khai

## Bối cảnh & khoảng trống

Chức năng hủy đơn **đã có** end-to-end nhưng **chỉ cho `pending_payment`**:
- BE `POST /orders/{id}/cancel` → `OrderService::cancel` (owner, chỉ `pending_payment`, `reverseOrderHolds` + set cancelled).
- FE nút "Hủy đơn" trên `OrderDetailPage` chỉ hiện khi `isPendingPayment`.

Yêu cầu giảng viên: **giai đoạn chưa giao hàng thì khách vẫn được tự hủy + hoàn tiền.** Đơn COD vào thẳng `processing`, đơn PayOS đã `paid` → hiện khách không tự hủy được (chỉ admin). Đây là khoảng trống cần lấp.

## Quyết định (chốt từ brainstorming)

1. **Phạm vi hủy:** khách hủy đơn của mình khi status ∈ `pending_payment`, `paid`, `processing` (chưa `shipped`). `shipped`/`delivered`/`cancelled` → 422. **Ngoài phạm vi:** hủy khi `shipped` (ghi chú hướng tương lai: đổi-trả sau giao).
2. **Cơ chế:** khách hủy **trực tiếp** (không cần admin duyệt); hủy là cancelled + restock ngay.
3. **Tiền (đơn PayOS đã trả):** **auto ghi nhận refund toàn phần** (payment→refunded) + **báo admin** để admin chuyển tiền tay qua PayOS dashboard (đúng luồng "recorded refund" hiện có; PayOS không hoàn tự động). COD (không có Payment) → chỉ hủy + restock, không refund.
4. **Ô lý do hủy:** có, optional, gửi kèm để lưu audit + hiển thị cho admin.

## Backend

### `OrderService::cancel(int $orderId, User $user, ?string $reason = null)` — mở rộng
- Load order với `items` (+ để tính refund: check payment).
- Ownership: `abort_unless($user->id === $order->user_id, 403)`.
- **Guard status mới:** cho phép `PendingPayment | Paid | Processing`; ngược lại `abort(422)` message theo trạng thái (`shipped`→"Đơn đang giao không thể tự huỷ."; `delivered`/`cancelled` tương ứng).
- Trong `DB::transaction`:
  1. `reverseOrderHolds($order)` (đã có — inventory theo status hiện tại + nhả voucher). **Chạy trước** khi đổi status.
  2. `$refunded = $this->paymentService->recordCancellationRefund($order, $reason)` — chỉ ghi tiền nếu có Payment success; trả `?Payment`.
  3. `$order->update(['status' => Cancelled])`.
  4. `AuditLog` `order.cancel` (user_id, reason, có refund hay không).
  5. `OrderCancelledByCustomer::dispatch($order, $refunded !== null)`.
  - Return `$order->fresh()`.
- **Lưu ý DI:** inject `PaymentService` vào `OrderService`. Cẩn thận vòng phụ thuộc: `PaymentService` KHÔNG được inject `OrderService` (không có) → an toàn.

### `PaymentService::recordCancellationRefund(Order $order, ?string $reason): ?Payment` — MỚI
- Tìm `Payment::where(order_id)->whereIn(status,[Success, PartiallyRefunded])->latest()->first()`. Không có (COD) → `return null`.
- Nếu payment đã `Refunded` → `return $payment` (idempotent, không ghi lại).
- Set `refunded_amount = amount`, `status = Refunded`. Audit `payment.refund` (reason = `reason ?? 'customer_cancellation'`, `source=customer_cancellation`).
- **KHÔNG** restock/nhả voucher/set cancelled (luồng `OrderService::cancel` đã lo → tránh double-restock).
- Trả `$payment->fresh()`.
- **Không đổi** `PaymentService::refund` (admin) — giữ nguyên; chỉ thêm method mới. (Có thể refactor phần money-only dùng chung ở bước dọn, nhưng không bắt buộc cho spec này.)

### Event + Listener
- `App\Events\OrderCancelledByCustomer` (`Order $order`, `bool $refundOwed`).
- `App\Listeners\NotifyAdminOrderCancelled` (implements `ShouldQueue`): mail admin có quyền `refund` (`User::whereHas('roles.permissions', slug='refund')`) qua `Notification::send` + `OrderCancelledNotification` (nêu order_number, tổng tiền, có cần hoàn tiền không, lý do). Đăng ký theo cơ chế auto-discovery hiện dùng (giống `NotifyAdminNewReview`).

### Request + Controller
- `CancelOrderRequest` (FormRequest): `reason` → `nullable|string|max:500`.
- `OrderController::cancel` nhận `CancelOrderRequest`, truyền `reason` vào service.

### Route
- Giữ `POST /orders/{id}/cancel` (auth+verified). Không đổi path.

## Frontend

### `features/orders/api.js` + `hooks.js`
- `cancelOrder(id, reason)` → `POST /orders/${id}/cancel` body `{ reason }`.
- `useCancelOrder` giữ nguyên (đổi mutationFn nhận `{id, reason}`).

### `OrderDetailPage`
- `canCancel = ['pending_payment','paid','processing'].includes(order.status)` → điều kiện hiện nút "Hủy đơn" (thay `isPendingPayment`).
- Bấm "Hủy đơn" → mở **confirm dialog** (Modal) có:
  - **Ô lý do** (textarea, optional).
  - Nếu `status` là `paid` (đã thanh toán online) → dòng lưu ý: "Đơn đã thanh toán sẽ được hoàn tiền; bộ phận CSKH sẽ liên hệ xử lý."
  - Nút "Xác nhận hủy" → `cancelOrder.mutateAsync({ id, reason })` → toast + invalidate order.
- "Thanh toán lại" vẫn chỉ ở `pending_payment`.

## Testing

### BE (`CancelOrderTest` mở rộng / mới)
- Hủy `paid` → order cancelled + variant restock (stock_quantity cộng lại) + payment `refunded` + `OrderCancelledByCustomer` dispatched (refundOwed=true) + admin notified.
- Hủy COD `processing` → cancelled + restock, **không** có payment refund (refundOwed=false).
- Hủy `pending_payment` → cancelled + **release** reservation (reserved giảm, stock nguyên) — giữ hành vi cũ.
- Hủy `shipped`/`delivered` → 422; không phải chủ → 403; đơn `cancelled` rồi → 422.
- Voucher: đơn có voucher → `voucher_usages` được nhả (release).
- `reason` lưu vào audit.

### FE (`OrderDetailPage.test.jsx` mở rộng)
- Nút "Hủy đơn" hiện cho `paid` & `processing`; ẩn cho `shipped`/`delivered`/`cancelled`.
- Đơn `paid`: dialog hiện ghi chú hoàn tiền.
- Nhập lý do + xác nhận → `cancelOrder` gọi với `{id, reason}`.

## Docs
- `14-workflows.md` §4 (nhánh customer-cancel pre-shipment + bảng trạng thái được hủy), liên kết §6 refund & §13 inventory.
- `FE_AI_CONTEXT.md`: `POST /orders/{id}/cancel` — thêm `reason`, mở rộng status cho hủy, mô tả hành vi refund + lỗi 422 theo trạng thái.

## Ngoài phạm vi (YAGNI)
- Hủy khi `shipped` (đang giao) — chưa chốt phương án; không làm.
- Hoàn tiền tự động qua PayOS API — vẫn thủ công (admin).
- Hủy một phần (từng item) — không.
- Giới hạn thời gian được hủy sau đặt — không (chưa yêu cầu).
