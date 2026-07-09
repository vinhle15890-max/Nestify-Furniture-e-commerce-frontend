# Room Planner — Shared-loop (danh sách SP + "Thêm cả phòng vào giỏ")

**Date:** 2026-07-10
**Repo:** Nestify-Furniture-e-commerce-frontend (thuần FE, KHÔNG đụng BE)
**Thuộc:** hướng "Đóng vòng sở hữu" — sub-project 1/2 (sub-project 2 = ảnh snapshot phòng, cần BE, làm sau).

## 1. Mục tiêu

Trang chia sẻ công khai (`/room-planner/shared/:token`) hiện chỉ cho *xem* phòng 3D. Biến nó thành
**vòng chuyển đổi + khám phá**: người xem thấy đúng những món trong phòng, mở được trang từng SP, và
thêm cả phòng vào giỏ chỉ một chạm. Đúng linh hồn Nestify: *thấy-trước → sở hữu*; và biến link chia
sẻ (vốn viral) thành đường vào cửa hàng.

## 2. Phạm vi

**Trong:** panel "Trong phòng này" trên trang chia sẻ (list + tổng + link SP); nút "Thêm cả phòng vào
giỏ" (best-effort, guest→login giữ đường về, sau khi thêm ở lại + link giỏ); mapper mang thêm slug.

**Ngoài (YAGNI):** ảnh snapshot (sub-project 2); sửa BE/endpoint; sửa đổi số lượng trước khi thêm;
thêm mốc tỉ lệ vào trang chia sẻ; hiển thị tồn kho realtime.

## 3. Ràng buộc chốt sẵn

- Thuần FE, KHÔNG BE, KHÔNG thêm dependency, KHÔNG commit (guardrail — mỗi task đóng bằng lint+test).
- Plain JS (JSX). Semantic token; giữ giao diện sạch, không storefront chrome của trang chia sẻ.
- Chỉ customer mua được (guardrail) — add-to-cart lỗi cho staff/hết hàng thì **best-effort bỏ qua**,
  không vỡ luồng.
- Trang chia sẻ **cho phép mobile** (orbit-only) — panel phải responsive (dưới canvas ở màn nhỏ).
- Dữ liệu đã đủ: `showByToken` trả items có `variant` (id/sku/name/price/model_3d_url) sau C1; product
  eager-loaded nên `ProductVariantResource` có `product_slug`/`product_name`.

## 4. Dữ liệu — mapper mang thêm slug/name

`sceneToEditorState` (mappers.js) hiện map `variant` chỉ giữ id/sku/name/model_3d_url/price/thumbnail.
Thêm `product_slug` + `product_name` (từ `item.variant?.product_slug`/`product_name`, fallback null)
để dòng danh sách link được sang `/p/{slug}` và hiển thị tên SP.

`summarizeItems` (summary.js) thêm `slug` vào mỗi line (`variant.product_slug ?? null`) — additive,
BoM/RoomSummary bỏ qua field thừa; test cũ vẫn xanh.

## 5. Thêm cả phòng vào giỏ — logic thuần

Hàm `addRoomToCart(lines, addItemAsync)` (`features/roomPlanner/addRoomToCart.js`):
- Lọc line có `variantId`.
- `Promise.allSettled(lines.map((l) => addItemAsync({ variant_id: l.variantId, quantity: l.qty })))`.
- Trả `{ added, skipped }` = số fulfilled / rejected. Best-effort: 1 món hết hàng không chặn phần còn lại.

## 6. Component `SharedRoomItems`

`src/pages/roomPlanner/SharedRoomItems.jsx` — props `{ items }`:
- Dùng `summarizeItems(items)` → list: mỗi dòng *tên · ×qty · giá* (— nếu unpriced), có link `/p/{slug}`
  khi có slug; "Tổng tạm tính".
- Nút **"Thêm cả phòng vào giỏ"** (`primary`, KHÔNG `imagined`/`confirmed`):
  - Chưa đăng nhập (`!authStore.token`) → `navigate('/login', { state: { from: location } })`
    (LoginPage đã honor `state.from.pathname` → quay lại đúng trang chia sẻ).
  - Đã đăng nhập → `addRoomToCart(lines, addCart.mutateAsync)`; toast:
    - `skipped===0` → success "Đã thêm N món vào giỏ."
    - `skipped>0` → "Đã thêm N món (M món không khả dụng)."
    - Sau khi có `added>0` → hiện link **"Xem giỏ hàng →"** inline (persistent) tới `/cart`
      (toast không hỗ trợ action nên link nằm ở panel).
  - Rỗng phòng → nút disabled.

## 7. Bố cục `SharedRoomPage`

`main` đổi thành flex: canvas (`flex-1`) + `aside` panel.
- Desktop (`md:`): panel bên phải, `md:w-80`, `md:border-l`.
- Mobile: xếp dọc — canvas trên (chiếm phần cao), panel dưới `border-t`, `overflow-y-auto`.

## 8. Test (TDD)

- `mappers.test.js`: variant map giữ `product_slug`/`product_name` (+ fallback null).
- `summary.test.js`: line có `slug`.
- `addRoomToCart.test.js`: 3 line, addItemAsync resolve 2 / reject 1 → `{ added: 2, skipped: 1 }`;
  bỏ line thiếu variantId.
- `SharedRoomItems.test.jsx`: render list + total + link `/p/{slug}`; guest click → `navigate('/login', {state:{from}})`;
  logged-in click → `mutateAsync` gọi đúng số dòng, sau thành công hiện link "Xem giỏ".

## 9. Rủi ro & giảm thiểu

- **Món không slug** (product chưa eager-load ở scene cũ): dòng hiện tên, không link (guard `slug`).
- **Guest bấm nhiều lần**: điều hướng login là idempotent.
- **Tồn kho đổi**: best-effort + toast nêu số bỏ qua; không giả vờ thành công.
- **Toast không có action**: link "Xem giỏ" đặt inline ở panel thay vì trong toast.
