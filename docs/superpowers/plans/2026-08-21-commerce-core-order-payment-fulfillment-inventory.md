# Commerce Core Implementation Plan

**Spec:** `../specs/2026-08-21-commerce-core-order-payment-fulfillment-inventory-design.md`  
**Trạng thái:** Đã triển khai commerce core ngày 2026-08-21; merchandising/flash sale tiếp tục theo thứ tự cuối tài liệu

## Nguyên tắc thực hiện

- Làm theo vertical slice có test, không thay toàn bộ enum/database trong một lần deploy.
- Backend là nguồn thật cho transition, tiền, kho và doanh thu; FE chỉ trình bày/action theo contract.
- Migration additive, idempotent, backward-compatible; production do release pipeline chạy.
- Mỗi slice hoàn tất phải sync `14-workflows.md`, `FE_AI_CONTEXT.md`, current-state FE và bộ tài liệu bảo vệ.
- Không làm merchandising/flash sale trong plan này.

## Slice 0 — Chốt audit và mapping legacy

1. Inventory toàn bộ nơi đọc/ghi `orders.status`, `payments.status`, stock/reserved và dashboard revenue.
2. Lập bảng mapping từng legacy state theo `payment_method`, payment row và inventory effect.
3. Migrate payment legacy `success` sang canonical `paid`; MVP không thêm `partially_paid` và COD chỉ paid khi thu đủ.
4. Characterize scheduler hiện có: reconcile mỗi 5 phút chạy trước expiry 30 phút; giữ Laravel Scheduler là trigger
   duy nhất nhưng chuyển guards sang payment/order states mới và pessimistic locks.
5. Viết characterization tests giữ hành vi an toàn hiện có trước refactor.

**Exit:** không còn code path status/stock/payment chưa được phân loại.

## Slice 1 — Payment record cho mọi order

### Backend

1. TDD migration/model/resource cho COD và waived payment.
2. Tạo payment row atomically trong checkout COD/zero-total.
3. PayOS create/reconcile/webhook dùng payment làm nguồn trạng thái tiền; webhook verify signature + identity/amount
   trước side effect, rồi mọi nguồn hội tụ vào payment-transition service có `FOR UPDATE` order -> payment.
4. Cập nhật `payments:reconcile-stale`: giữ cửa sổ 10–30 phút và lịch mỗi 5 phút; chọn PayOS payment còn
   `pending`, gọi cùng reconcile/transition service có lock order -> payment, và không tự expire/cancel order.
5. Cập nhật `release:expired-reservations`: chạy sau stale reconciliation mỗi 5 phút; với PayOS payment
   `pending|failed` quá deadline 30 phút, transaction + `FOR UPDATE` order -> payment, re-check method/status/deadline,
   transition `pending_confirmation -> cancelled`, chuyển payment pending `-> failed` với reason
   `reservation_expired` (failed giữ nguyên, bổ sung reason nếu thiếu), release reservation/voucher đúng một lần.
6. Backfill command/report cho legacy COD, không tự đánh dấu paid.
7. Không serialize metadata nội bộ.

### Frontend

1. Order detail/list đọc `payment.status` với fallback legacy tạm thời.
2. Render payment method và badge độc lập ở customer/admin.

**Tests:** COD/PayOS/zero total, idempotency replay, webhook duplicate/invalid signature/identity mismatch,
concurrent webhook-vs-reconcile, concurrent webhook-vs-`release:expired-reservations` (row-lock winner quyết định;
loser re-check và không release/commit ngược), stale command không expire trước deadline, resource compatibility.

## Slice 2 — Order state machine thuần fulfillment

### Backend

1. Thêm enum/state mới
   `pending_confirmation|processing|shipped|delivered|delivery_failed|returned_to_store|cancelled`.
2. Checkout mới luôn tạo `pending_confirmation`.
3. Transition service pessimistic-lock order và enforce forward-only/cancel rules; cấm direct cancel sau shipped.
4. Thêm shipping metadata/timestamps và audit actor.
5. Compatibility reader/backfill legacy `pending_payment|paid` theo payment evidence.

### Frontend

1. Cập nhật labels, filters, timeline và admin action theo state machine mới.
2. Tách payment actions khỏi fulfillment actions.
3. Không suy refund/cancel/payment từ order status.

**Tests:** mọi cạnh hợp lệ/bất hợp lệ, concurrent transition, customer visibility và permissions.

## Slice 3 — COD delivery and collection

### Backend

1. Endpoint/action `confirm-delivery-and-collect` cho COD shipped.
2. Chỉ chấp nhận collected amount bằng chính xác payment amount; pessimistic-lock order rồi payment, set
   delivered/paid/actor/timestamps trong một transaction; không hỗ trợ partial paid.
3. Idempotent replay trả cùng kết quả; conflicting second amount bị reject.
4. Audit log và notification/customer order refresh.

### Frontend

1. Admin modal xác nhận giao + số tiền COD, hiển thị hậu quả trước submit.
2. Customer thấy delivered + paid sau thành công.
3. Dashboard action queue dẫn thẳng đến COD pending collection.

**Tests:** success, duplicate, wrong method, wrong state, under/over amount, missing permission, revenue timing.

## Slice 4 — Inventory ledger

### Backend

1. Migration/model/index và DB unique `(variant_id,idempotency_key)` cho `stock_movements`.
2. Instrument `ReserveInventory`, `CommitInventory`, `ReleaseInventory`, `RestockInventory` trong cùng transaction.
3. Admin stock adjustment yêu cầu reason và actor.
4. Data migration ghi đúng một `opening_balance` cho mỗi variant từ snapshot `stock_quantity/reserved_quantity` hiện
   tại với key `variant:{id}:opening_balance`; test fresh DB không có legacy variant, upgrade có variant và re-run
   không tạo movement/delta lần hai.
5. Endpoint lịch sử SKU và low/out-of-stock list.

### Frontend

1. Product variant admin hiển thị on-hand/reserved/available đúng nghĩa.
2. Trang/lịch sử biến động tồn theo SKU.
3. Low-stock queue với threshold rõ ràng.

**Tests:** delta/before-after, rollback, duplicate event, cancel phases, concurrent stock guard.

## Slice 5 — Revenue and operations dashboard

### Backend

1. Thay lifetime revenue bằng query theo payment `paid_at` và refunds theo refund time.
2. API date range + interval `day|week|month`.
3. Metrics: order value, collected, refunds, net revenue, COD receivable, order counts; `units_sold` mặc định theo
   transition delivered, còn ordered/paid units phải mang tên metric riêng.
4. Operations queues: pending confirmation, processing, shipped, COD receivable, manual refund, low stock.
5. Định nghĩa timezone `Asia/Ho_Chi_Minh` tại report boundary.

### Frontend

1. Date presets/custom range và metric definitions.
2. Không dùng chart làm bằng chứng duy nhất; có bảng và link drill-down.
3. Filter orders tương ứng với từng operations queue.

**Tests:** COD chưa thu không có revenue, paid-at boundary, refund day, timezone edges, empty data.

## Slice 6 — Cancellation/refund reconciliation

**Trạng thái:** Đã triển khai ngày 2026-08-23.

1. Refactor cancel logic theo inventory event thực tế thay vì legacy order status.
2. COD pending cancel terminalizes payment mà không refund; shipped phải qua
   `delivery_failed -> returned_to_store -> cancelled`, chỉ restock khi hàng thực tế đã về.
3. PayOS paid cancel atomically chuyển payment `refunded`, ghi full refunded amount và manual payout reminder đúng một lần.
4. Voucher release exactly once.
5. Cập nhật customer copy và admin manual-refund queue.

## Slice 7 — Documentation and defense synchronization

Sau từng slice, và audit tổng cuối:

- BE `docs/14-workflows.md`, `docs/04-database.md`, `docs/06-api.md`, `docs/12-payment.md`,
  `docs/FE_AI_CONTEXT.md`, defense question bank.
- FE `docs/CURRENT-STATE-MECHANISMS.md`, `docs/FE-TEAM-WORKFLOW.md`, `docs/TASKS.md` nếu task tracking dùng file này.
- Root `NestifyBaoCao_v2.md`, ERD drawio, `../../../../slides.md` đồng bộ cùng logic.
- Thêm mọi runtime bug xác nhận thành test case trong `NestifyBaoCao_v2.md`.

## Verification gate mỗi slice

- BE focused tests trong Docker sqlite theo `docs/07-testing.md`.
- FE Vitest/RTL focused, rồi full test/lint/build theo rủi ro.
- Migration test fresh DB + upgrade fixture; không chạy production trực tiếp.
- `git diff --check`, kiểm `cloudinary_id`, permission và staff purchase gate.
- Review spec compliance trước code quality.

## Thứ tự sau plan này

1. Featured/manual collections + best-seller definition.
2. Image swatch/material surface.
3. Scheduled sale + voucher distribution/combination.
4. Return workflow.
5. Flash sale chỉ khi bốn miền trên đã ổn.
