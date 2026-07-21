# Nestify Phase 3 — Responsive review packet

Ngày lập: 2026-07-20

## Phạm vi và cách đọc

Đây là gói hỗ trợ **human visual sign-off**, không phải kết quả visual regression và không thay thế việc xem giao diện thật trên thiết bị. Mọi breakpoint bên dưới được ghi là **structural audit**: rà soát DOM, responsive rules, thứ tự nội dung, khả năng cuộn, accessible name/focus và các test tương tác hiện có. Môi trường thực thi này không cung cấp so sánh pixel, vì vậy cột “Cần xem bằng mắt” phải được hoàn tất trước khi ship.

Breakpoint bắt buộc cho mọi bề mặt: **320, 375, 414, 768 và desktop ≥ 1024 px**.

Quy ước trạng thái:

- `Đã exercise`: có test tương tác hoặc test component trực tiếp.
- `Đã audit source`: cấu trúc và responsive rule đã được kiểm tra, chưa phải bằng chứng thị giác.
- `Cần fixture`: cần dữ liệu/API fixture cụ thể trong phiên human review.

## Ma trận kiểm duyệt

### Home

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Nội dung một cột; CTA và media giữ thứ tự đọc | Default, focus: đã exercise; loading/error/empty: không áp dụng cho các beat tĩnh | Nhịp dọc hero–starting points; crop ảnh ở chiều cao ngắn |
| 375 | Như 320, khoảng đệm tăng theo token | Default, hover/focus: đã audit source | Độ dài dòng proposition tiếng Việt |
| 414 | Card/route forward không tạo cuộn ngang | Default, hover/focus: đã audit source | Khoảng trắng trước footer close |
| 768 | Các cụm editorial chuyển grid nhưng giữ thứ tự DOM | Default, hover/focus: đã audit source | Cân bằng text/media và chiều cao card |
| Desktop | Hành trình giữ 5–6 beat, một CTA chính mỗi beat | Default, hover/focus: đã audit source | Crop hero, max-width và nhịp toàn trang |

### Catalog

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Grid 2 cột; filter mở drawer; giá/tên luôn hiện | Default, filter open/close, focus, empty, error, skeleton: đã exercise | Card rất hẹp với tên/giá dài; target wishlist |
| 375 | Grid 2 cột; URL giữ search/filter/sort | Default, hover/focus, loading: đã exercise | Nhịp giữa toolbar và result count |
| 414 | Grid 2 cột, drawer không vượt viewport | Default, error/empty: đã exercise | Dòng differentiator dài |
| 768 | Grid 3 cột; control chuyển tiếp không nhân đôi primary CTA | Default, filter/sort/focus: đã exercise | Mật độ card ở tablet portrait |
| Desktop | Grid 4 cột và control filter/sort thường trực | Default, hover/focus, empty/error/loading: đã exercise | Alignment ảnh khác tỉ lệ; provisional count copy |

### Product detail

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Decision rail tuyến tính; gallery button có một accessible name | Default, variant, quantity, focus, loading/error: đã exercise | Gallery height và rail dài trên màn hình thấp |
| 375 | Trust fact nằm cạnh control liên quan | Default, unavailable variant: đã exercise | Wrap giá/đơn vị và touch spacing |
| 414 | Specification table cuộn/bao dòng trong viewport | Default, model fidelity states: đã exercise | Nhịp table trước reviews |
| 768 | Gallery/rail chuyển bố cục không đổi thứ tự quyết định | Default, focus/hover: đã audit source | Điểm chuyển sticky rail |
| Desktop | Rail sticky; cart là commerce primary; 3D là hành động hỗ trợ | Default, loading, unconfirmed fidelity: đã exercise | Sticky offset với header; gallery whitespace |

### Room Planner

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Không dựng WebGL; hiển thị so sánh kích thước 2D và continuation URL | Fallback default, room/items, focus, unavailable WebGL: đã exercise | Diagram ở tên sản phẩm dài; thao tác copy URL |
| 375 | Fallback giữ số đo và reference trong một cột | Default/empty: đã exercise | Khả năng đọc footprint ratios |
| 414 | Không có canvas giả; quyết định sizing vẫn dùng được | Default/error capability: đã exercise | Khoảng trắng và hierarchy thông báo |
| 768 | Vẫn dùng fallback theo capability boundary hiện tại (<1024) | Default, room loaded/unsaved: đã exercise | Kỳ vọng người dùng tablet landscape |
| Desktop | Top bar, library rail, canvas, inspector, completion area; 12 control có accessible name/focus | Selection, keyboard place/move/rotate/confirm/cancel, clamp riêng khi wall-snap off, wall-snap riêng, undo/redo, review loading/error/unavailable: đã exercise | Rail widths ở 1024; context control che model; menu nổi; canvas performance thật |

Ràng buộc hình học đã kiểm riêng: boundary clamp buộc `wallSnap=false`; wall snap bật riêng và bắt đầu ngoài vùng clamp. Không dùng cùng một con số làm bằng chứng cho hai cơ chế.

### Cart

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Item theo phòng xếp dọc; room preview là bằng chứng, không phải promotion | Default, quantity, remove, empty, error/loading: đã exercise | Preview nhỏ và tên variant dài |
| 375 | Summary theo sau danh sách, không cạnh tranh CTA | Default/focus: đã audit source | Khoảng cách nhóm phòng |
| 414 | Số tiền dùng hệ numeric chung, không tràn | Default/error: đã exercise | Wrap tổng tiền và voucher copy |
| 768 | Nhóm phòng còn rõ khi summary chuyển cột | Default/hover/focus: đã audit source | Cân bằng preview–line item |
| Desktop | Room groups và order summary phân vùng rõ | Default/empty/loading: đã exercise | Sticky summary và ảnh nhiều tỉ lệ |

### Checkout

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Form một cột; lỗi gắn field; tổng thanh toán không che action | Default, validation error, submitting, recovery: đã exercise | Bàn phím mobile và scroll-to-error thật |
| 375 | Address/payment labels dùng customer language | Default/error/focus: đã exercise | Dòng địa chỉ dài |
| 414 | Numeric totals không tràn | Default/loading: đã exercise | Khoảng cách payment method |
| 768 | Form/summary chuyển bố cục nhưng chỉ một primary submit | Default/focus/error: đã audit source | Sticky summary transition |
| Desktop | Decision order và recovery state giữ nguyên business logic | Default, confirmed, stock/error recovery: đã exercise | Density của order summary |

### Account

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Latest room/order/saved rooms/wishlist xếp thành personal index | Default, no-room/no-order, loading/error: đã exercise | Tên phòng/order status dài |
| 375 | Profile/address là link phụ, không thành stat card | Default/focus: đã audit source | Nhịp giữa primary content và links phụ |
| 414 | Room preview không ép card quá cao | Default/empty: đã exercise | Crop preview |
| 768 | Grid mở rộng mà không trở lại dashboard tiles | Default/hover/focus: đã audit source | Trọng lượng thị giác các section |
| Desktop | Latest decision giữ ưu tiên; navigation yên tĩnh | Default/loading/error: đã exercise | Max-width và whitespace toàn trang |

### Auth

| Breakpoint | Kết quả structural audit | Trạng thái đã exercise/audit | Cần xem bằng mắt |
|---|---|---|---|
| 320 | Form hẹp, cue không gian không đẩy field khỏi viewport | Default, validation, pending, server error, password reveal: đã exercise | Bàn phím mobile; chiều cao register |
| 375 | Requirement guidance hiện trước submit | Default/error/focus: đã exercise | Wrap guidance và footer link |
| 414 | Login/register giữ continuation query của guest room | Return-from-planner: đã exercise | Transition copy sau save guest |
| 768 | Off-axis composition giữ form là trọng tâm | Default/hover/focus: đã audit source | Cân bằng cue và form |
| Desktop | Không dùng generic 50:50 split; một primary submit | Default/error/loading: đã exercise | Whitespace và vertical centering |

## Checklist phiên human visual sign-off

Chạy trên ít nhất Chrome + Safari/WebKit và một thiết bị touch thật:

1. Mở từng surface tại 320, 375, 414, 768 và 1440 px; chụp default, error, empty và loading khi surface hỗ trợ.
2. Dùng Tab/Shift+Tab để kiểm focus ring, thứ tự focus và không có control bị che bởi sticky/fixed regions.
3. Dùng touch để kiểm drawer, modal, quantity, gallery và Planner fallback; target không chồng nhau.
4. Với Planner desktop, kiểm model dài/rộng bất thường, inspector scroll, menu nổi, selection context và FPS trên GPU yếu.
5. Với reduced motion, zoom 200% và font-size hệ thống lớn, kiểm không mất nội dung hay primary action.
6. Ghi verdict `pass / needs fix / accepted risk` kèm ảnh và thiết bị cho từng hàng “Cần xem bằng mắt”.

## Rủi ro chưa thể đóng trong môi trường này

- Không có pixel-level comparison; mọi crop, optical alignment, line wrapping và perceived density vẫn cần human sign-off.
- Không có thiết bị iOS/Android thật để xác nhận viewport chrome, bàn phím ảo và touch latency.
- Không có GPU matrix để định lượng WebGL performance perception; fallback đã có nhưng ngưỡng/capability cần kiểm trên phần cứng thật.
- Moderated usability testing với người mua nhà lần đầu, người mua căn hộ và người quay lại phòng đã lưu vẫn là bước follow-up bắt buộc.
- Thiết lập visual regression là một infrastructure task riêng, nằm ngoài Phase 3 này.
