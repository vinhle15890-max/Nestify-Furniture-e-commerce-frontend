# Nestify — Component Bible v0.1 (Part 1: State 1–2)

*Kế thừa từ Design DNA (Color System mục 2, Visual Grammar mục 1). Design DNA định nghĩa ngôn ngữ (vì sao màu, chữ, grammar tồn tại); tài liệu này định nghĩa hành vi (ngôn ngữ đó hiện thực hóa thành component thế nào trong từng trạng thái tâm lý). Tổ chức theo Psychological State, không theo tên component — xem lý do ở Design DNA mục 0 (tránh overfit vào cấu trúc hiện tại).*

Cấu trúc 4 tầng cho mỗi state: **Psychological State → UX Pattern → Component Behavior → Visual Spec**. Component cụ thể (Button, Card...) chỉ xuất hiện ở tầng thấp nhất, và được tổng hợp lại trong Appendix cuối tài liệu để tra cứu nhanh — Appendix không phải điểm bắt đầu khi thiết kế, nó chỉ là chỉ mục ngược.

---

## State 1 — Not Yet Seen

**UX Pattern:** Reveal possibility — nội dung xuất hiện như một gợi ý, không phải một khẳng định. Người dùng chưa cam kết nhận thức vào bất kỳ lựa chọn nào (Story Bible: Possibility, Discover).

**Component Behavior:**

Card ở state này reveal thông tin theo lớp — không phơi bày toàn bộ chi tiết (giá, thông số) ngay từ cái nhìn đầu tiên, tránh cảm giác bị ép so sánh quá sớm. Never overwhelm: tối đa 1 điểm nhấn thị giác mỗi card (ảnh hoặc 1 câu mô tả ngắn, không cả hai cùng lúc ở mức nổi bật ngang nhau).

Button ở state này giữ secondary emphasis — không có CTA nào mang màu `imagined` hay `confirmed` (Design DNA mục 2) ở đây, vì người dùng chưa ở trạng thái Mentally Real hay Committed. Dùng `unbuilt` hoặc `ink` với outline nhẹ, phù hợp Visual Grammar "Outline → Material" ở giai đoạn còn là outline.

**Visual Spec:** border-radius nhất quán với Design DNA spacing scale; không dùng shadow đậm (shadow đậm ngụ ý "đã thành hình", sai với state Not Yet Seen). Border 1px `unbuilt`, không fill nền đậm.

---

## State 2 — Being Explored

**UX Pattern:** Comparison — người dùng bắt đầu cân nhắc cụ thể, cần so sánh giữa các lựa chọn hoặc giữa lựa chọn với không gian thật của họ (Story Bible: Exploratory Commitment ở Product Detail, Experiment ở Room Planner).

**Component Behavior:**

Card chuyển từ static sang expandable — hover hoặc tap mở rộng để lộ thêm chi tiết (chất liệu, kích thước), đúng nhịp độ "đang cân nhắc" chứ không phơi hết ngay như một trang thông số kỹ thuật.

Planner Preview: một dạng xem trước nhẹ (không phải phiên Room Planner đầy đủ) cho phép người dùng thấy sơ bộ trước khi cam kết bước vào trải nghiệm 3D đầy đủ — hành vi này giảm chi phí quyết định "có nên mở planner không", đúng nguyên tắc Design DNA mục 0: thử/sửa phải cảm thấy rẻ.

Hover state: dùng để lộ thông tin phụ (ví dụ dimension, số biến thể), không dùng để trigger hành động mua — hover trong state này chỉ phục vụ so sánh, không phục vụ chuyển đổi.

**Visual Spec:** màu `emerging` (Design DNA mục 2) xuất hiện ở đây làm accent cho trạng thái "đang khám phá" — ví dụ progress indicator nhỏ khi model 3D đang tải, hoặc border tô sáng nhẹ khi card được hover. Đây là ứng dụng đúng nghĩa của Visual Grammar "Sketch → Reality" — model 3D placeholder (`PlaceholderBox`, theo constraint kỹ thuật đã xác nhận trước đó) chính là biểu hiện "Sketch" trong khi asset thật đang tải, không phải lỗi hiển thị cần che giấu.

---

*Hết Part 1. Part 2 sẽ gồm State 3 (Mentally Real — Room Planner canvas, đo lường, ánh sáng), State 4 (Committed — Checkout), và micro-transition Cart (Transactional Commitment) nằm giữa State 3 và State 4 — phần này cần xử lý riêng vì Cart không thuộc gọn vào state nào, tương tự cách Story Bible đã xử lý Product Detail như micro-transition giữa Discover và Experiment.*


---

# Nestify — Component Bible v0.1 (Part 2: State 3–4 + Micro-transition Cart)

*Tiếp nối Part 1. Cấu trúc mỗi Intent: Psychological State → User Intent → UX Principle → Success Behavior (Trigger → Behavior → Feedback) → Failure Behavior → Visual Spec (+ Implementation Example). Chi tiết ánh xạ kỹ thuật (WebGL, asset loading, mobile...) nằm trong Engineering Mapping Appendix cuối tài liệu, không trộn vào phần chính.*

---

## State 3 — Mentally Real

Đây là state duy nhất có 3 Intent xảy ra xen kẽ trong cùng một phiên (continuous loop, Story Bible Chapter 3–4), không tuần tự.

### Capability Boundary (điều kiện vào State 3)

Không phải State mới, không phải Intent của State 3 — đây là một khái niệm đứng trước cả 3 Intent dưới đây, vì nó quyết định người dùng có vào được trải nghiệm hay không, trước khi bất kỳ Intent nào có cơ hội xảy ra. Failure Behavior (đã định nghĩa ở các Intent) giả định người dùng đã ở trong trải nghiệm và một phần bị lỗi; Capability Boundary xử lý trường hợp trải nghiệm chưa từng bắt đầu được — khác bản chất, không gộp chung.

Cấu trúc của một Capability Boundary: **Boundary Condition → Preserved Intent → Redirect Behavior → Re-entry Path**. Preserved Intent là phần quan trọng nhất — dù môi trường không cho phép vào State 3, cảm xúc/mục tiêu của người dùng (muốn hình dung không gian của mình) không được đánh mất, chỉ bị hoãn lại.

*Cùng họ cơ chế với Capability Boundary, nhưng ngược cực: Threshold (định nghĩa ở Story Bible, mục "Threshold (tiền-Chapter 1)") là cổng mời đứng trước toàn bộ arc — Capability Boundary chặn khi môi trường không đủ, Threshold tạo ra intent để người dùng tự bước qua. Không tạo thêm một khái niệm gate thứ ba trùng chức năng ở bất kỳ tài liệu nào khác.*

**Boundary — Môi trường không hỗ trợ 3D (không có WebGL):**
Boundary Condition: thiết bị/trình duyệt không thể khởi tạo context 3D.
Preserved Intent: người dùng vẫn muốn biết món đồ có vừa không — nhu cầu gốc không biến mất chỉ vì công cụ không chạy được.
Redirect Behavior: chuyển sang một đường dẫn thay thế giữ đúng mục tiêu bằng phương tiện khác (ví dụ nhập kích thước để so sánh bằng số liệu, không phải chỉ một thông báo lỗi cụt lủn).
Re-entry Path: nếu người dùng đổi thiết bị sau đó, dữ liệu phòng đã nhập (nếu có) cần được giữ lại, không bắt nhập lại từ đầu.

**Boundary — Màn hình nhỏ (dưới breakpoint hỗ trợ):**
Boundary Condition: đây là quyết định sản phẩm có chủ đích (không phải giới hạn kỹ thuật cứng như WebGL), tạm thời không hỗ trợ Planner đầy đủ trên màn hình nhỏ.
Preserved Intent: người dùng vẫn đang trong hành trình, chỉ đang dùng sai thiết bị tại đúng thời điểm — không nên đối xử như một lỗi.
Redirect Behavior: mời tiếp tục trên desktop, kèm một cách giữ lại ý định hiện tại (gửi link tiếp tục, hoặc lưu món đang xem vào danh sách để mở lại) — không chỉ là một thông báo tĩnh yêu cầu đổi thiết bị rồi kết thúc tương tác.
Re-entry Path: khi mở lại trên desktop (qua link hoặc tài khoản), vào thẳng State 3 với đúng ngữ cảnh đã lưu, không quay lại Discover từ đầu.

---

### Intent A: "Tôi muốn đặt đồ vào phòng và thấy nó thế nào."

**UX Principle:** Direct manipulation — hành động và kết quả xảy ra trong cùng một không gian nhìn thấy được, không qua bước trung gian (không có màn hình "đang xử lý" giữa đặt đồ và thấy kết quả).

**Success Behavior:**
Trigger: kéo/thả hoặc chọn một món đồ vào canvas phòng.
Behavior: món đồ xuất hiện đúng vị trí, đúng tỷ lệ với kích thước phòng đã nhập.
Feedback: object "materialize" tức thì tại điểm thả — biểu hiện trực tiếp của Visual Grammar "Outline → Material", không cần animation trung gian kéo dài.

**Failure Behavior:** nếu model chi tiết chưa sẵn sàng tại thời điểm thả, hiển thị ngay khối hình học đơn giản đúng kích thước thật (không phải spinner, không phải khoảng trống) — người dùng vẫn thấy được tỷ lệ/vị trí ngay lập tức, chi tiết vật liệu đến sau. Ưu tiên đúng thứ tự: kích thước đúng trước, vật liệu đẹp sau — vì mục tiêu của Intent này là "biết nó có vừa không", không phải "thấy nó đẹp thế nào".

**Visual Spec:** không dùng loading overlay che khuất canvas. `imagined` không xuất hiện ở khối placeholder — placeholder giữ tông trung tính, `imagined` chỉ xuất hiện khi vật liệu thật đã render.

**Implementation Example:** Room Planner Canvas — kéo thả item, fallback tạm thời bằng khối hộp cùng kích thước.

### Intent B: "Tôi muốn chỉnh sửa và xem lại nhiều lần mà không sợ mất công."

**UX Principle:** Cheap reversibility — trực tiếp phái sinh từ Enemy (fear of irreversible decisions, Constitution mục 2). Mọi thao tác thử ở state này phải cảm thấy rẻ hơn hẳn so với quyết định mua thật.

**Success Behavior:**
Trigger: di chuyển, xoay, hoặc xóa một item đã đặt.
Behavior: thay đổi áp dụng tức thì, không cần bước xác nhận trung gian ("Bạn có chắc muốn xóa?").
Feedback: có undo tức thì (ít nhất 1 bước gần nhất) hiển thị rõ ràng ngay sau hành động.

**Failure Behavior:** nếu một item bị xóa nhầm và người dùng không có undo khả dụng (ví dụ đã rời phiên), hệ thống không nên coi đây là lỗi im lặng — cần một tín hiệu rõ ràng rằng trạng thái đã thay đổi và cần lưu lại nếu muốn giữ, tránh lặp lại chính Enemy ở quy mô nhỏ (mất công sức không thể lấy lại).

**Visual Spec:** undo control dùng `ink` trung tính, không dùng `confirmed` (màu đó chỉ dành cho Committed) — undo không phải một cam kết, không nên mang tông màu của cam kết.

**Implementation Example:** Transform controls trên item đã đặt (di chuyển, xoay, xóa).

### Intent C: "Tôi muốn lưu lại để không mất công sức đã bỏ ra."

**UX Principle:** Save as insurance against irreversibility, không phải save như một thủ tục hành chính.

**Success Behavior:**
Trigger: bấm "Lưu phòng".
Behavior: toàn bộ scene (vị trí, item, kích thước phòng) được lưu lại gắn với tài khoản.
Feedback: xác nhận rõ ràng, ngắn gọn ("Đã lưu") — không cần diễn giải dài dòng, vì đây là hành động trấn an, không phải hành động cần thuyết phục.

**Failure Behavior:** nếu người dùng rời trang khi còn thay đổi chưa lưu, cảnh báo phải nêu rõ hậu quả cụ thể ("các thay đổi trong phòng này sẽ mất"), không dùng cảnh báo browser mặc định mơ hồ. Nếu người dùng chưa đăng nhập và bấm lưu, luồng đăng nhập không được xóa state hiện tại của phòng — yêu cầu đăng nhập giữa chừng không được là một hành động phá hủy công sức vừa bỏ ra.

**Visual Spec:** nút "Lưu" dùng `imagined` — đây là một trong số ít nơi hợp lệ để dùng màu này làm CTA, vì hành động lưu xảy ra đúng lúc trạng thái Mentally Real đang ở đỉnh điểm.

**Implementation Example:** nút "Lưu phòng" trong Room Planner.

---

## Micro-transition — Transactional Commitment (Cart)

Không thuộc gọn State 3 hay State 4, tương tự cách Product Detail được xử lý ở Story Bible.

### Intent: "Tôi muốn xác nhận lần cuối dựa trên điều tôi đã thấy, trước khi trả tiền."

**UX Principle:** Reaffirmation, không phải Persuasion — nếu Cart cần thuyết phục thêm về sản phẩm, nghĩa là Chapter 3–4 (Planner) chưa làm tốt việc của nó. Cart chỉ nhắc lại, không giới thiệu thêm.

**Success Behavior:**
Trigger: chuyển từ Planner (đã lưu) sang Cart.
Behavior: hiển thị lại chính hình ảnh/ngữ cảnh phòng đã xác nhận vừa, không phải ảnh sản phẩm cô lập kiểu catalog.
Feedback: một câu callback cụ thể ("Đã xác nhận vừa với phòng khách bạn đã tạo"), không phải copy bán hàng chung chung.

**Failure Behavior:** nếu người dùng vào thẳng Cart mà chưa từng qua Planner cho món đó (mua trực tiếp không qua trải nghiệm xem trước), không được giả vờ có một câu callback không tồn tại — trường hợp này Cart lùi về ngôn ngữ trung tính của Discover, không bịa ra một xác nhận giả.

**Visual Spec:** `imagined` tiếp tục xuất hiện ở đây (kế thừa từ Planner), chuẩn bị chuyển sang `confirmed` ở Checkout — đây là điểm chuyển màu duy nhất trong toàn bộ hệ thống, phản ánh đúng ranh giới tâm lý giữa hai state.

**Implementation Example:** Cart item card, có ảnh phòng thu nhỏ đính kèm nếu có.

---

## State 4 — Committed

### Intent: "Tôi muốn hoàn tất, không cần ai thuyết phục thêm."

**UX Principle:** Confirmation, không phải Conversion — ngôn ngữ tại đây là hoàn tất một việc đã quyết định, không phải chốt một giao dịch còn nghi ngờ.

**Success Behavior:**
Trigger: bấm nút thanh toán cuối cùng.
Behavior: xử lý ổn định, không có yếu tố bất ngờ (phí phát sinh, bước xác nhận mới chưa từng thấy trước đó).
Feedback: xác nhận hoàn tất rõ ràng, dứt khoát.

**Failure Behavior:** nếu thanh toán thất bại, thông báo phải nêu rõ nguyên nhân và bước tiếp theo cụ thể, không dùng thông báo lỗi chung chung — thất bại ở chính bước cuối cùng, sau khi người dùng đã trải qua toàn bộ hành trình tin tưởng, là nơi tệ nhất để mơ hồ.

**Visual Spec:** `confirmed` — chỉ dùng ở các khoảnh khắc **Committed** (State 4). Không bao giờ xuất hiện trước Committed (không ở State 1–3, không ở Transactional Commitment của Cart). Được phép xuất hiện ở mọi khoảnh khắc Committed thật: nút xác nhận cuối ở Checkout, và mọi màn xác nhận đơn thành công sau đó (vd. CheckoutReturnPage). Không giới hạn ở một vị trí DOM duy nhất — giới hạn ở một trạng thái tâm lý duy nhất.

**Implementation Example:** Checkout button.

---

## Engineering Mapping Appendix

*Tầng này ánh xạ Failure Behavior đã định nghĩa ở trên sang nguyên nhân kỹ thuật cụ thể, dựa trên constraint đã xác nhận của hệ thống thật (Three.js/R3F, GLTF theo variant, breakpoint mobile, persist theo save+login). Đội phát triển và AI-codegen đọc phần này để biết chính xác cần bắt lỗi ở đâu trong code — phần UX phía trên không cần và không nên nhắc tên công nghệ.*

| Nguyên nhân kỹ thuật | Cơ chế áp dụng |
|---|---|
| GLTF asset chưa tải xong (không có kiểm soát size/poly ở `model_3d_url`) | Intent A, State 3 — Failure Behavior: hiển thị khối hình học đúng kích thước trước, chi tiết vật liệu sau |
| Model load lỗi (404, file hỏng) | Intent A, State 3 — Failure Behavior: giữ nguyên `PlaceholderBox` qua `ModelErrorBoundary` đã có |
| Thiết bị không hỗ trợ WebGL (hiện chưa có detection quanh `<Canvas>`, đây là gap kỹ thuật thật cần vá) | Capability Boundary — "Môi trường không hỗ trợ 3D". Yêu cầu dev bổ sung detection trước khi mount Canvas |
| Mobile dưới breakpoint `lg` (Planner không mount, hiện SmallScreenNotice) | Capability Boundary — "Màn hình nhỏ". Cần bổ sung cơ chế giữ ngữ cảnh (share link/save) mà code hiện tại (`SmallScreenNotice` tĩnh) chưa có |
| Rời trang khi scene chưa lưu (chỉ có `beforeunload`, không có autosave/localStorage) | Intent C, State 3 — Failure Behavior: cảnh báo cụ thể, không dùng cảnh báo browser mặc định |
| Vào Cart không qua Planner (mua trực tiếp) | Micro-transition Cart — Failure Behavior: không bịa callback giả |

Capability Boundary và Failure Behavior là hai cơ chế khác nhau, không hoán đổi cho nhau: Capability Boundary chặn trước khi trải nghiệm bắt đầu (môi trường không đủ điều kiện), Failure Behavior xử lý khi trải nghiệm đã bắt đầu nhưng một phần không như ý muốn.
