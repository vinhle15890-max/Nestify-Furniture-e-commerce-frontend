# Room Planner — Ảnh snapshot phòng (Đóng vòng sở hữu 2/2)

**Date:** 2026-07-10
**Repos:** BE `Nestify-Furniture-e-commerce-backend` (migration + Cloudinary) + FE `Nestify-Furniture-e-commerce-frontend`.
**Thuộc:** hướng "Đóng vòng sở hữu" — sub-project 2/2 (sub-project 1 Shared-loop đã xong).

## 1. Mục tiêu

Card "Phòng của tôi" hiện chỉ có chữ (tên/kích thước/số món) — phòng đã lưu chưa "thật", chưa gợi
cảm giác **sở hữu**. Chụp ảnh phòng lúc Lưu → mỗi card có hình phối cảnh của chính căn phòng đó →
gallery phòng trở nên đáng giữ, đúng chapter Ownership của Story Bible.

## 2. Phạm vi

**Trong:** cột preview trên `room_scenes` + upload Cloudinary (tái dùng `MediaService::uploadRaw`);
endpoint upload preview; chụp canvas FE (best-effort lúc Save); ảnh trên card "Phòng của tôi".

**Ngoài (YAGNI):** poster ảnh trên trang chia sẻ (đã render 3D sống); og:image/social meta; ảnh trong
editor; chọn/crop ảnh thủ công; nhiều ảnh mỗi phòng.

## 3. Ràng buộc chốt sẵn

- **Migration idempotent, user chạy prod** — KHÔNG chạy migration ở đây.
- **`preview_public_id` KHÔNG bao giờ serialize** (cùng luật cloudinary_id — Resource chỉ trả `preview_url`).
- FormRequest validate mime/size bằng rule trong `rules()` (KHÔNG dùng antipattern `withValidator`/`addRules`).
- Chỉ **chủ phòng** upload preview (authorize như update/destroy).
- Chụp+upload là **best-effort**: lỗi KHÔNG được làm hỏng thao tác Lưu (Save đã thành công trước đó).
- FE không thêm dependency; capture bằng canvas API sẵn có.

## 4. BE

### 4.1 Migration (idempotent)
`add_preview_to_room_scenes_table`: thêm 2 cột nullable — `preview_url` (text), `preview_public_id`
(string). Bọc `Schema::hasColumn` để chạy lại an toàn; `down()` bỏ 2 cột nếu tồn tại.

### 4.2 Model + Resource
- `RoomScene::$fillable` thêm `preview_url`, `preview_public_id`.
- `RoomSceneResource` thêm `'preview_url' => $this->preview_url`. **KHÔNG** thêm `preview_public_id`.

### 4.3 Endpoint upload
`POST /room-scenes/{id}/preview` (trong nhóm auth). Controller `uploadPreview(UploadScenePreviewRequest, id)`:
- Lấy scene của user (findForUser — 404 nếu không phải chủ).
- `UploadScenePreviewRequest`: `image` required file, `mimes:jpg,jpeg,png,webp`, `max:2048` (KB) — trong `rules()`.
- `RoomSceneService::attachPreview(RoomScene $scene, UploadedFile $file)`:
  - `['url','public_id'] = MediaService::uploadRaw($file, 'image')`.
  - Nếu `$scene->preview_public_id` cũ → `MediaService::deleteRaw(old)` (best-effort, nuốt lỗi xoá).
  - `$scene->update(['preview_url' => url, 'preview_public_id' => public_id])`.
- Trả `RoomSceneResource($scene)`.

### 4.4 Dọn khi xoá
`RoomSceneService::delete`: nếu `preview_public_id` → `MediaService::deleteRaw` trước khi xoá bản ghi
(best-effort, không chặn xoá nếu Cloudinary lỗi).

### 4.5 Test (Docker sqlite; user chạy vì sandbox không có vendor/DB)
- upload preview set `preview_url`; response KHÔNG chứa `preview_public_id`.
- upload lần 2 → gọi `deleteRaw(old)` rồi set url mới (mock MediaService).
- non-owner → 404/403.
- validate: file sai mime → 422 envelope `error.details.fields.image`.
- delete scene có preview → gọi `deleteRaw`.

## 5. FE

### 5.1 Capture
- `SceneStage` Canvas thêm `gl={{ preserveDrawingBuffer: true }}` (cho phép đọc pixel sau render).
- `features/roomPlanner/canvasCapture.js`:
  - `registerPlannerCanvas(el)` / `unregisterPlannerCanvas(el)` — module ref cho canvas editor.
  - `capturePlannerPreview(maxWidth = 800)`: nếu chưa đăng ký → `null`; vẽ canvas WebGL thu nhỏ (giữ
    tỉ lệ) lên `<canvas>` 2D → `toBlob` (image/png) → `File('room-preview.png')`. Trả `Promise<File|null>`.
- `RoomCanvas` (editor) đăng ký canvas qua prop mới `SceneStage onRendererReady(gl)` → `registerPlannerCanvas(gl.domElement)`; huỷ đăng ký khi unmount. `SharedSceneCanvas` KHÔNG đăng ký.

### 5.2 Upload sau Save
- `api.uploadScenePreview(id, file)` → `POST /room-scenes/{id}/preview` (FormData `image`).
- `useUploadScenePreview()` (mutation, onSuccess invalidate `['scenes']`).
- Trong `handleSave` (RoomPlannerPage): sau `markSaved(id)`, chạy best-effort:
  `const file = await capturePlannerPreview(); if (file) uploadPreview.mutate({ id, file })` —
  bọc try/catch nuốt lỗi, KHÔNG toast lỗi (Save đã báo thành công). Không await để không chặn UI.

### 5.3 Card "Phòng của tôi"
- `RoomCard` thêm khối ảnh 16:9 đầu card: `scene.preview_url` → `<img loading="lazy" alt=...>`;
  chưa có → `<BecomingRoomArt level={1} />` (placeholder possibility).

### 5.4 Test (Vitest)
- `canvasCapture.test.js`: chưa đăng ký → `null`; đăng ký canvas giả (mock toBlob/drawImage) → trả File.
- `MyRoomsPage.test.jsx`: card có `preview_url` → `<img>` với src đó; không có → placeholder (no img).

## 6. Rủi ro & giảm thiểu

- **preserveDrawingBuffer perf:** chi phí nhỏ, chấp nhận cho editor; áp cả SharedSceneCanvas vô hại.
- **Canvas trắng nếu đọc sai thời điểm:** preserveDrawingBuffer giữ buffer → drawImage sau đó an toàn.
- **Ảnh nặng:** downscale maxWidth 800 + Cloudinary `quality:auto/fetch_format:auto` → nhẹ.
- **Orphan Cloudinary:** overwrite bằng deleteRaw(old) khi thay + deleteRaw khi xoá phòng.
- **Best-effort:** capture/upload lỗi không đụng tới kết quả Save.
- **BE test không chạy được ở sandbox** (no vendor/DB) → php -l + user chạy `--filter=RoomScene`.

## 7. Không làm

Poster trang chia sẻ, og:image, ảnh trong editor, crop thủ công, nhiều ảnh/phòng.
