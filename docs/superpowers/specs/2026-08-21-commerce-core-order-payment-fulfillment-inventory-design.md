# Commerce Core — Order, Payment, Fulfillment, Inventory

**Ngày:** 2026-08-21  
**Trạng thái:** Đề xuất để duyệt trước triển khai  
**Phạm vi:** Cross-repo BE + FE + tài liệu bảo vệ

## 1. Bối cảnh

Nestify hiện dùng một `orders.status` cho cả trạng thái tiền (`pending_payment`, `paid`) và trạng thái xử lý hàng
(`processing`, `shipped`, `delivered`). COD được tạo thẳng ở `processing`, không có payment record và dashboard tính
mọi đơn `processing|shipped|delivered` vào doanh thu. Vì vậy một đơn COD chưa giao, chưa thu tiền vẫn có thể được báo
cáo như doanh thu đã thực hiện.

Thiết kế này thay thế quyết định “COD kết thúc tại đặt hàng / order status đại diện luôn cho tiền” trong các spec cũ.
Mục tiêu là tạo một commerce core giải thích được bằng nghiệp vụ, kiểm thử được và làm nguồn thật cho báo cáo.

## 2. Mục tiêu

1. Tách tiến độ đơn, thanh toán và giao nhận thành các trạng thái độc lập.
2. COD chỉ trở thành doanh thu khi có thao tác xác nhận giao thành công và thu tiền.
3. PayOS chỉ trở thành đã thanh toán từ webhook/reconcile đáng tin cậy.
4. Mọi thay đổi tồn kho tạo dấu vết, không chỉ sửa một số lượng cuối.
5. Dashboard phân biệt giá trị đơn, tiền đã thu, tiền COD chờ thu, hoàn tiền và doanh thu thuần.
6. Giữ snapshot giá/SKU/địa chỉ và các guardrail hiện có: transaction, atomic inventory, voucher, idempotency.

## 3. Ngoài phạm vi lát cắt đầu tiên

- Tích hợp API hãng vận chuyển hoặc đối soát COD tự động.
- Nhiều kho, chuyển kho và vị trí kệ.
- Nhà cung cấp và purchase order.
- Hủy/đổi trả từng phần tử đơn.
- Flash sale, loyalty, mua X tặng Y.
- Hoàn tiền PayOS tự động.
- Thay đổi Room Planner/AI ngoài việc tiếp tục handoff vào cart/checkout chuẩn.

## 4. Mô hình trạng thái

### 4.1 `orders.status` — tiến độ thương mại của đơn

Giữ tên cột để giảm phạm vi migration, nhưng enum mới chỉ chứa trạng thái đơn:

```text
pending_confirmation -> processing -> shipped -> delivered
          |                 |          \
          +---- cancelled <-+           +-> delivery_failed -> returned_to_store -> cancelled
```

| Status | Ý nghĩa | Ai chuyển |
|---|---|---|
| `pending_confirmation` | Đơn đã tạo, cửa hàng chưa chấp nhận xử lý | Hệ thống |
| `processing` | Cửa hàng đã xác nhận và đang chuẩn bị hàng | Staff `manage_orders` |
| `shipped` | Đã bàn giao vận chuyển | Staff `manage_orders` |
| `delivered` | Đã giao thành công | Staff `manage_orders` |
| `delivery_failed` | Giao không thành công; hàng chưa được coi là đã về kho | Staff `manage_orders` |
| `returned_to_store` | Hàng giao thất bại đã được cửa hàng nhận lại và kiểm đếm | Staff `manage_orders` |
| `cancelled` | Đơn chấm dứt; direct cancel chỉ trước `shipped`, hoặc sau khi hàng giao thất bại đã về cửa hàng | Customer/staff từ `pending_confirmation|processing`; staff từ `returned_to_store` |

Không dùng `paid` hay `pending_payment` trong `orders.status` sau migration.

Không ai được chuyển trực tiếp `shipped -> cancelled`, kể cả staff. Customer và staff chỉ cancel trực tiếp ở
`pending_confirmation|processing`. Sau khi shipped, staff phải ghi nhận `delivery_failed`, rồi xác nhận hàng thực tế đã
quay về bằng `returned_to_store`; chỉ transition `returned_to_store -> cancelled` mới restock. Quy tắc này ngăn hệ
thống cộng tồn khi hàng còn trên đường. `delivered` không được cancel; đổi/trả sau giao thuộc return workflow riêng.

### 4.2 `payments.status` — trạng thái tiền

Mỗi order phải có payment record, kể cả COD và đơn tổng tiền bằng 0.

| Status | Ý nghĩa |
|---|---|
| `pending` | Đang chờ bằng chứng thanh toán/thu tiền |
| `paid` | Đã thu đủ đúng số tiền phải thu |
| `failed` | Lần thanh toán kết thúc thất bại/hết hạn; có thể thử lại theo policy |
| `partially_refunded` | Đã hoàn một phần |
| `refunded` | Đã hoàn toàn bộ |
| `waived` | Tổng phải thu bằng 0 do giảm giá; không phải doanh thu tiền mặt |

Payment lưu tối thiểu: `order_id`, `method` (`payos|cod|waived`), `status`, `amount`, `paid_amount`,
`refunded_amount`, `transaction_reference`, `paid_at`, `confirmed_by`, timestamps. Tên field cuối cùng phải tái sử dụng
các cột payment hiện có khi phù hợp; không tạo dữ liệu song song nếu schema đã có nghĩa tương đương.

MVP không hỗ trợ thu thiếu hoặc thu nhiều hơn order total và không có `partially_paid`. Với payment COD, transition
`pending -> paid` chỉ hợp lệ khi `paid_amount == amount` theo decimal comparison ở server. Action reject `422
COD_AMOUNT_MISMATCH` nếu số tiền khác. Phí giao hàng/phụ phí phải được chốt trong order total trước khi order chuyển
sang `shipped`; không được nhập một khoản phát sinh ngoài order tại bước thu COD. Hỗ trợ partial collection là một
thiết kế kế toán mới, không được tự mở rộng trong lúc triển khai spec này.

### 4.3 Fulfillment

Lát cắt đầu tiên dùng `orders.status` cho tiến độ fulfillment một kiện hàng/toàn đơn. Không tạo bảng shipment khi chưa
có giao một phần hoặc nhiều kiện. Order bổ sung các metadata vận chuyển nullable:

- `carrier_name`
- `tracking_number`
- `shipped_at`
- `delivered_at`
- `delivery_failed_at`
- `returned_to_store_at`

Khi xuất hiện partial fulfillment/multiple shipment, nâng cấp sang `fulfillments` riêng; không giả lập trước.

### 4.4 Return

Đổi trả sau giao là miền riêng, không biến `orders.status` ngược từ `delivered` về `processing`. Lát cắt đầu tiên chỉ
chốt boundary; workflow return sẽ là spec sau với `requested|approved|rejected|received|completed`.

## 5. Luồng chuẩn

### 5.1 Tạo đơn COD

Trong một transaction:

1. Gate customer, validate cart/address/voucher/idempotency.
2. Atomic reserve stock theo SKU.
3. Tạo order `pending_confirmation`, `payment_method=cod`.
4. Tạo payment COD `pending`, amount bằng order total.
5. Snapshot items/address/price, consume voucher, clear cart.
6. Không ghi nhận doanh thu; không đánh dấu paid.

Quyết định kho: khi cửa hàng chuyển `pending_confirmation -> processing`, commit reservation thành hàng đã xuất bán.
Nếu hủy trước xác nhận thì release reservation; nếu hủy sau commit nhưng trước shipped thì restock. Quy tắc này phải
dựa trên inventory movements, không suy đoán từ payment status.

### 5.2 Tạo đơn PayOS

1. Tạo order `pending_confirmation` và payment PayOS `pending` trong transaction checkout.
2. Inventory vẫn reserved trong cửa sổ thanh toán.
3. Payment session/retry không tạo order thứ hai.
4. Webhook/reconcile hợp lệ chuyển payment `pending -> paid`, set `paid_at`, rồi commit inventory đúng một lần.
5. Đơn vẫn `pending_confirmation`; thanh toán thành công không tự đồng nghĩa cửa hàng đã bắt đầu chuẩn bị.
6. Payment hết hạn/failed không tự tạo đơn mới. Laravel Scheduler là trigger duy nhất cho expiry tự động:
   `payments:reconcile-stale` chạy mỗi 5 phút trước `release:expired-reservations`; sweep thứ hai xử lý payment PayOS
   vẫn `pending|failed` đã quá deadline 30 phút. Với từng candidate, command mở transaction, `SELECT ... FOR UPDATE`
   order rồi payment, re-check method/status/deadline, chuyển order `pending_confirmation -> cancelled`; payment
   `pending -> failed` với reason `reservation_expired`, còn payment đã `failed` giữ nguyên và chỉ bổ sung terminal
   reason nếu thiếu; release reservation/voucher đúng một lần. Webhook, browser query và lazy page-load không tự
   expire order. `withoutOverlapping()` chỉ giảm chạy trùng; row locks và state re-check là correctness boundary
   giữa scheduler/webhook/reconcile.

### 5.2.1 Trust boundary và concurrency PayOS

- Webhook bắt buộc verify checksum/signature PayOS bằng secret server trên canonical payload trước khi đọc status.
  Thiếu/sai signature trả HTTP 400, không đổi order/payment/inventory/revenue và ghi security log có order/gateway
  identifiers an toàn; không log secret hay toàn bộ raw payload nhạy cảm.
- Sau signature, server vẫn đối chiếu order code, amount, currency và gateway transaction identity với dữ liệu đã lưu.
- Không tin query string return page hoặc trạng thái FE. Nếu PayOS payload/version cung cấp signed event timestamp,
  validate timestamp theo contract adapter; spec không tự giả định một timestamp không có trong contract PayOS.
- Webhook, reconcile endpoint, stale reconciliation và COD collection đều gọi một payment-transition service. Service
  dùng pessimistic locking theo thứ tự cố định `orders FOR UPDATE` rồi `payments FOR UPDATE`, re-check current states
  sau lock, và chỉ người thắng transition mới commit inventory/audit/revenue event. Unique gateway transaction ID và
  stock-movement business key là hàng rào DB bổ sung; check-then-insert ở application không đủ.

### 5.3 Đơn tổng tiền bằng 0

- Order `pending_confirmation`.
- Payment method `waived`, status `waived`, amount `0`.
- Commit inventory theo cùng thời điểm xác nhận đơn, không gọi PayOS.
- Không cộng vào cash collected; vẫn tính số lượng bán sau khi order được thực hiện.

### 5.4 Xác nhận và giao COD

```text
Đặt đơn:       order=pending_confirmation, payment=pending
Xác nhận:      order=processing,           payment=pending
Xuất giao:     order=shipped,              payment=pending
Giao + thu:    order=delivered,            payment=paid
```

Action `confirm-delivery-and-collect` phải chạy transaction, lock order/payment, idempotent và lưu:

- `paid_amount` (mặc định order total, server validate bằng số phải thu);
- `paid_at`;
- `confirmed_by`;
- `delivered_at`;
- audit old/new values.

Action chỉ nhận `collected_amount == payment.amount`; khác số tiền trả `422 COD_AMOUNT_MISMATCH`, không đổi order hay
payment. Khi thành công, `paid_amount=amount` và `payment.status=paid`. Không tồn tại kết quả delivered + thu thiếu
trong MVP.

Chỉ action kết hợp này dùng trong MVP để tránh trạng thái “đã giao nhưng chưa biết đã thu COD chưa”. Khi có đối soát
hãng vận chuyển thật, tách delivery confirmation và COD settlement thành hai action.

### 5.5 Hủy đơn

- Customer và staff được cancel trực tiếp chỉ khi order là `pending_confirmation|processing`.
- Không cho `shipped -> cancelled`. Giao thất bại đi `shipped -> delivery_failed -> returned_to_store -> cancelled`;
  chỉ khi xác nhận `returned_to_store` mới restock.
- `delivered` không cancel; dùng return workflow sau giao.
- Nếu inventory còn reserved: release.
- Nếu đã commit: restock.
- Nếu payment PayOS `paid`: trong cùng transaction ghi `refunded_amount=paid_amount`, chuyển payment `-> refunded`,
  tạo manual payout reminder theo cơ chế hiện có. `refunded` là khoản hệ thống đã ghi nhận phải trả khách; thao tác
  chuyển tiền thực tế vẫn được audit riêng bằng `manual_refund_completed_at`.
- Nếu COD `pending`: không có tiền để refund.
- Order -> `cancelled`; payment COD pending -> `failed` với reason `order_cancelled` (hoặc trạng thái terminal tương
  đương được enum payment hiện có hỗ trợ).
- Hủy lặp idempotent, không release/restock/voucher/refund hai lần.

## 6. Inventory ledger

Tạo `stock_movements` append-only:

| Field | Ý nghĩa |
|---|---|
| `id`, `variant_id` | SKU bị tác động |
| `type` | `reserve|release|sale|restock|receive|adjustment|damage` |
| `quantity_delta` | Delta signed theo bucket liên quan |
| `stock_before/after` | Tồn vật lý trước/sau |
| `reserved_before/after` | Tồn giữ trước/sau |
| `order_id` nullable | Order nguồn |
| `reason` nullable | Lý do người đọc hiểu được |
| `actor_id` nullable | Staff/customer/system |
| `idempotency_key` | Business-event key ổn định, ví dụ `order:{id}:reserve:{variant_id}` |
| timestamps | Thời điểm biến động |

`product_variants.stock_quantity` và `reserved_quantity` vẫn là số tổng hợp để đọc nhanh. Ledger là lịch sử giải thích,
không thay atomic guards. Movement phải được ghi trong cùng DB transaction với thay đổi stock.

DB bắt buộc có unique constraint trên `(variant_id, idempotency_key)`. `idempotency_key` không nullable. `order_id` và
`type` vẫn được index để query/audit nhưng không thay uniqueness của business key. Insert conflict phải dẫn tới re-read
movement hiện có và không áp dụng delta lần hai.

## 7. Doanh thu và báo cáo

Không suy doanh thu từ `orders.status`.

- `order_value`: tổng giá trị order hợp lệ trong kỳ, không đồng nghĩa tiền đã thu.
- `cash_collected`: tổng payment chuyển `paid` trong kỳ theo `paid_at`.
- `refunds`: tiền hoàn theo thời điểm refund.
- `net_revenue = cash_collected - refunds` cho báo cáo MVP.
- `cod_receivable`: COD chưa paid của order chưa cancelled.
- `units_sold`: mặc định của dashboard chính là tổng quantity trong order chuyển `delivered` trong kỳ, trừ quantity
  return đã hoàn tất khi return workflow tồn tại. Payment PayOS paid nhưng chưa delivered không tính units sold. Một
  report khác muốn đo `units_ordered` hoặc `units_paid` phải dùng tên metric khác, không được đổi nghĩa `units_sold`.

Dashboard mặc định có khoảng ngày và group `day|week|month`; hiển thị công việc cần làm trước biểu đồ:

- chờ xác nhận;
- đang chuẩn bị;
- đang giao;
- COD chờ thu;
- refund cần chuyển tay;
- SKU low/out of stock.

## 8. API/UI contract

Order resource thêm và chuẩn hóa:

```json
{
  "status": "processing",
  "payment_method": "cod",
  "payment": {
    "status": "pending",
    "amount": 12000000,
    "paid_amount": 0,
    "paid_at": null
  },
  "fulfillment": {
    "carrier_name": null,
    "tracking_number": null,
    "shipped_at": null,
    "delivered_at": null
  }
}
```

Admin list/detail luôn render badge riêng:

- `Đơn hàng: Đang chuẩn bị`
- `Thanh toán: Chưa thu — COD`

Admin actions:

- confirm order;
- mark shipped + optional carrier/tracking;
- confirm delivered and COD collected;
- cancel;
- existing refund/manual payout actions theo permission.

Customer timeline dùng order status; payment card dùng payment status. Không diễn giải `processing` là đã thanh toán.

## 9. Migration và tương thích

Migration production phải additive/backward-compatible:

1. Mở rộng payments để biểu diễn COD/waived và các metadata thu tiền.
2. Backfill payment cho order COD hiện có: tất cả COD legacy, kể cả `delivered`, được tạo payment `pending` và đưa vào
   danh sách xác minh thủ công vì schema cũ không có payment row/actor/paid timestamp — không có bằng chứng đủ tin cậy
   để tự backfill paid. Chỉ payment PayOS legacy có row `gateway=payos`, `status=success`, transaction ID unique và
   amount khớp order total mới backfill `paid`; order total bằng 0 backfill `waived`. Không dùng riêng `orders.status`
   hay ghi chú tự do làm bằng chứng thanh toán.
3. Thêm shipping timestamps/metadata nullable.
4. Tạo stock movements; không bịa lịch sử chi tiết trước migration. Tại thời điểm data migration chạy, với mỗi
   variant ghi đúng một movement `type=opening_balance`, `quantity_delta=stock_quantity` hiện tại,
   `stock_before=0`, `stock_after=stock_quantity` hiện tại, và
   `reserved_before=reserved_after=reserved_quantity` hiện tại. Dùng idempotency key
   `variant:{id}:opening_balance`; nếu key đã tồn tại thì re-read/skip, tuyệt đối không tạo lại hoặc cộng delta lần hai.
   Fresh database chưa có variant tại thời điểm migration thì không sinh opening movement; variant tạo mới sau đó phải
   nhận tồn qua `receive|adjustment`, không giả làm dữ liệu legacy.
5. Deploy code đọc được cả legacy/new state trước; backfill; rồi mới ngừng ghi legacy `paid|pending_payment` order states.

Không chạy migration production bằng agent; pipeline release chịu trách nhiệm.

## 10. Invariants bắt buộc

1. Một order chỉ thuộc một customer; staff không mua hàng.
2. Trong MVP `paid_amount` chỉ là `0` hoặc đúng bằng `payment.amount`; payment `paid` bắt buộc
   `paid_amount == amount`. Refund không vượt paid amount.
3. COD không paid nếu chưa có actor/timestamp xác nhận thu và amount không khớp chính xác.
4. PayOS không paid từ query string/FE state; webhook thiếu/sai signature bị reject trước mọi side effect và được log.
5. `available_stock = stock_quantity - reserved_quantity >= 0`.
6. Mỗi reserve/commit/release/restock business event tác động đúng một lần bằng pessimistic row locks, state re-check
   và unique stock-movement business key.
7. Cancel/refund/delivery actions lock và idempotent.
8. Dashboard không cộng COD pending vào cash collected/net revenue.
9. Snapshot order không đổi khi product/variant/catalog price đổi.
10. `cloudinary_id` không serialize và migration không phá các guardrail hiện có.

## 11. Acceptance scenarios

1. COD mới đặt: order chờ xác nhận, payment pending, revenue không đổi, stock reserved.
2. COD xác nhận: order processing, inventory commit một lần, payment vẫn pending.
3. COD giao + thu: order delivered, payment paid với actor/time, revenue tăng đúng một lần.
4. COD hủy trước xác nhận: release reservation, voucher release, không refund.
5. COD hủy sau xác nhận trước giao: restock, voucher release, không refund.
6. PayOS thành công: payment paid, inventory commit một lần, order vẫn chờ staff xác nhận.
7. PayOS webhook lặp: không double commit/doanh thu.
8. PayOS hủy trước giao: order cancelled, stock restock/release đúng phase, refund record + manual payout reminder.
9. Đơn 0 đồng: waived, không PayOS, không cash revenue.
10. Dashboard ngày/tuần/tháng phân biệt order value, collected, refunds, net và COD receivable.
11. COD thu thiếu/thừa: trả `COD_AMOUNT_MISMATCH`; order vẫn shipped, payment pending, revenue/stock không đổi.
12. Không thể cancel trực tiếp shipped; giao thất bại chưa restock, chỉ `returned_to_store` mới cho cancel/restock.
13. Webhook signature sai hoặc amount/order identity không khớp: HTTP 400, security log, không side effect.
14. Webhook và reconcile chạy đồng thời: một transition paid, một inventory commit và một movement/event.
15. Expiry scheduler tranh chấp webhook: row-lock winner quyết định; loser re-check và không release/commit ngược.

## 12. Quyết định nối tiếp sau commerce core

Sau khi spec này triển khai và ổn định mới lần lượt đặc tả:

1. Inventory reporting + low-stock operations.
2. Merchandising: featured collection, best seller, new arrivals, related/complementary.
3. Pricing/promotion: scheduled sale, voucher distribution và combination policy.
4. Return workflow.
5. Flash sale nếu còn thời gian.
