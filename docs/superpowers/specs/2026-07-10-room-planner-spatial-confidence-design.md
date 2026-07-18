# Room Planner — Spatial Confidence (footprint + overlap + wall-clamp)

**Date:** 2026-07-10
**Repo:** Nestify-Furniture-e-commerce-frontend (thuần FE, KHÔNG đụng BE)
**Roadmap:** tiếp nối Room Planner A✓ (scene-lifecycle) · C✓ (commerce-clarity) · B✓ (editor-depth).
Đây là hướng mới **"Độ tin cậy không gian"**, gói nền đầu tiên.

## 1. Vấn đề & mục tiêu

Planner hiện lưu item dạng `{ localId, variant, position, rotation, scale }` — **không biết kích thước
thật của món**. Bounding box (`Box3`) chỉ được đo bên trong `FurnitureModel` lúc render và **không
đẩy lên store**. Hệ quả:

- `clampToRoom` chỉ kẹp **tâm** món vào biên phòng → món to (sofa 2.2m) có tâm trong phòng nhưng
  **nửa thân xuyên tường**.
- Hai món có thể **đè lên nhau** mà không có tín hiệu nào.

→ Cái-nhìn không đáng tin về không gian, đi ngược trụ **"clarity / bán sự thấy-trước"**.

**Mục tiêu:** món không xuyên tường; khi hai món tranh chỗ thì được **nhắc nhẹ** (không báo động —
DNA Enemy = *sợ quyết định không thể đảo ngược*, không được gây sợ).

## 2. Phạm vi

**Trong phạm vi:**
1. Đo footprint mỗi món → đưa lên store (nền tảng chung).
2. Cảnh báo chồng lấn (overlap) — tín hiệu dịu.
3. Kẹp tường theo kích thước (cạnh món không lọt ra ngoài phòng).

**Ngoài phạm vi (YAGNI):**
- Mốc tỉ lệ (bóng người 1.7m, khung cửa) — hướng #3, để sau.
- Bắt-tường-nam-châm (nhảy áp tường từ khoảng cách xa).
- Va chạm 3D đầy đủ theo trục X/Z (chỉ xét mặt bằng top-down quanh trục Y).
- Chồng vật có chủ đích (kê đèn lên bàn) — planner cho mọi món nằm sàn (`snapToFloor`), không hỗ trợ stacking.
- Lưu footprint xuống BE — đo lại từ GLB mỗi lần mở; save payload giữ nguyên.

## 3. Ràng buộc chốt sẵn

- **Thuần FE, không đụng BE.** Không migration, không đổi resource/endpoint.
- **Không thêm dependency.** SAT + hình học tự viết (đã có `three` cho `Box3`).
- **DNA:** tín hiệu cảnh báo KHÔNG dùng đỏ báo lỗi; KHÔNG `imagined` #B5754A (dành nút Lưu),
  KHÔNG `confirmed` #3D5A45 (dành checkout), KHÔNG terracotta/cream. Hex tông "chú ý" dịu chốt
  qua skill **nestify-review** trước khi coi xong.
- Test: Vitest + RTL; mock `@react-three/fiber` Canvas như pattern hiện có.

## 4. Nền tảng — đo footprint đưa lên store

**Luồng dữ liệu:**
1. `FurnitureModel` đo `Box3` (đã có). Thêm prop `onMeasure(size)` — bắn **một lần** khi object sẵn
   sàng (`useEffect`, không trong render), `size = box.getSize()` ở scale 1.
2. `PlacedItem` truyền `onMeasure={(size) => reportFootprint(item.localId, size)}` xuống `FurnitureModel`.
   Nhánh placeholder (không có `model_3d_url` / đang tải / lỗi) **không** đo → footprint giữ mặc định.
3. `SharedSceneCanvas` (read-only) không cần đo → không truyền `onMeasure`.

**Store (`editorStore`):**
- Item thêm field `footprint: { x, y, z }` = kích thước model ở scale 1. **Mặc định `{ x:1, y:1, z:1 }`**
  (hộp đơn vị — placeholder/đang tải/lỗi vẫn tính được).
- Action mới `reportFootprint(localId, size)`:
  - Cập nhật `footprint` của đúng item.
  - **KHÔNG vào undo history, KHÔNG set `dirty`** (metadata dẫn xuất, không phải hành động người dùng).
  - **No-op nếu size không đổi** (so sánh có epsilon) — tránh vòng lặp render.
- `addVariant` khởi tạo item với `footprint` mặc định `{1,1,1}` (đo tới sau).

## 5. Module thuần `features/roomPlanner/collision.js`

Tách riêng, không phụ thuộc React/three-runtime (nhận số, trả số) → dễ test.

| Hàm | Vào → Ra | Ghi chú |
|---|---|---|
| `rotatedHalfExtents(footprint, scale, angleY)` | → `{ hx, hz }` | Nửa-kích-thước **AABB** của hình chữ nhật xoay quanh Y: `hx=\|Hx·cos\|+\|Hz·sin\|`, `hz=\|Hx·sin\|+\|Hz·cos\|` với `Hx=footprint.x*scale.x/2`, `Hz=footprint.z*scale.z/2`. Dùng cho kẹp tường (tường song song trục → AABB là chính xác). |
| `itemRect(item)` | → `{ cx, cz, hx, hz, angle }` | Hình chữ nhật có hướng (OBB) trên mặt bằng: tâm `(position.x, position.z)`, nửa cạnh `footprint*scale/2`, góc `rotation.y`. |
| `overlaps(a, b)` | rect,rect → `bool` | **SAT cho 2 OBB 2D** (chính xác với món xoay, không chỉ AABB). Chạm mép = không tính đè (dùng `>` epsilon). |
| `findOverlaps(items)` | → `Set<localId>` | So từng cặp; món nào đè ≥1 món khác thì vào Set. **Bỏ qua món phẳng `footprint.y*scale.y < 0.1m`** (thảm/chiếu) — tránh báo giả khi kê bàn lên thảm. |
| `clampRectToRoom(position, room, halfExtents)` | → `{ x, y, z }` | Kẹp **cạnh**: `x∈[-halfW+hx, halfW-hx]`. Nếu `hx>halfW` (món to hơn phòng) → về `0` (giữa). Tương tự z. |

## 6. Cảnh báo chồng lấn (giọng "nhắc nhẹ")

- **3D:** mỗi món trong `conflictSet` hiện **ô footprint mờ trên sàn** (hoặc viền quanh món) bằng tông
  "chú ý" dịu. Vì WebGL không đọc token CSS, hex hardcode mirror token (như `Room.jsx`); token/hex
  chốt qua **nestify-review**. Không nhấp nháy gắt, không đỏ.
- **Panel:** dòng chữ điềm tĩnh, ví dụ *"2 món đang chồng lên nhau"* — **không chặn** thao tác nào,
  chỉ gợi ý. (Đặt trong `RoomSummary` hoặc notice nhỏ cạnh nó.)
- Triết lý: undo/kéo-lại vốn rẻ (sub-project B) → cảnh báo là *nudge*, không phải rào chặn.

**Luồng:** `RoomCanvas` tính `conflictSet = findOverlaps(items)` bằng `useMemo` theo `items`
(tự re-tính khi món di chuyển HOẶC khi footprint được đo xong, vì cả hai đều nằm trong `items`),
truyền cờ `conflict` xuống từng `PlacedItem`.

## 7. Kẹp tường theo kích thước

- `updateTransform`, `duplicateSelected`, và nhánh add deep-link dùng `clampRectToRoom(pos, room,
  rotatedHalfExtents(item.footprint, scale, rotation.y))` thay cho `clampToRoom` (kẹp tâm).
- Xoay làm đổi footprint AABB → lần `updateTransform` kế **tự kẹp lại** (đúng pattern hiện có; ghi
  chú `setRoom` cũng theo lối này).
- `clampToRoom` cũ giữ lại (hoặc thành wrapper gọi `clampRectToRoom` với half-extents = 0) để không
  vỡ chỗ khác.

## 8. Test (TDD — viết đỏ trước)

- **`collision.test.js`:** `rotatedHalfExtents` (0°/45°/90°); `overlaps` (chồng hẳn / rời / chạm mép /
  hai OBB xoay 45° cài nhau); `findOverlaps` (2 món đè → cả 2 trong Set; thảm phẳng bị loại;
  3 món dây chuyền); `clampRectToRoom` (món vừa, món to hơn phòng → 0, xoay 90° đổi trục).
- **`editorStore.test.js`:** `reportFootprint` set đúng item + **KHÔNG** đổi `past/future/dirty`;
  no-op khi size trùng; `updateTransform` kẹp size-aware (sofa to không ra ngoài).
- **`PlacedItem.test.jsx` / `RoomCanvas.test.jsx`:** cờ `conflict` render tín hiệu; `RoomCanvas` tính
  đúng conflictSet cho 2 món đè (mock R3F Canvas).

## 9. Rủi ro & giảm thiểu

- **Báo giả** (món chạm nhẹ / lồng nhau hợp lệ): tín hiệu dịu + loại món phẳng < 0.1m + SAT dùng
  epsilon cho mép. Chấp nhận vài báo-giả nhỏ vì signal không chặn thao tác.
- **Vòng lặp render** khi đo footprint: `reportFootprint` no-op nếu không đổi; `onMeasure` bắn 1 lần
  trong `useEffect`.
- **Model lỗi/placeholder:** footprint mặc định `{1,1,1}` → overlap/clamp vẫn chạy với hộp đơn vị.
- **Món to hơn phòng:** `clampRectToRoom` về giữa thay vì kẹt biên âm.

## 10. Không làm trong gói này

Mốc tỉ lệ (#3), bắt-tường-nam-châm, multi-select, va chạm 3D đầy đủ, lưu footprint xuống BE.
