# Room Planner — Mốc tỉ lệ + Bắt tường (Spatial Confidence phần 2)

**Date:** 2026-07-10
**Repo:** Nestify-Furniture-e-commerce-frontend (thuần FE, KHÔNG đụng BE, KHÔNG thêm dependency)
**Nối tiếp:** gói nền "Độ tin cậy không gian" (`2026-07-10-room-planner-spatial-confidence-design.md`).

## 1. Mục tiêu

Khuếch đại đúng intent lõi của Planner đã ghi trong Component Bible (dòng 85: *"mục tiêu là biết
nó có vừa không"*; dòng 64: *"người dùng vẫn muốn biết món đồ có vừa không"*):

- **Mốc tỉ lệ (S):** cho mắt một thước đo cơ thể/kiến trúc — bóng người ~1.7m (chính là *sự hiện
  diện của user*) + khung cửa 0.9×2.0m — để ước lượng "món này to/nhỏ so với người & lối đi".
- **Bắt tường (W):** hút cạnh món áp sát tường khi kéo lại gần → đặt-sát-tường không cần canh tay,
  đúng DNA §0 "thử/sửa phải cảm thấy **rẻ**".

**Ranh giới DNA:** mốc tỉ lệ là **presence thụ động — KHÔNG số đo, KHÔNG phán "đạt/không"**. DNA §1
loại *biến hero signature thành fit-indicator kỹ thuật*; ở đây là aid trong editor sống (Chapter
3–4), giữ "main character is the user" bằng chính bóng người.

## 2. Phạm vi

**Trong:** hàm `snapToWalls`; cờ store `wallSnap`/`showScaleRef`/`scaleRefPos`; component
`ScaleReference` (người kéo được + cửa cố định); 2 nút toolbar; test.

**Ngoài (YAGNI):** cửa chọn-tường (cố định tường sau); số đo/label kích thước; verdict vừa/không;
lưu mốc tỉ lệ hay wallSnap xuống BE; mốc tỉ lệ ở trang chia sẻ (chỉ editor).

## 3. Ràng buộc chốt sẵn

- Thuần FE, không BE, không migration, không thêm dep (hình học từ `three` sẵn có).
- KHÔNG commit (guardrail) — mỗi task đóng bằng lint + test xanh.
- Plain JS (JSX). 3D hex mirror token; UI dùng semantic class.
- DNA màu: người = `emerging` #8A7C68 mờ; cửa = `unbuilt` #C9C4B8 mờ. KHÔNG `imagined`/`confirmed`,
  KHÔNG đỏ/terracotta/cream. Chốt qua **nestify-review**.
- Ephemeral state (`snap` đã có tiền lệ): `wallSnap`/`showScaleRef`/`scaleRefPos` KHÔNG vào undo
  history, KHÔNG set `dirty`, KHÔNG nằm trong save payload.

## 4. W — Bắt tường

**Hàm thuần** `snapToWalls(position, room, halfExtents, threshold)` trong `collision.js`:
- Mỗi trục độc lập. Vị-trí-flush = `±(room.size/2 − halfExtent)`.
- Nếu `|position.axis − flush|` (với tường gần hơn) `< threshold` → gán `position.axis = flush`.
- Trả `{ x, y, z }` (y giữ nguyên). `threshold` mặc định 0.2 (hằng `WALL_SNAP_THRESHOLD`).
- Gọi SAU `clampRectToRoom` (đã đảm bảo nằm trong phòng).

**Store:** `wallSnap: false`, `toggleWallSnap()`. Trong `updateTransform`, sau khi kẹp position, nếu
`s.wallSnap` thì `position = snapToWalls(position, room, he, WALL_SNAP_THRESHOLD)`.

**Toolbar:** nút "Bắt tường" (`aria-pressed={wallSnap}`) trong nhóm toggle cạnh "Snap".

## 5. S — Mốc tỉ lệ (bóng người kéo được + cửa cố định)

**Component** `src/pages/roomPlanner/scene/ScaleReference.jsx`:
- **Bóng người ~1.7m** từ primitive: `capsuleGeometry` (r≈0.2, length≈1.3) thân + `sphereGeometry`
  (r≈0.12) đầu, `meshStandardMaterial` `emerging` #8A7C68 `transparent opacity={0.5}`. Đặt tại
  `scaleRefPos` (x,z), base ở sàn.
- **Khung cửa** 0.9×2.0m: plane `unbuilt` #C9C4B8 `opacity={0.4}` áp tường sau (z ≈ −depth/2 + ε),
  base ở sàn (center y=1.0). Cố định.
- Người **kéo được** bằng `TransformControls` (mode `translate`, showY=false) gắn vào group người;
  `onMouseUp` → `setScaleRefPos({x,z})`; `onDraggingChanged` → tắt/bật orbit (như `PlacedItem`).
- Render trong `RoomCanvas` khi `showScaleRef`. KHÔNG render ở SharedSceneCanvas.

**Store (ephemeral):**
- `showScaleRef: false`, `toggleScaleRef()`.
- `scaleRefPos: { x: 0, z: 0 }` (mặc định giữa phòng), `setScaleRefPos(pos)` — kẹp `clampToRoom`
  (kẹp tâm đơn giản, người mảnh nên không cần size-aware). KHÔNG history/dirty.

**Toolbar:** nút "Tỉ lệ" (`aria-pressed={showScaleRef}`) cùng nhóm toggle.

## 6. Test (TDD)

- `collision.test.js`: `snapToWalls` — hút khi cạnh < 0.2m tới tường (position→flush); không đổi khi
  xa; hai trục độc lập; giữa phòng không hút.
- `editorStore.test.js`: `toggleWallSnap`/`toggleScaleRef` lật cờ; `setScaleRefPos` kẹp trong phòng
  + KHÔNG đụng history/dirty; `updateTransform` hút tường khi `wallSnap` bật (thả gần tường →
  flush), KHÔNG hút khi tắt.
- `ScaleReference.test.jsx` (mock R3F Canvas): khi mount render (không throw); có group người + cửa.
- `PlannerToolbar.test.jsx`: nút "Bắt tường" & "Tỉ lệ" gọi `onToggleWallSnap`/`onToggleScaleRef`,
  phản ánh `aria-pressed`.

## 7. Rủi ro & giảm thiểu

- **Hai gizmo cùng lúc** (đồ nội thất đang chọn + người): chấp nhận — người là translate-only trên
  mặt sàn, ít rối; kéo người tắt orbit nên không tranh cử chỉ với camera.
- **z-fighting cửa với tường:** đặt cửa lệch ε (0.01m) trước tường sau.
- **Người kéo ra ngoài phòng:** `setScaleRefPos` kẹp `clampToRoom`.
- **Toolbar chật:** gom 3 toggle (Snap / Bắt tường / Tỉ lệ) vào một nhóm bo viền.

## 8. Không làm

Cửa chọn-tường, số đo/label, verdict, lưu BE, mốc tỉ lệ ở trang chia sẻ, multi-select.
