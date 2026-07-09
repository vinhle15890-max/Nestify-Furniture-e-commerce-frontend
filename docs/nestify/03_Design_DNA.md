# Nestify — Design DNA v0.1 (Part 1: Foundation)

*Kế thừa từ Brand Constitution (mục 10, Design Philosophy) và Story Bible (6 chapter). Mọi token trong tài liệu này phải derive được từ 2 nguồn đó — không thêm màu/font/rule nào không truy được về một quyết định đã chốt ở tầng trên.*

---

## 0. Design Principles (derive trực tiếp từ Constitution mục 10)

"Chúng tôi không thiết kế giao diện. Chúng tôi thiết kế quyết định." Từ câu gốc này, 4 rule thực thi:

Mỗi thành phần UI phải trả lời được câu hỏi ở Constitution mục 9 (Experience Principles) — nếu không giúp hình dung/thử nghiệm/quyết định, loại bỏ, bất kể nó đẹp thế nào.

Không dùng ngôn ngữ thị giác của 3 default AI-generated pattern đã xác định trước đó trong dự án: không cream+serif+terracotta, không dark+neon accent, không broadsheet-hairline. Ba pattern này đọc như mặc định, không phải lựa chọn — sai với Openness=90 trong Personality (Constitution mục 7), vốn đòi hỏi layout dám khác khuôn e-commerce thông thường.

Màu sắc mang nghĩa chức năng, không trang trí — mỗi màu phải gắn với đúng 1 trạng thái trong Story Bible, việc này chi tiết ở mục 2.

Vì Enemy là "fear of irreversible decisions" (Constitution mục 2), mọi affordance liên quan đến thử/sửa/hoàn tác phải được thiết kế để cảm thấy **rẻ** — dễ đảo ngược, không nặng nề như một cam kết.

---

## 1. Signature Element — "The Becoming Room"

Một minh họa/rendering căn phòng chuyển dần từ trạng thái outline trống (Chapter 1 — Possibility) sang phối cảnh đầy đủ, có đồ nội thất, ánh sáng (Chapter 4 — Future Home). Đây là motif thị giác duy nhất được phép lặp lại xuyên site, vì nó kể đúng câu chuyện của **không gian người dùng**, không phải năng lực của công cụ (đã loại bỏ hướng "fit-indicator kỹ thuật" ở phiên bản trước vì lệch với "main character is the user, not the planner").

Biến thể theo trang, tất cả cùng 1 motif, khác mức độ hoàn thiện:
- Home (Threshold, tiền-Chapter 1): phòng ở dạng outline `unbuilt`, một phối cảnh một-điểm-tụ **tĩnh**, được thắp bằng đúng 1 vệt ánh sáng `canvas` phẳng từ cửa sổ (atmosphere, không gradient/shadow). Chứa **đúng 1 dấu-hiệu-cư-ngụ** cực kỳ kiềm chế (ghế, outline `emerging`) — *presence, không phải demonstration*. Thứ bậc: **Light → Room → Chair**. Xem Story Bible §"Threshold (tiền-Chapter 1)" (đã cập nhật 2026-07-09 "Threshold-with-presence") và component `src/components/home/Hero.jsx`. **Lịch sử:** hướng "trải nghiệm chơi được" cũ (ghost → measure → materialize, spec `2026-07-06-hero-becoming-room-interaction-design.md`, component `BecomingRoom.jsx`) đã bị review "Hero-as-Threshold" thay thế — Threshold không transform/teach/demonstrate/resolve; những việc đó thuộc chapter thật.
- Product Listing/Detail (Chapter 2 / Exploratory Commitment): outline + 1 silhouette đơn lẻ của món đồ đang xem, phần còn lại của phòng vẫn là outline.
- Room Planner (Chapter 3–4): trạng thái động thật, không phải minh họa — đây là nơi "becoming" xảy ra thật, không mô phỏng.
- Ownership/Purchase (Chapter 5–6, Cart): phối cảnh gần hoàn thiện, tông màu ấm nhất trong toàn bộ dải biến thể.

### Ba luật thiết kế (product-wide) sinh ra từ "The Becoming Room"

Ba luật này là bất biến, áp cho toàn bộ sản phẩm — không chỉ hero:

1. **Visualization gates `imagined`.** `imagined` chỉ được xuất hiện *sau* một hành động visualize do người dùng chủ động kích hoạt. Trên Home hero, visualize đó giới hạn ở đúng 1 món đồ người dùng đặt; bản thân căn phòng vẫn ở trạng thái `unbuilt`. (Thay cho ghi chú cũ "Home chưa có màu imagined" — nay nói chính xác *khi nào* imagined được phép xuất hiện.)

2. **The interaction teaches before it demonstrates.** Hero là *Lesson 0*, Room Planner là *Lesson 1*: làm cử chỉ một lần là đã học xong mô hình tư duy của Planner, nên Planner không cần tooltip / coach-mark / video intro. Một tương tác có mặt là để **dạy cách ra quyết định**, không phải để khoe.

3. **The brand is understood through interaction, not explanation.** Nestify tránh intro video, tooltip, coach-mark, intro modal. Ý nghĩa sản phẩm truyền qua việc *làm*, không phải việc *được kể*. Hệ quả: *nếu một tương tác cần tooltip mới hiểu được, thì tương tác đó chưa đủ tốt* — sửa tương tác, đừng thêm nhãn.

---

## 2. Color System

Palette phái sinh trực tiếp từ chính trục "becoming" — không phải từ chất liệu vật lý (đã loại vì Nestify không có origin thủ công thật) và không phải từ ngôn ngữ bản vẽ kỹ thuật (đã loại vì mang tính chỉ định, sai với "never dictate"). Mỗi màu gắn với đúng 1 điểm trên trục Possibility → Future Home.

| Token | Hex | Vai trò | Chapter gắn liền |
|---|---|---|---|
| `canvas` | `#F2F0EB` | Nền mặc định toàn site | Trung tính — nền cho mọi chapter |
| `ink` | `#26262B` | Văn bản chính | Trung tính |
| `unbuilt` | `#C9C4B8` | Outline, trạng thái trống/chưa quyết định | Possibility, Discover |
| `emerging` | `#8A7C68` | Trạng thái trung gian — đang cân nhắc, chưa chắc | Exploratory Commitment, Experiment |
| `imagined` | `#B5754A` | Trạng thái đã hình dung rõ, ấm nhất trong dải | Future Home, Ownership |
| `confirmed` | `#3D5A45` | Xanh trầm, dùng đúng 1 khoảnh khắc — xác nhận hoàn tất | Purchase (duy nhất) |

Quy tắc bắt buộc: `imagined` không được dùng làm màu CTA mặc định toàn site (ví dụ nút "Thêm vào giỏ" lặp lại khắp nơi) — nếu dùng tràn lan, nó mất nghĩa "khoảnh khắc nhìn thấy tương lai" và trở thành màu trang trí thông thường, đúng lỗi mà nguyên tắc "màu mang nghĩa" ở mục 0 cấm. `confirmed` chỉ xuất hiện ở đúng hành động xác nhận tại Checkout — dùng lặp lại ở nơi khác sẽ làm loãng tín hiệu.

Đã loại bỏ hoàn toàn: cream #F4F1EA (quá gần AI-tell đã xác định), terracotta #D97757 (trùng chính màu tương tác của Claude, dễ bị nhận diện là AI-generated), toàn bộ hướng blueline/CAD (mang tính chỉ định, sai personality).

---

## 3. Typography

Hai vai trò, phái sinh từ Voice 70% Airbnb / 30% Notion (Constitution mục 8) — ấm áp + rõ ràng, không phải lạnh thuần kỹ thuật và không phải trang trí thuần cảm xúc.

**Display face** — dùng cho H1/H2, tên chapter, moment "Future Home": một serif hoặc humanist sans có tính cách ấm, không phải grotesk lạnh. Cân nhắc **Fraunces** (serif có warmth, độ tương phản vừa phải, không quá trang trọng cổ điển) hoặc **General Sans** nếu muốn giữ sans nhưng vẫn có nhân dạng — tránh Inter/Söhne làm display vì hai font này đã là mặc định của rất nhiều AI-generated site, sẽ đọc như default dù màu sắc đã đổi.

**Body face** — humanist sans dễ đọc dài, trung tính về cảm xúc để không cạnh tranh với display: **Public Sans** hoặc **Inter** (chỉ dùng Inter ở vai trò body, không ở display, để tránh lặp lại default toàn phần).

**Numeric/utility face** — riêng cho con số đo lường trong Room Planner (kích thước, m², cm): một grotesk có số liệu rõ ràng, tabular figures — đây là chỗ duy nhất được phép "lạnh" hơn phần còn lại, vì tính chính xác ở đây là thật (Conscientiousness=85, Constitution mục 7), không phải trang trí.

Type scale: base 16px, tỷ lệ 1.25 (major third) cho các cấp heading — đủ tương phản để display face có không gian thể hiện cá tính, không cần scale kịch tính kiểu 1.5+ vì Extraversion thấp (30) không đòi hỏi kiểu chữ "hét to".

---

## 4. Grid & Spacing

Không dùng grid 12-column mặc định của e-commerce. Layout module bám theo tỷ lệ khung phòng (room aspect ratio, gần 4:3 hoặc 3:2 tùy loại phòng phổ biến) ở các trang có liên hệ trực tiếp đến "becoming room" — Home, Product Detail, Planner. Các trang thuần liệt kê (Product Listing, Collections) dùng grid card thông thường vì nội dung ở đó là danh sách thật, ép vào ẩn dụ phòng sẽ giả tạo và cản trở việc so sánh nhanh.

Spacing scale: hệ 8px (8/16/24/32/48/64/96), nhất quán toàn site. Không dùng spacing bất đối xứng ngẫu hứng — Conscientiousness cao đòi hỏi spacing có thể dự đoán được, dù display face và signature element được phép biểu cảm.

Đường kẻ/hairline: chỉ dùng khi mang nghĩa thật (ví dụ viền outline của "unbuilt" trong signature element), không dùng như rule trang trí phân cách section — đây là anti-pattern broadsheet đã loại ở mục 0.

---

*Hết Part 1. Part 2 sẽ gồm: Motion, Component Philosophy, Icon System, và tích hợp thị giác với Room Planner (bám theo constraint kỹ thuật thật đã xác nhận trước đó — Three.js/R3F, lazy-loaded chunk, asset weight không kiểm soát, thiếu WebGL fallback).*
