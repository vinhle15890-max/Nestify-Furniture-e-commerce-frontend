# 3D Room Planner — Design Spec

> **Historical scope — reconciled 2026-07-17:** scene management, public share and scene→cart handoff were
> later implemented. Scale was later prohibited. See `docs/CURRENT-STATE-MECHANISMS.md` for current behavior.

> **Status:** Approved design, ready for planning.
> **Date:** 2026-06-28
> **Scope (MVP):** Frontend 3D editor that creates, edits, and saves a room scene. Consumes the **already-built** backend room-scene API. Scene-list management, public share, and convert-to-order are explicitly **out of scope** for this iteration (backend already supports them; they'll be separate follow-up features).

---

## 1. Context & constraints

### Backend is already complete — do NOT touch it
The Laravel backend ships the full room-scene domain. The frontend only consumes it.

- **Tables:** `room_scenes` (`user_id`, `name`, `description`, `width`, `depth`, `height` as `decimal(8,2)`, `is_public`, `share_token`) and `room_scene_items` (`room_scene_id`, `variant_id`, `pos_x/y/z`, `rot_x/y/z`, `scale_x/y/z`).
- **Endpoints** (all under `/api`, auth via Sanctum unless noted):
  - `GET /room-scenes` — paginated list (not used this iteration)
  - `POST /room-scenes` — create, accepts initial `items[]`
  - `GET /room-scenes/{id}` — show (owner, or anyone if `is_public`)
  - `PUT|PATCH /room-scenes/{id}` — update; **when `items` is sent, BE deletes all existing items and recreates them** (full replace)
  - `DELETE /room-scenes/{id}`
  - `POST /room-scenes/{id}/share`, `GET /room-scenes/share/{token}`, `POST /room-scenes/{id}/convert-to-order` — out of scope
- **Item resource shape** returned by BE:
  ```json
  {
    "id": 1,
    "variant": { "id": 12, "sku": "SOFA-RED-L", "model_3d_url": "https://res.cloudinary.com/.../model.glb" },
    "position": { "x": 0, "y": 0, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "scale":    { "x": 1, "y": 1, "z": 1 }
  }
  ```
- **Create/update item payload** the BE validates: `items[].variant_id` (required, `exists:product_variants,id`) plus optional `items[].position.{x,y,z}`, `items[].rotation.{x,y,z}`, `items[].scale.{x,y,z}` (all `numeric`).
- `model_3d_url` is exposed on **every** `ProductVariantResource`, so the catalog API already carries it. There is **no** "has 3D model" filter endpoint — the frontend filters client-side.

### Frontend conventions to follow
- Feature-folder layout: `src/features/<domain>/api.js` (thin functions over `src/lib/apiClient`) + `hooks.js` (TanStack Query v5).
- Pages in `src/pages/<domain>/`. Routing in `src/app/router.jsx` with lazy + `<Suspense>`.
- Auth gate `src/routes/ProtectedRoute.jsx`; admin uses a standalone shell outside the storefront `Layout`.
- Catalog products: `useInfiniteProducts(filters)` → `GET /products` (cursor pagination, `filter[category]`, `filter[brand]`, `sort`).
- Design language **Warm Luxury Editorial**; **never change design tokens** (`src/styles/tokens.css` is shared with the storefront). Reuse existing primitives.
- Tests: Vitest + React Testing Library. Vietnamese UI copy.

### Known demo risk
`ProductVariantFactory` defaults `model_3d_url` to `null` and no seeder sets it. **The catalog tray will be empty until some variants have a real `.glb` URL.** Mitigation is covered in §8.

---

## 2. Goals & non-goals

**Goals (this iteration):**
1. Logged-in user opens a full-screen 3D planner, defines a room (W×D×H in metres).
2. Browses catalog products that have a 3D model, adds them into the room.
3. Selects a placed item and moves / rotates / scales it via a 3D gizmo.
4. Deletes items; resets an item's transform.
5. Saves the scene (create then update), and re-opens a saved scene by URL.

**Non-goals (deferred):**
- Scene-list/management page in the account area.
- Public share link & public viewer.
- Convert-scene-to-order.
- Mobile-optimised editing (desktop-first; small screens get a notice).
- Collision detection, physics, lighting presets, textures, measurement tools.

---

## 3. Architecture

```
src/features/roomPlanner/
  api.js              getScene, createScene, updateScene
  hooks.js            useScene, useCreateScene, useUpdateScene
  editorStore.js      Zustand store: room, items, selectedId, gizmoMode, dirty + actions
  mappers.js          sceneToEditorState(resource) / editorStateToPayload(state)  [pure]
  threeD.js           snapToFloor / clampToRoom / addLocalId helpers              [pure]

src/pages/roomPlanner/
  RoomPlannerPage.jsx        route entry: loads scene (if :id), owns layout + Suspense
  RoomSetupDialog.jsx        dimensions form for a new room
  PlannerToolbar.jsx         name, gizmo-mode toggle, Save, Exit
  CatalogTray.jsx            search + grid of 3D-enabled products; click to add
  SelectedItemPanel.jsx      delete / reset-transform for the selected item
  scene/
    RoomCanvas.jsx           <Canvas> + lights + OrbitControls + Room + items
    Room.jsx                 floor plane (W×D), 4 faint walls (H), grid
    FurnitureModel.jsx       useGLTF(model_3d_url), clone, error→placeholder box
    PlacedItem.jsx           wraps a model, handles selection + TransformControls
  SmallScreenNotice.jsx      "best on desktop" gate under a breakpoint
```

**Routing** (`src/app/router.jsx`): a **standalone full-screen** branch (sibling to `/` and `/admin`, i.e. **no storefront Header/Footer**), wrapped in `ProtectedRoute`, lazy-loaded:
```
/room-planner        → RoomPlannerPage (new scene)
/room-planner/:id    → RoomPlannerPage (edit existing)
```
After the first successful save the page `navigate`s from `/room-planner` to `/room-planner/:id` (replace) so reloads and subsequent saves target the persisted scene.

**Header link:** add "Thiết kế phòng 3D" to the storefront header nav pointing at `/room-planner`.

**Dependencies (new):** `three`, `@react-three/fiber`, `@react-three/drei`. They load only inside the lazy planner chunk so the main bundle is unaffected.

---

## 4. Data flow

1. **Open existing** (`:id`): `useScene(id)` → `GET /room-scenes/{id}` → `sceneToEditorState()` hydrates the store. 404/forbidden → friendly message + link back to store.
2. **Open new**: store starts empty; `RoomSetupDialog` collects W/D/H before the canvas is usable.
3. **Add item**: click a tray product variant → push an item at room centre (`position {x:0,y:0,z:0}`, identity rotation/scale) with a client-side `localId`; mark `dirty`.
4. **Transform**: selecting an item shows `TransformControls`; on change, write the live transform back into the store item; `snapToFloor` keeps `y` at the model's resting height, `clampToRoom` keeps it within bounds; mark `dirty`.
5. **Delete / reset**: mutate the store; mark `dirty`.
6. **Save**: `editorStateToPayload()` → `{ name, description, width, depth, height, items: [{ variant_id, position, rotation, scale }] }`.
   - No `id` yet → `useCreateScene` (`POST`) → on success store the returned `id`, clear `dirty`, redirect to `/room-planner/:id`.
   - Has `id` → `useUpdateScene` (`PATCH`, full item replace) → clear `dirty`.

**Query keys:** `['roomScene', id]`. Invalidate/`setQueryData` on save so re-entry is consistent.

---

## 5. 3D scene details

- `<Canvas>` with a neutral environment; a hemisphere + directional light (no fancy lighting this iteration). Camera starts at an angled overview of the room.
- `OrbitControls` for orbit/zoom/pan; **disabled while a `TransformControls` drag is active** (drei exposes the `dragging-changed` event) so the camera doesn't fight the gizmo.
- `Room.jsx`: floor `PlaneGeometry(width, depth)` on the XZ plane at y=0; four thin wall planes at height `height`, rendered faint/low-opacity so they don't block the view; a `gridHelper` on the floor for spatial reference. Units are **metres** (glTF convention) so a `width=4` plane is 4 model units wide.
- `FurnitureModel.jsx`: `useGLTF(url)` inside `<Suspense>`; **clone the scene** (`SkeletonUtils.clone` or `scene.clone()`) so repeated instances of the same model don't share a node; on load error render a labelled placeholder box (≈1×1×1 m) and surface a non-fatal toast. `useGLTF.preload` is invoked when a product is hovered in the tray.
- `PlacedItem.jsx`: positions the model from store transform; click selects (sets `selectedId`); when selected, attaches `TransformControls` in the current `gizmoMode` (`translate` | `rotate` | `scale`).
- **Snap & clamp** (`threeD.js`, pure & unit-tested): after any transform, snap the item so it rests on the floor and clamp its centre within the room footprint. These run on the plain transform numbers, independent of three.js, so they're testable without WebGL.

---

## 6. UI chrome (Warm Luxury tokens, existing primitives)

- **PlannerToolbar** (top bar): editable room name, a 3-way gizmo-mode toggle (Di chuyển / Xoay / Phóng to), **Lưu** button (loading + disabled when not `dirty`), **Thoát** link. Uses existing button/input styling; no new tokens.
- **CatalogTray** (side panel): reuses `SearchInput`; lists products from `useInfiniteProducts`, **client-filtered** to variants whose `model_3d_url` is truthy; each entry shows thumbnail + name + price and adds the variant on click. When a product has multiple 3D variants, the tray lists them per variant (sku/attributes label). `EmptyState` when no 3D products are available, with copy explaining a model must be uploaded.
- **SelectedItemPanel**: appears when an item is selected — shows its name and **Xoá** + **Đặt lại vị trí** (reset transform).
- **RoomSetupDialog** (Radix Dialog, matching existing modal pattern): three numeric inputs (Chiều rộng / Chiều sâu / Chiều cao) in metres, validated `> 0`, defaults **4.0 × 5.0 × 2.8 m**. Shown automatically for a new room; reachable later to edit dimensions.
- **SmallScreenNotice**: below a breakpoint (e.g. `< lg`), replace the editor with a friendly "trải nghiệm tốt nhất trên máy tính" message instead of a broken touch experience.

---

## 7. Error handling & edge cases

| Case | Behaviour |
|---|---|
| Not logged in | `ProtectedRoute` redirects to login (returnTo `/room-planner`). |
| `:id` not found / forbidden | Message + link back to store; no crash. |
| `.glb` fails to load | Placeholder box + non-fatal toast; rest of scene keeps working. |
| Save fails (network/422/stock) | Toast with message; editor state preserved (nothing lost). |
| Leave with `dirty` | Confirm prompt (`beforeunload` + in-app navigation guard). |
| No 3D products in catalog | Tray `EmptyState`; user can still set up a room. |
| Same model added many times | Cloned per instance; preload de-dupes the network fetch. |

---

## 8. Seeding / demo enablement

Because no variant currently has a `model_3d_url`, the tray is empty out of the box. To make the feature demoable, **at least one** of:
1. Admin uploads `.glb` models to a few variants via the existing product-variant admin (the `model_3d_url` field already exists), **or**
2. A small dev seeder / manual update sets `model_3d_url` on a handful of variants to public CC0 `.glb` URLs.

This is an **operational** step, noted for the user — not a code deliverable of this spec. The placeholder-box fallback guarantees the editor still works even if a URL is broken.

---

## 9. Testing strategy

WebGL doesn't run in jsdom, so we **do not** test real rendering.

- **Unit (Vitest), pure modules:**
  - `mappers.js`: `sceneToEditorState` ↔ `editorStateToPayload` round-trip; payload matches BE's expected `items[]` shape.
  - `threeD.js`: `snapToFloor`, `clampToRoom`, `addLocalId`.
  - `editorStore.js`: add / select / transform / delete / reset / dirty transitions.
  - tray filter: keeps only variants with truthy `model_3d_url`.
- **Component (RTL) with the 3D canvas mocked:** mock `@react-three/fiber` (`Canvas` → passthrough `<div>`) and `@react-three/drei` so `RoomPlannerPage`, `CatalogTray`, `PlannerToolbar`, `RoomSetupDialog`, `SelectedItemPanel` render in jsdom. Assert: dialog validates dimensions, tray adds an item, toolbar Save calls the create/update mutation with the mapped payload, dirty-guard prompts.
- **Lint** (`npm run lint`) + **build** (`vite build`) to confirm the lazy chunk compiles with the new 3D deps.

---

## 10. Documentation updates (keep-docs-in-sync)

- `Nestify-Furniture-e-commerce-frontend/docs/FE-TEAM-WORKFLOW.md`: add a Room Planner feature section (Actor → Entry → layer flow → side-effects → errors → defence points) and slot it into the team division.
- `Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md`: document the room-scenes endpoints the FE consumes and that `model_3d_url` drives the planner.
- Report `NestifyBaoCao_v2.docx`: **note the change for the user**, do not edit.
- This spec + the implementation plan live under `docs/superpowers/`.

---

## 11. Open questions / assumptions

- **Resting height for snap:** computed from each model's bounding box (place its min-Y on the floor). Assumed acceptable; revisit if specific models have odd origins.
- **Multiple 3D variants per product:** listed individually in the tray. If this feels noisy in practice, collapse to product-level with a variant picker later.
- **Undo/redo:** out of scope for MVP (store is structured to allow adding it later).
