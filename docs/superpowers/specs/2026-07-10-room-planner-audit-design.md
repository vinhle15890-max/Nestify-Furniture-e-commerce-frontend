# Room Planner — Audit end-to-end & sửa lỗi hành vi

**Date:** 2026-07-10
**Repos:** FE `Nestify-Furniture-e-commerce-frontend` + BE `Nestify-Furniture-e-commerce-backend`.
**Bối cảnh:** vụ "bắt tường" (unit test xanh nhưng người dùng không thấy hoạt động vì hiệu ứng bị
clamp che) cho thấy **test xanh ≠ chạy được**. Cần rà lại TOÀN BỘ Room Planner theo *hành vi thật*.

## 1. Mục tiêu

Với **mỗi** chức năng Room Planner: (a) phát biểu **hành vi ĐÚNG kỳ vọng**, (b) **truy vết đường
chạy thật** (store → render → R3F / API → DB), (c) kết luận Đạt / Lỗi, (d) **sửa mọi điểm sai** (ưu
tiên loại "xanh-mà-hỏng": logic đúng trên giấy nhưng vô hiệu/không cảm nhận được khi chạy thật).

Không chỉ chạy suite + lint — đó là điều kiện cần, không đủ.

## 2. Phạm vi

**Trong:** toàn bộ Room Planner FE + hợp đồng BE liên quan (resource/endpoint/guardrail). Cả tính năng
cũ (deep-link, cart-handoff, becoming-migration, editor) lẫn mới phiên này (footprint/chồng-lấn/kẹp-
tường/mốc-tỉ-lệ/bắt-tường, shared-loop, snapshot).

**Ngoài:** storefront ngoài planner (catalog/checkout/PayOS/SEO/admin) — audit riêng nếu cần. Không
thêm tính năng mới; chỉ sửa lỗi + thiếu sót của tính năng đã có.

## 3. Phương pháp (bắt buộc)

1. **Checklist-first:** lập bảng đầy đủ mọi flow TRƯỚC khi quét (mục 5), không ad-hoc.
2. **Định nghĩa hành vi đúng** cho từng mục (một câu, kiểm được).
3. **Trace đường chạy thật**, đặc biệt chỗ 3D không chạy được ở sandbox → đọc code path (React
   render prop → R3F applyProps → three object; store selector → re-render), không suy từ unit test.
4. **Săn "xanh-mà-hỏng"** bằng danh sách nghi vấn ưu tiên (mục 4).
5. **Sửa tại gốc** + thêm/again test hồi quy nơi có thể; chỗ chỉ kiểm được bằng mắt → ghi rõ "user
   kiểm hình" kèm bước tái hiện.
6. Guardrail giữ nguyên: KHÔNG commit; migration user chạy prod; `cloudinary_id`/`preview_public_id`
   không serialize; chỉ customer mua được.

## 4. Danh sách nghi vấn "xanh-mà-hỏng" (verify TRƯỚC)

| # | Nghi vấn | Vì sao rủi ro |
|---|---|---|
| R1 | **Snapshot lần TẠO MỚI**: `handleSave` gọi `capturePlannerPreview()` SAU khi `ensureSaved` đã `navigate('/room-planner/{id}', replace)`. Điều hướng có thể remount RoomCanvas → `unregisterPlannerCanvas` chạy → canvas = null → preview rỗng ở lần lưu đầu. | Đúng loại lỗi trình tự vô hình; test không bắt. |
| R2 | **Capture ra ảnh trắng**: R3F frameloop "demand" có thể không giữ buffer đúng lúc `toDataURL/drawImage`; `preserveDrawingBuffer` cần + canvas phải vừa render. | Không kiểm được bằng unit test; sandbox không chạy 3D. |
| R3 | **Marker chồng lấn `ink` opacity 0.15** có thể mờ tới mức vô hình (đúng bài học bắt-tường). | Hiệu ứng thị giác chưa ai thấy thật. |
| R4 | **Mốc tỉ lệ kéo được**: TransformControls trên bóng người có tranh chấp với chọn/di chuyển đồ nội thất + orbit không? | Hai gizmo cùng lúc; chưa kiểm hình. |
| R5 | **Kẹp size-aware khi footprint chưa đo**: trước khi `onMeasure` chạy, footprint = {1,1,1}; món to bị kẹp sai/nhấp nháy khi vừa thả. | Timing đo bất đồng bộ. |
| R6 | **BoM giá sau reload**: đường `items.variant.product.media` + ProductVariantResource phải cho `price`; nếu eager-load hụt → "—" khắp nơi. | Cross-stack, BE test chưa chạy sandbox. |
| R7 | **Shared add-all cho guest / hết hàng**: redirect login giữ `from`; best-effort đếm đúng. | Đã có test; xác nhận đường thật. |
| R8 | **Deep-link** `?product=&variant=`: điều kiện kép + 3 tầng fail còn đúng sau các thay đổi store (footprint/history)? | Store đổi shape nhiều lần. |

## 5. Checklist chức năng (đầy đủ — mỗi mục = 1 hành vi kiểm được)

**A. Editor core**
- A1 Room setup (RoomSetupDialog) tạo phòng đúng kích thước, vào trạng thái ready.
- A2 Thêm món từ CatalogTray → xuất hiện, được chọn, dirty=true.
- A3 Gizmo translate/rotate/scale commit đúng vào store (onMouseUp).
- A4 Floor-snap: model nằm trên sàn (baseOffset), không lún/bay.
- A5 Chọn/bỏ chọn (click món / click nền).
- A6 Xoá / reset transform.
- A7 Undo/redo (bao gồm add/transform/delete/duplicate; footprint/snap KHÔNG vào history).
- A8 Nhân bản (+0.3m, clamp, chọn bản sao).
- A9 Phím tắt (Del/Ctrl+Z/Y/D/Esc/1-2-3, guard input & status).
- A10 Grid snap 0.25m/15°.
- A11 **Wall snap** (vừa nâng 0.5m) — thả gần tường nhảy flush.
- A12 Mốc tỉ lệ: bóng người kéo được + cửa; toggle bật/tắt.
- A13 Footprint đo từ GLB → store; kẹp tường theo kích thước; cảnh báo chồng lấn (marker + notice).

**B. Commerce**
- B1 BoM (RoomSummary/summarizeItems): tên·×qty·giá, "—" khi thiếu giá, tổng, disclaimer.
- B2 "Đặt cả phòng" → ensureSaved → addSceneToCart → /checkout.
- B3 "Thêm vào giỏ" → addSceneToCart + callback imagined ở Cart (room_scene_id).

**C. Scene lifecycle**
- C1 My Rooms: list, đổi tên (PATCH), xoá (confirm), pagination.
- C2 Card ảnh: preview_url → img; chưa có → BecomingRoomArt.
- C3 Share: tạo token + ShareSceneDialog copy link.
- C4 Shared viewer công khai read-only, cho mobile, 404 thân thiện.
- C5 Shared-loop: danh sách SP (+link /p/slug) + "Thêm cả phòng vào giỏ" (guest→login, best-effort).
- C6 Snapshot: chụp lúc Lưu → upload → card cập nhật.

**D. Capability boundary**
- D1 WebGL không hỗ trợ → fallback (không mount Canvas).
- D2 Mất context runtime → overlay khôi phục.
- D3 Màn nhỏ → SmallScreenNotice (editor chặn), nhưng shared cho mobile.
- D4 Model lỗi/thiếu → PlaceholderBox (ModelErrorBoundary), footprint vẫn {1,1,1}.

**E. BE hợp đồng**
- E1 RoomSceneResource: items + variant enrich (price/thumbnail) + preview_url; KHÔNG preview_public_id/cloudinary_id.
- E2 Endpoints: index/show/store/update/destroy/share/showByToken/add-to-cart/convert-to-order/preview — auth & ownership đúng.
- E3 attachPreview thay ảnh (destroyRaw old); delete dọn Cloudinary.
- E4 Chỉ customer mua (addSceneToCart/convert gate).

## 6. Đầu ra

- **Bảng verdict** mỗi mục (Đạt / Lỗi + mô tả) trong report `docs/superpowers/audits/2026-07-10-room-planner-audit-report.md`.
- **Mọi điểm Lỗi được sửa** (commit-free), có test hồi quy nơi tự động hoá được.
- Mục chỉ kiểm được bằng mắt → ghi bước tái hiện cho user.
- Suite + lint xanh cuối cùng; BE `php -l` + user chạy `--filter=RoomScene`.

## 7. Không làm

Tính năng mới; audit ngoài Room Planner; đổi Design DNA; commit.
