# Room Planner — Scene Lifecycle & Sharing (Sub-project A)

> **Historical design — reconciled 2026-07-17:** lifecycle/share/cart handoff are implemented. The statement
> below that the gizmo supports scale is obsolete; current editor only translates/rotates and both layers
> reject customer scaling. See `docs/CURRENT-STATE-MECHANISMS.md`.

**Date:** 2026-07-09
**Status:** Design approved, pending implementation
**Repo:** `Nestify-Furniture-e-commerce-frontend` (frontend-only; no BE changes)

## Context

The 3D Room Planner (`/room-planner`) is functional: R3F canvas, GLB loading with
error boundary, transform gizmo (translate/rotate/scale), `clampToRoom`, deep-link
preload from Product, save/load a scene, and an add-to-cart handoff. However, the
backend already exposes capabilities the frontend never surfaces:

| BE endpoint | FE today |
|---|---|
| `GET /room-scenes` (list my saved scenes) | ❌ no "My Rooms" page — a saved scene is unreachable unless the user remembers its URL |
| `POST /room-scenes/{id}/share` + `GET /room-scenes/share/{token}` (public token) | ❌ no Share button, no shared-scene viewer |
| `POST /room-scenes/{id}/convert-to-order` | ❌ (deferred to Sub-project C) |

There is also a latent correctness bug: `snapToFloor()` exists in `threeD.js` but is
never called, so placed models sit at `y=0` with a centred origin and sink half-way
through the floor.

This is **Sub-project A** of a three-part roadmap for developing the planner further:

- **A — Scene lifecycle & sharing** (this spec): My Rooms, Share, shared read-only viewer, floor-snap fix.
- **C — Commerce clarity**: running cost / bill-of-materials panel + "order the whole room" (convert-to-order).
- **B — Editor depth**: duplicate item, undo/redo, keyboard shortcuts, grid/wall snap.

Order: A → C → B. Each is an independent spec → plan → implementation cycle.

## Goals

1. A user can find, open, rename, and delete their saved rooms from a dedicated page.
2. A user can share a saved room as a public read-only link and copy it.
3. Anyone (logged in or not) can open that link and orbit the room in read-only 3D.
4. Placed furniture rests on the floor instead of sinking into it.

## Non-goals (deferred)

- Scene thumbnails / canvas preview capture.
- Revoke / un-share (BE has no endpoint; would require a BE change).
- Listing the products (with names/prices) on the shared viewer page (would require
  enriching `RoomSceneItemResource`, which today exposes only `variant.{id,sku,model_3d_url}`).
- Duplicate ("save as") a scene.
- Editor-depth features (undo/redo, duplicate, shortcuts) — Sub-project B.
- Commerce (BoM, convert-to-order) — Sub-project C.

## Design decisions (locked)

- **My Rooms location:** under the Account cluster at `/account/rooms` (consistent with
  `/account/addresses`, `/orders`), reachable from `AccountPage`, the planner toolbar,
  and `PlannerInvite`. (Not a top-level nav item.)
- **Share scope:** minimal, **no BE change**. Make-public + copy link only. No revoke,
  no product list on the shared page.
- **Shared-viewer 3D structure:** extract a shared presentational `SceneStage`
  (Canvas + lights + `Room` + `OrbitControls` + WebGL/context-loss guards). Both the
  editor `RoomCanvas` and the new `SharedSceneCanvas` compose it. Removes duplication.
- **Verified FE-only:** `UpdateRoomSceneRequest` uses `sometimes` rules, so rename via
  `PATCH { name }` is accepted with no BE change. `UpdateRoomSceneService` leaves
  `items` untouched when the payload omits them.

## Components & data flow

### A0. Floor-snap fix (correctness prerequisite)

- In `FurnitureModel`, after cloning the GLB, measure `THREE.Box3().setFromObject(clone)`
  and translate the clone so its `min.y = 0` (base at local origin). Then a group at
  `y=0` rests on the floor; the translate-Y gizmo still lifts it; `clampToRoom` leaves
  y untouched.
- `PlaceholderBox` (unit cube centred at origin) offsets `y = 0.5` so it also rests on
  the floor.
- Extract the pure math as `baseOffset(box) → number` in `threeD.js` so it is unit-testable
  without a WebGL context. `snapToFloor` (currently dead) is superseded by base-normalisation
  and removed, or repurposed only if still referenced.

### A1. My Rooms — `/account/rooms` (ProtectedRoute)

- **`features/roomPlanner/api.js`** adds `listScenes(page)` (`GET /room-scenes?page=`) and
  `deleteScene(id)` (`DELETE /room-scenes/{id}`).
- **`features/roomPlanner/hooks.js`** adds `useScenes(page)`, `useDeleteScene()`, and
  `useRenameScene()` (`PATCH /room-scenes/{id}` with `{ name }` only; invalidates the list).
- **`pages/account/MyRoomsPage.jsx`** renders a grid of `RoomCard`s. Each card shows:
  name · dimensions `W×D×H m` · item count (`items.length`) · created date · an
  "Đang chia sẻ" badge when `is_public`. Actions: **Mở** (`Link` → `/room-planner/:id`),
  **Đổi tên** (inline edit → `useRenameScene`), **Xoá** (confirm → `useDeleteScene`).
- **Empty state:** `BecomingRoomArt level={1}` + "Chưa có phòng nào — bắt đầu hình dung
  không gian đầu tiên." + CTA "Tạo phòng mới" → `/room-planner`.
- **Pagination:** BE returns `meta.pagination` (10/page) → a "Tải thêm" (load-more) button
  driven by `meta.pagination.last_page`.
- **Entry points:** a link from `AccountPage`; a "Phòng của tôi" affordance in the planner
  toolbar near Exit; `PlannerInvite` already links planner-adjacent surfaces.

### A2. Share (from the planner toolbar)

- **api.js** adds `shareScene(id)` (`POST /room-scenes/{id}/share`).
- **hooks.js** adds `useShareScene()`.
- **`PlannerToolbar`** gains a **"Chia sẻ"** button (primary/neutral styling — **not**
  `imagined`; Save keeps the single imagined peak).
- Flow (in `RoomPlannerPage`): if unsaved/dirty → `ensureSaved()` first → `shareScene` →
  open **`ShareSceneDialog`** (a `BecomingModal`) showing the public URL
  `${window.location.origin}/room-planner/shared/${token}` with a **Copy** button
  (`navigator.clipboard.writeText`, fallback: reveal the URL for manual copy) and a
  success toast. `share` is idempotent, so re-clicking reopens the same link.

### A3. Shared read-only viewer — `/room-planner/shared/:token` (public, no auth)

- **api.js** adds `getSharedScene(token)` (`GET /room-scenes/share/{token}`).
- **hooks.js** adds `useSharedScene(token)`.
- **`pages/roomPlanner/SharedRoomPage.jsx`**: a light top bar (Logo → home · scene name ·
  CTA "Khám phá cửa hàng" → `/c/all`) above a read-only 3D canvas filling the rest.
  - **Allowed on mobile** (orbit-only is lightweight) — broadens reach without editor complexity.
  - 404 token → "Phòng chia sẻ không tồn tại hoặc đã gỡ." + link home.
  - Reuses the WebGL-unsupported fallback.
- **`SceneStage`** (new, `pages/roomPlanner/scene/SceneStage.jsx`): extracted presentational
  wrapper — `<Canvas>` + lights + `Room` + `OrbitControls` + the WebGL-support gate and
  runtime context-loss overlay. Takes `room` and `children`.
  - `RoomCanvas` (editor) = `SceneStage` + `PlacedItem`/gizmo + the deselect plane, reading
    the editor store as today.
  - `SharedSceneCanvas` (viewer) = `SceneStage` + read-only models from the fetched scene
    (`FurnitureModel`/`PlaceholderBox`, no `TransformControls`, no onClick-select), mapping
    the scene resource through `sceneToEditorState` for consistent vec3 shapes.

### A4. Router

- Add `{ path: 'account/rooms', element: lazyPage(<MyRoomsPage />) }` inside the existing
  ProtectedRoute block.
- Add a **public** bare route `{ path: '/room-planner/shared/:token', element: lazyPage(<SharedRoomPage />) }`
  outside `Layout` (full-screen like the planner).

## Error handling

- My Rooms: loading spinner; error state ("Không tải được danh sách phòng."); empty state (above).
- Delete: confirm dialog; toast on failure; list invalidation on success.
- Share: requires a saved scene (`ensureSaved`); clipboard failure falls back to a
  selectable URL.
- Shared viewer: 404 → friendly message + home link; WebGL-unsupported fallback reused.

## Testing (Vitest + RTL; mock `@react-three/fiber`'s `Canvas` as existing tests do)

- `MyRoomsPage`: renders a list; empty state; delete calls the API after confirm; rename
  issues `PATCH { name }`; "Mở" link targets `/room-planner/:id`.
- Share: toolbar button triggers `shareScene`; dialog shows the link; Copy writes to clipboard.
- `SharedRoomPage`: fetches by token; renders read-only (no gizmo/tray); 404 path.
- Floor-snap: unit-test the pure `baseOffset(box)` helper (no WebGL needed).
- Full suite must stay green (currently 419 tests).

## DNA compliance

- Share/Delete/Open are mechanical actions → neutral/primary styling; `imagined` stays
  reserved for the planner's Save peak, `confirmed` for checkout.
- My Rooms empty state and the shared viewer reuse `BecomingRoomArt` / the Becoming palette
  so the whole surface stays "one world."
- The shared viewer is a read-only depiction of a room the owner imagined — consistent with
  the Future-Home chapter; no fake confirmation, no purchase pressure.

## Out of scope / follow-ups

- Sub-project C (commerce clarity: BoM + convert-to-order).
- Sub-project B (editor depth).
- Scene thumbnails, revoke/un-share, shared-page product list (each would touch the BE).
