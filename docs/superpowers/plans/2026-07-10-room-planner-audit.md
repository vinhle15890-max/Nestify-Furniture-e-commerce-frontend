# Room Planner — Audit end-to-end Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans + superpowers:systematic-debugging cho mỗi defect. Đây là plan ĐIỀU TRA + SỬA, không phải feature mới.

**Goal:** Trace hành vi thật của toàn bộ Room Planner, ghi verdict từng mục, sửa mọi điểm sai (nhất là loại "xanh-mà-hỏng").

**Method:** checklist-first (spec §5) + verify nghi vấn ưu tiên (spec §4) trước. Mỗi defect → systematic-debugging (root cause) → fix + test hồi quy.

## Global Constraints

- KHÔNG commit; migration user prod; `cloudinary_id`/`preview_public_id` không serialize; chỉ customer mua.
- Sandbox không chạy 3D/PHP → chỗ đó trace code path + ghi bước "user kiểm hình"; BE `php -l`.
- Mỗi defect sửa xong: test liên quan + lint xanh.

---

### Task 1: Report scaffold + verify 8 nghi vấn "xanh-mà-hỏng" (R1–R8)

**Files:** Create `docs/superpowers/audits/2026-07-10-room-planner-audit-report.md` (bảng verdict). Sửa file tuỳ defect tìm thấy.

- [ ] **R1 — Snapshot lần tạo mới:** đọc `RoomPlannerPage.handleSave`/`ensureSaved`. Xác định: sau `createScene` + `navigate(replace)`, RoomCanvas có remount → `unregisterPlannerCanvas` trước khi `capturePlannerPreview` chạy không? Nếu có → capture null ở lần lưu đầu. **Fix hướng:** capture ảnh TRƯỚC `navigate`, hoặc capture đồng bộ ngay sau khi có id nhưng trước điều hướng, hoặc bỏ navigate-remount. Ghi verdict + fix.
- [ ] **R2 — Ảnh trắng:** kiểm `SceneStage` có `gl={{ preserveDrawingBuffer: true }}` (đã thêm) và frameloop mặc định (R3F "always" → buffer luôn mới). Nếu dùng `frameloop="demand"` phải `gl.render` trước capture. Verdict + fix nếu cần. (Kiểm pixel thật = user.)
- [ ] **R3 — Marker chồng lấn mờ:** đánh giá `ink #26262B opacity 0.15` trên sàn `canvas #F2F0EB` — độ tương phản có đủ thấy? Nếu như bắt-tường (vô hình) → tăng opacity / đổi sang viền rõ. Verdict + fix.
- [ ] **R4 — Mốc tỉ lệ kéo:** trace `ScaleReference` TransformControls + `RoomCanvas` orbit toggle. Hai gizmo (đồ đang chọn + người) cùng lúc có kẹt không? `makeDefault` OrbitControls vs 2 TransformControls. Verdict + fix.
- [ ] **R5 — Kẹp khi footprint chưa đo:** trace thứ tự `addVariant`(footprint 1,1,1) → render → `onMeasure`→`reportFootprint`. Món to thả ngay có bị kẹp sai 1 nhịp rồi nhảy? Chấp nhận được không? Verdict.
- [ ] **R6 — BoM giá reload:** trace `RoomSceneService` eager-load + `RoomSceneItemResource`→`ProductVariantResource` price. Verdict (BE test user chạy).
- [ ] **R7 — Shared add-all guest/hết hàng:** trace `SharedRoomItems.onAddRoom` + `addRoomToCart`. Verdict (có test).
- [ ] **R8 — Deep-link:** trace effect preload trong `RoomPlannerPage` sau khi store thêm footprint/history. Verdict.
- [ ] Ghi tất cả vào report. Với mỗi defect thật → sang systematic-debugging, fix, test.

---

### Task 2: Editor core (A1–A13) trace + fix

**Method:** với mỗi mục A, đọc file liên quan, phát biểu hành vi đúng, trace, ghi verdict. Sửa defect.

- [ ] A1–A2 RoomSetupDialog + CatalogTray addVariant (dirty, select).
- [ ] A3–A4 PlacedItem commit + FurnitureModel baseOffset (floor).
- [ ] A5–A8 select/deselect, delete, resetSelectedTransform (giữ footprint), undo/redo, duplicate.
- [ ] A9 useEditorShortcuts (guard input/status, mapping).
- [ ] A10–A11 grid snap + wall snap (đã fix 0.5) — xác nhận không xung đột nhau khi cùng bật.
- [ ] A12–A13 ScaleReference + footprint/overlap/clamp (đã trace R3–R5).
- [ ] Fix defect + test hồi quy. Cập nhật report.

---

### Task 3: Commerce (B1–B3) + Lifecycle (C1–C6) trace + fix

- [ ] B1 summarizeItems/RoomSummary (unpriced "—", tổng, disclaimer).
- [ ] B2 handleOrder → ensureSaved → addSceneToCart → /checkout.
- [ ] B3 handleAddToCart + Cart imagined callback (room_scene_id).
- [ ] C1 MyRoomsPage list/rename/delete/pagination.
- [ ] C2 RoomCard ảnh/placeholder (+ img lỗi link → có vỡ layout?).
- [ ] C3–C4 Share dialog + SharedRoomPage (mobile, 404).
- [ ] C5 SharedRoomItems (đã trace R7).
- [ ] C6 Snapshot (đã trace R1–R2).
- [ ] Fix + test. Cập nhật report.

---

### Task 4: Capability boundary (D1–D4) + BE hợp đồng (E1–E4)

- [ ] D1 useWebGLSupport gate; D2 context-lost overlay; D3 SmallScreenNotice (editor) vs shared cho mobile; D4 ModelErrorBoundary + footprint mặc định.
- [ ] E1 RoomSceneResource: grep chắc chắn KHÔNG lộ `preview_public_id`/`cloudinary_id`; có `preview_url`.
- [ ] E2 routes auth/ownership (index/show/store/update/destroy/share/showByToken/add-to-cart/convert/preview).
- [ ] E3 attachPreview/delete Cloudinary cleanup.
- [ ] E4 chỉ customer mua (OrderService/addSceneToCart gate).
- [ ] `php -l` file BE đã đụng. Fix + test/ghi user-run. Cập nhật report.

---

### Task 5: Hồi quy toàn bộ + tổng kết

- [ ] `npm run lint` + `npm test -- --run` XANH (số test ≥ trước + test hồi quy mới).
- [ ] nestify-review lại các file UI đã sửa (nếu có đổi thị giác — vd marker/overlap).
- [ ] Report: bảng verdict đầy đủ + danh sách defect đã sửa + mục "user kiểm hình" (bước tái hiện).
- [ ] KHÔNG commit. Liệt kê lệnh user cần chạy (migration, BE test, kiểm hình planner).

---

## Self-Review

- **Spec coverage:** R1–R8 = Task 1; A = Task 2; B/C = Task 3; D/E = Task 4; hồi quy = Task 5. Đủ §4+§5.
- **Placeholder scan:** các "fix hướng" là hướng điều tra, cụ thể hoá khi tìm ra root cause (đúng bản chất audit).
- **Guardrail:** không commit; BE test user chạy; không serialize public_id.
