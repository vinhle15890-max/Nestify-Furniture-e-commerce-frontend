# Room Planner — Audit Report (2026-07-10)

Phương pháp: trace hành vi thật (store → render → R3F/API), không chỉ dựa unit test.
Verdict: ✅ Đạt · 🔧 Lỗi đã sửa · 👁 Cần user kiểm hình (sandbox không chạy 3D/PHP).

## Nghi vấn "xanh-mà-hỏng" (R1–R8)

| # | Verdict | Chi tiết |
|---|---|---|
| R1 Snapshot lần tạo mới | 🔧 **Đã sửa** | `handleSave` chụp ảnh SAU `ensureSaved`, mà create→`navigate(replace)` đổi `:id` → effect `[id]` `store.reset()` → `status 'idle'` → **RoomCanvas unmount → canvas huỷ đăng ký** → `capturePlannerPreview` thấy null → **lần lưu đầu không có ảnh**. Fix: chụp TRƯỚC `ensureSaved` (canvas còn sống), rồi save + upload. |
| R2 Ảnh trắng | ✅👁 | `SceneStage` có `gl={{ preserveDrawingBuffer:true }}`, frameloop mặc định "always" → buffer luôn tươi; chụp giờ trước navigate. Pixel thật: user kiểm. |
| R3 Marker chồng lấn vô hình | 🔧 **Đã sửa** | Mặt phẳng đúng footprint ở y=0.02 **bị chính model che** + opacity 0.15 → gần như không thấy. Fix: quầng 1.4× footprint (lộ viền quanh chân món) + opacity 0.22. |
| R4 Mốc tỉ lệ kéo | ✅👁 | 2 TransformControls (món chọn + người) độc lập; orbit toggle chung state vô hại. Clutter nhẹ khi bật — user kiểm. |
| R5 Kẹp khi chưa đo footprint | ✅ | Trước `onMeasure`, footprint {1,1,1}; món to có thể lệch 1 nhịp rồi `updateTransform` kế re-clamp. Transient chấp nhận. |
| R6 BoM giá sau reload | ✅👁 | `RoomSceneService` eager-load `items.variant.product.media` + `ProductVariantResource` → price. BE test user chạy. |
| R7 Shared add-all guest/hết hàng | ✅ | `onAddRoom` guest→`navigate('/login',{from})`; `addRoomToCart` Promise.allSettled đếm added/skipped. Có test. |
| R8 Deep-link | ✅ | Effect gate `status==='ready'` + productQuery success; `addVariant` (giờ set footprint) vẫn đúng; 3 tầng fail nguyên vẹn. |

## Checklist chức năng

**A. Editor** — A1 setup ✅ · A2 add ✅ · A3 gizmo commit ✅ · A4 floor-snap ✅ · A5 select/deselect ✅ · A6 delete/reset ✅ (reset giữ footprint) · A7 undo/redo ✅ (footprint/snap ngoài history) · A8 duplicate ✅ · A9 shortcuts ✅ · A10 grid-snap ✅ · A11 **wall-snap** 🔧 (nâng 0.2→0.5m, đã sửa trước audit) · A12 scale-ref ✅👁 · A13 footprint/overlap/clamp ✅ (marker R3 đã sửa).

**B. Commerce** — B1 BoM ✅ · B2 "Đặt cả phòng"→checkout ✅ · B3 add-to-cart + imagined callback ✅.

**C. Lifecycle** — C1 My Rooms list/rename/delete/pagination ✅ · C2 card ảnh/placeholder ✅ (img lỗi link → container aspect giữ layout, chỉ hiện icon vỡ; chấp nhận) · C3 share dialog ✅ · C4 shared viewer mobile/404 ✅ · C5 shared-loop ✅ · C6 snapshot 🔧 (R1) 👁.

**D. Capability** — D1 WebGL gate ✅ · D2 context-lost overlay ✅ · D3 SmallScreenNotice (editor `lg:` only) ✅ · D4 ModelErrorBoundary + footprint mặc định ✅.

**E. BE hợp đồng** — E1 KHÔNG lộ cloudinary_id/preview_public_id (chỉ `thumbnail` asset->url + `preview_url`) ✅ · E2 routes auth/ownership ✅ · E3 attachPreview destroyRaw old + delete cleanup ✅👁 · E4 chỉ customer mua ✅.

## Defect đã sửa (tổng)

1. **R1** — snapshot lần tạo mới rỗng → chụp trước save. (`RoomPlannerPage.jsx`)
2. **R3** — marker chồng lấn bị che/mờ → quầng 1.4× + opacity 0.22. (`PlacedItem.jsx`)
3. **A11 (trước audit)** — wall-snap imperceptible → threshold 0.2→0.5m. (`collision.js`)

## User cần kiểm (sandbox không chạy 3D/PHP)

- Lưu phòng MỚI lần đầu → card "Phòng của tôi" có ảnh (R1).
- Bật "Bắt tường", kéo món tới gần tường (≤0.5m) rồi thả → nhảy áp tường (A11).
- Đặt 2 món chồng nhau → thấy quầng tối dưới chân + dòng nhắc panel (R3).
- BE: `php artisan migrate` (preview cols) + `php artisan test --filter=RoomScene`.
