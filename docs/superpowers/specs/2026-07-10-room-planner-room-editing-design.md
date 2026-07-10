# Room Planner — Chỉnh vỏ phòng trực tiếp (Sub-project A)

**Ngày:** 2026-07-10
**Trạng thái:** Đã duyệt thiết kế
**Phạm vi:** Cho khách tùy ý dựng phòng hơn — bước A của lộ trình 2 sub-project.

## Bối cảnh & mục tiêu

Hiện phòng là **hộp chữ nhật cố định**: định nghĩa bởi 3 số `width/depth/height` (m) nhập
một lần trong `RoomSetupDialog`; tường (lưng + trái + phải) tự sinh trong `Room.jsx`, mờ,
**không tương tác**. Không cửa, không đổi kích thước sau khi tạo, không ẩn tường.

User muốn "khách tùy ý dựng phòng hơn". Đã chốt tầm nhìn **phòng chữ nhật + tùy biến tường**
(KHÔNG vẽ mặt bằng đa giác tự do — cái đó nặng, đổi mô hình dữ liệu, để riêng). Chia làm 2
sub-project, làm A trước:

- **A (spec này):** Vỏ phòng chỉnh trực tiếp — kéo đổi kích thước + bật/tắt từng tường, **lưu vào phòng**.
- **B (sau):** Cửa & cửa sổ đặt lên tường (cross-repo, schema openings) — dựa trên nền A.

Tương tác chốt: **chế độ "Chỉnh phòng" nhìn-từ-trên (top-down)**. Đây là *góc nhìn + cách
tương tác* cho phòng chữ nhật — KHÔNG phải mô hình dữ liệu 2D đa giác. Top-down giúp resize
chính xác (không méo phối cảnh), bật/tắt tường rõ ràng, và là nền hoàn hảo cho đặt cửa (B).

### Ràng buộc giữ nguyên (guardrail)
- **Chưa commit** cho tới khi user yêu cầu.
- Migration **idempotent** (`Schema::hasColumn` guard); **user tự chạy prod**, KHÔNG chạy prod.
- `preview_public_id` / `cloudinary_id` **không serialize** (không đụng tới ở A, nhưng nhắc để khỏi hồi quy).
- UI bám Design DNA "The Becoming Room": handle/nét tường dùng `unbuilt` #C9C4B8, semantic token; **không brass/cream**; kiểm bằng skill `nestify-review` trước khi coi là xong.
- Không thêm dependency mới (drei/TransformControls/OrbitControls đã có).

## Mô hình dữ liệu

### BE — `room_scenes`
Migration mới `2026_07_10_000002_add_walls_to_room_scenes_table.php` (idempotent):
- Thêm **3 cột boolean** `wall_back`, `wall_left`, `wall_right`, mỗi cột `default(true)`, bọc `Schema::hasColumn`.
- Lý do 3 boolean (không jsonb): tập tường cố định, explicit, testable, tránh bẫy jsonb key-order của Postgres (`assertEquals` vs `assertSame`).

Sửa kèm:
- `RoomScene` model: thêm 3 cột vào `$fillable`; cast `'wall_back'|'wall_left'|'wall_right' => 'boolean'`.
- `RoomSceneResource`: serialize `wall_back`, `wall_left`, `wall_right`.
- FormRequest tạo/sửa scene (`StoreRoomSceneRequest` / `UpdateRoomSceneRequest`, hoặc request hiện dùng cho POST/PATCH `/room-scenes`): thêm rule `'wall_back' => ['sometimes','boolean']` (tương tự left/right). Mặc định DB `true` lo trường hợp thiếu.
- `RoomSceneService` (store/update): truyền 3 field khi có.

### FE — `editorStore`
- `room` mở rộng: `{ width, depth, height, walls: { back: bool, left: bool, right: bool } }`.
- `emptyState.room.walls` mặc định `{ back: true, left: true, right: true }`; `initNew` giữ mặc định (hoặc nhận từ room truyền vào nếu có).
- **Mode state:** thêm `editMode: 'furnish' | 'room'` (mặc định `'furnish'`), action `setEditMode(mode)`. Đổi mode KHÔNG set dirty (chỉ là trạng thái xem).
- Mapper (`mappers.js`):
  - `sceneToEditorState`: đọc `walls` từ `r.wall_back/wall_left/wall_right` (fallback `true` khi thiếu, dùng `?? true` chứ không `Boolean(undefined)`).
  - `editorStateToPayload`: gửi `wall_back/wall_left/wall_right` từ `state.room.walls`.

### Action mới trên store
- **`resizeRoom({ width?, depth?, height? })`**:
  - Kẹp mỗi chiều: `width/depth` ∈ [2, 30] m; `height` ∈ [2, 5] m (clamp helper).
  - Set `room` mới, `dirty: true`.
  - **Re-clamp toàn bộ items** vào phòng mới: mỗi item `position = clampRectToRoom(position, newRoom, rotatedHalfExtents(footprint, scale, rotation.y))`. Đây đồng thời **sửa bug hiện tại**: `setRoom` cũ không re-clamp → thu nhỏ phòng thì đồ lọt ra ngoài tường.
  - **Vào undo history** (`pushPast`) vì là hành động người dùng có thể muốn hoàn tác.
- **`toggleWall(side)`** (`side ∈ 'back'|'left'|'right'`): lật `room.walls[side]`, `dirty: true`. Vào undo history.

> Lưu ý: `setRoom` cũ (dùng bởi luồng nào khác) giữ nguyên để khỏi vỡ; luồng resize mới đi qua `resizeRoom`. Nếu `setRoom` chỉ dùng lúc init thì không cần re-clamp.

## Tương tác 3D — chế độ top-down

### Camera
- Khi `editMode === 'room'`: đưa camera lên **thẳng trên tâm phòng nhìn xuống** (−Y), **khoá xoay** OrbitControls (`enableRotate=false`), giữ pan + zoom. Dùng lại **perspective camera** đặt overhead — KHÔNG swap sang orthographic (tránh phức tạp swap camera + mock test; nhìn thẳng từ cao thì méo không đáng kể). Lưới 1m (drei `Grid`) sẵn có làm thước đo.
- Khi trở lại `'furnish'`: camera/OrbitControls về trạng thái 3D bình thường (`enableRotate=true`), vị trí mặc định.
- `SceneStage` nhận `editMode` (hoặc `topDown` bool) để cấu hình camera + OrbitControls.

### Khoá tương tác đồ nội thất trong chế độ room
- Ở `editMode === 'room'`: items **vẫn render** (tham chiếu để thấy đồ nằm đâu) nhưng **không chọn/kéo được** (PlacedItem không gắn gizmo, click không select). RoomCanvas truyền cờ xuống để tắt tương tác item.

### Component `RoomEditOverlay` (mới, chỉ render khi `editMode==='room'`)
Trong scene (con của `SceneStage`/`RoomCanvas`):
- **Núm resize ở giữa 4 cạnh sàn** — sphere nhỏ `unbuilt` #C9C4B8, mỗi cái bọc `TransformControls` translate:
  - Cạnh trước/sau (trục Z) → kéo đổi `depth`; cạnh trái/phải (trục X) → kéo đổi `width`.
  - Đối xứng qua tâm: đọc `|toạ độ núm|` → `resizeRoom({ depth: 2*|z| })` hoặc `{ width: 2*|x| }`.
  - **Snap 0.5m** khi kéo (làm tròn về bội 0.5), kẹp 2–30m ở store.
  - Kéo → tắt orbit (`onDragChange(true)` → `setOrbitEnabled(false)`) như pattern item/scale-ref.
  - Nhãn số m hiện live cạnh núm (Html drei hoặc text đơn giản; ưu tiên tái dùng cơ chế của `ScaleLegend` cho HUD tổng).
- **Cạnh tường bấm được** — 3 cạnh (lưng/trái/phải) vẽ đường mảnh; mesh line/plane mỏng `onClick` → `toggleWall(side)`. Tường bật = liền, tắt = **nét đứt mờ**. Cạnh trước để mở (phía nhìn vào 3D), không có tường trước, không toggle.

### `Room.jsx` phản ánh `walls`
- Mỗi mặt tường render theo `room.walls[side]`: bật = như hiện tại (mờ, canvas #F2F0EB); tắt = ẩn hẳn (hoặc chỉ còn viền nét đứt `unbuilt` — quyết định lúc build, ưu tiên ẩn hẳn cho gọn ở chế độ furnish, nét đứt chỉ trong chế độ room).

## UI — vào/ra chế độ + control

### PlannerToolbar
- Thêm nút **"Chỉnh phòng"** (icon `Move3d` hoặc `Frame` — chọn lúc build để không trùng, `Frame` đang dùng cho "Bắt tường" → dùng icon khác vd `Scan`/`Grid3x3`/`Ruler`-nhóm-riêng), tách nhóm. Bấm → `setEditMode('room')`.
- Khi `editMode === 'room'`: nhóm xếp đồ (gizmo modes, Snap/Bắt tường/Tỉ lệ, undo/redo có thể giữ) **ẩn hoặc vô hiệu** để khỏi rối; các nút hành động (Lưu/Chia sẻ/Giỏ/Đặt) vẫn hiện (Lưu vẫn lưu được kích thước/tường mới).

### Dải chế độ room (overlay trên canvas, chỉ khi `editMode==='room'`)
Component `RoomEditPanel` (mới), semantic token, primitive sẵn có:
- Nhãn **"Đang chỉnh phòng"** + kích thước live `W × D × H m` (tái dùng cách hiển thị của `ScaleLegend`).
- **Stepper chiều cao**: − / số / +, bước 0.1m, kẹp 2–5m → `resizeRoom({ height })`. (Chiều cao không kéo được khi nhìn từ trên.)
- **3 toggle tường** Lưng / Trái / Phải (lối thứ 2 song song với bấm cạnh trên canvas) → `toggleWall(side)`.
- Nút **"Xong"** → `setEditMode('furnish')`.

## Xử lý lỗi / edge case
- Resize xuống nhỏ hơn đồ đang có: đồ được re-clamp về trong tường (không xoá đồ). Đồ to hơn phòng thì `clampRectToRoom` đưa về tâm (đã có nhánh "quá to → 0").
- Kẹp min 2m tránh phòng 0 làm chia cho 0 / camera lỗi.
- Mapper thiếu field `wall_*` (scene cũ trước migration): fallback `true` → không vỡ phòng cũ.
- Đổi mode giữa lúc đang kéo item: mode chỉ đổi qua nút, item drag tự kết thúc; không cần xử lý đặc biệt.

## Testing
### BE (`docker compose exec app php artisan test --filter=RoomScene`)
- Migration idempotent (chạy 2 lần không lỗi) — hoặc tin `hasColumn` guard.
- `RoomSceneResource` serialize `wall_back/left/right` (và KHÔNG serialize `preview_public_id`).
- Store/Update scene nhận & lưu `wall_*`; mặc định `true` khi thiếu.
- (Postgres) so sánh boolean bằng `assertEquals`/`assertJsonPath` đúng kiểu.

### FE (Vitest + RTL)
- `resizeRoom`: kẹp min/max từng chiều; re-clamp items khi thu nhỏ; vào history.
- `toggleWall`: lật đúng side, dirty, history.
- `mappers`: round-trip `walls` (đọc fallback true khi thiếu; ghi payload đủ 3 field).
- `setEditMode`: đổi mode không set dirty.
- Render: mode='room' → `RoomEditPanel` hiện, item không nhận gizmo (mock Canvas/TransformControls/OrbitControls như pattern hiện có); toggle tường trên panel gọi `toggleWall`.
- `Room.jsx`: tường ẩn khi `walls[side] === false`.

## Ngoài phạm vi (YAGNI / để B hoặc sau)
- Cửa & cửa sổ (openings) — sub-project B.
- Tường trước (mặt thứ 4) — giữ mở để nhìn vào 3D.
- Vẽ mặt bằng đa giác / phòng chữ L — đã loại.
- Orthographic camera thực thụ — perspective-overhead là đủ; có thể nâng sau.
- Đặt tên/màu sàn, vật liệu tường — không thuộc mục tiêu.
