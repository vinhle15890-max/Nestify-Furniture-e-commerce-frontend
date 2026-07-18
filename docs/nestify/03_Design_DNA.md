# Nestify — Design DNA v0.2

*Kế thừa từ Brand Constitution (mục 10, Design Philosophy) và Story Bible.
Tài liệu này sở hữu identity semantic: ý nghĩa màu, vai trò typography, và ý
nghĩa narrative của signature motif. Visual execution — composition, line,
depth, light, illustration, photography, rhythm, responsive hierarchy, và
visual review — thuộc 04_Visual_Grammar.md. Component behavior thuộc
05_Component_Bible.md.*

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
- Home (Threshold, tiền-Chapter 1): spatial cue ở semantic state `unbuilt`;
  không có user visualization hoặc `imagined`. Static habitation presence chỉ
  hợp lệ theo Story Bible Threshold. Visual execution thuộc
  04_Visual_Grammar.md.
- Product Listing/Detail (Discover / Exploratory Commitment): nếu dùng spatial
  cue, nó chỉ tham chiếu một product/context liên quan, không mô phỏng Planner
  hoặc dùng generic furniture thay cho món đồ đang xem. Visual execution thuộc
  04_Visual_Grammar.md.
- Room Planner (Chapter 3–4): trạng thái động thật, không phải minh họa — đây
  là nơi "becoming" xảy ra thật, không mô phỏng.
- Ownership/Purchase (Chapter 5–6, Cart): chỉ sau spatial evidence thật mới
  được dùng ngữ nghĩa Future Home / Ownership theo Story Bible và Component
  Bible.

### Ba luật thiết kế (product-wide) sinh ra từ "The Becoming Room"

Ba luật này là bất biến, áp cho toàn bộ sản phẩm — không chỉ hero:

1. **Visualization gates `imagined`.** `imagined` chỉ được xuất hiện sau
   một hành động visualize do người dùng chủ động kích hoạt trong spatial scene
   sống của họ. Home Hero là Threshold tĩnh: không có hành động visualize, không
   có món đồ người dùng đặt, và không dùng `imagined` để giải quyết câu hỏi của
   căn phòng.

   **Ngoại lệ — depiction biên tập (cập nhật 2026-07-09).** Luật "visualization gates" ở trên chi phối *trạng thái phòng sống của chính người dùng* và *màu CTA*. Nó KHÔNG cấm dùng `imagined` như **hình minh hoạ tĩnh, phi-tương-tác** để *vẽ khái niệm* chương Future Home ở các surface giải thích/marketing (ví dụ section "Từ căn phòng trống đến của bạn" trên Home). Ràng buộc của ngoại lệ: (a) chỉ là minh hoạ, không phải phòng thật của người dùng; (b) không bao giờ là màu của nút/CTA/tương tác; (c) kiềm chế (fill nhạt), và (d) chỉ ở đúng mức "Future Home" của thang becoming. Nếu vi phạm bất kỳ điều nào trong (a)–(d), quay về luật gốc.

2. **Interaction belongs to its owning state.** Một interaction chỉ được dạy
   mental model của state mà nó thuộc về. Threshold không có Lesson 0 và không
   mô phỏng Planner; direct manipulation bắt đầu trong Room Planner, nơi
   Experiment và Future Home xảy ra thật.

3. **Do not simulate a future experience as explanation.** Một surface có thể
   gợi một state bằng static editorial depiction, nhưng không được giả lập
   capability của state đó để giải thích sản phẩm. Khi một capability cần được
   hiểu, trải nghiệm thật ở state sở hữu nó phải làm công việc đó.

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

---

## Scope boundary

Design DNA không sở hữu visual composition hoặc art direction chi tiết. Đọc
04_Visual_Grammar.md để quyết định một frame trông và được review như thế nào.
Đọc 05_Component_Bible.md để quyết định component hành xử theo psychological
state thế nào. Giá trị token triển khai nằm ở token implementation layer; không
thêm bảng giá trị song song trong tài liệu này.
