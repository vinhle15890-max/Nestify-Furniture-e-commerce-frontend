# Room Planner — Editor Depth: Undo/Redo, Duplicate, Shortcuts, Snap (Sub-project B)

> **Historical design — reconciled 2026-07-17:** implementation is complete except scale was intentionally
> removed: only keys `1`/`2` and translate/rotate exist, and backend accepts unit scale only. See the
> current-state guide for exact history/snap mechanics.

**Date:** 2026-07-09
**Status:** Design approved, pending implementation
**Repo:** `Nestify-Furniture-e-commerce-frontend` (frontend-only; no BE changes, no new dependency)

## Context

Sub-project B of the Room Planner roadmap (A ✓ → C ✓ → B). A (scene lifecycle + share +
floor-snap) and C (bill-of-materials + order-the-room) are built. B makes the editor itself
feel professional: mistakes are cheaply reversible (undo/redo), repetition is fast
(duplicate), the tool is keyboard-driven (shortcuts), and placement is tidy (snap). This
directly serves the DNA principle that anything to do with try/adjust/undo must feel
**cheap** (Enemy = fear of irreversible decisions).

Grounding facts:
- `@react-three/drei` 9.114 + `three` 0.169 → `TransformControls` supports
  `translationSnap` / `rotationSnap` / `scaleSnap` props (snap is nearly free).
- `zustand` 4.5, no `zundo` → undo/redo is hand-rolled (no new dependency, per the repo's
  dependency caution).
- `editorStore.test.js` already exists (extend it). `PlacedItem` owns the `TransformControls`.

## Goals

1. Undo/redo spatial edits (add, transform, delete, duplicate, reset) via toolbar buttons
   and `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` (`Ctrl+Y`).
2. Duplicate the selected item (button + `Ctrl/Cmd+D`).
3. Keyboard shortcuts for delete, gizmo modes, undo/redo, duplicate, deselect.
4. A snap toggle: translation 0.25 m, rotation 15°, scale 0.1.

## Non-goals (excluded)

- Wall-snap (snapping to room walls) — more complex; a possible later addition.
- Multi-select / group transforms.
- Copy/paste between scenes.
- Undoing name or room-dimension changes (history covers item operations only).
- Adding any npm dependency (undo/redo is hand-rolled).

## Design decisions (locked)

- **Undo/redo:** hand-rolled `past`/`future` snapshot stacks in `editorStore`, capped at 50.
- **Snap:** on = `translationSnap 0.25`, `rotationSnap Math.PI/12` (15°), `scaleSnap 0.1`.
- **Gizmo-mode keys:** `1`/`2`/`3` = translate/rotate/scale (clear for non-3D users).
- **Shortcut guard:** ignore when focus is in an input/textarea/contenteditable, and when
  `store.status !== 'ready'`.

## Components & data flow

### B1. Undo/redo — `editorStore` history

- Add `past: []` and `future: []` to `emptyState` (so `reset`/`initNew`/`loadScene` start
  with empty history).
- A module-level `snapshot(items) = structuredClone(items)` (items are plain serialisable
  objects: `localId`, `variant` (flat fields), `position`/`rotation`/`scale`).
- The item-mutating actions — `addVariant`, `updateTransform`, `deleteSelected`,
  `resetSelectedTransform`, and the new `duplicateSelected` — each push the *pre-change*
  items onto `past` (capped to the last 50) and clear `future`.
- `undo()`: if `past` empty, no-op; else move the last `past` snapshot into `items`, push the
  current `items` onto `future`, keep `selectedId` if it still exists (else null), `dirty: true`.
- `redo()`: symmetric (from `future` back to `items`, current onto `past`).
- `setName`/`setRoom`/`selectItem`/`setGizmoMode`/`toggleSnap` do NOT touch history.
- `updateTransform` runs once per drag (committed on `onMouseUp`), so a drag is one undo step.

### B2. Duplicate — `editorStore.duplicateSelected`

- If nothing selected, no-op. Else clone the selected item with a fresh `localId`, offset
  `position` by `+0.3` on x and z (clamped to the room via `clampToRoom`), select the clone,
  push history, `dirty: true`.
- `SelectedItemPanel` gains a "Nhân bản" button (alongside "Đặt lại vị trí" / "Xoá").

### B3. Keyboard shortcuts — `useEditorShortcuts` hook

- New `src/pages/roomPlanner/useEditorShortcuts.js`: a `window` `keydown` listener installed
  while the planner is mounted. Reads/acts via `useEditorStore.getState()` to avoid stale
  closures. Bails when `event.target` is an input/textarea/contenteditable, or when
  `store.status !== 'ready'`.
- Bindings:
  - `Delete` / `Backspace` → `deleteSelected()` (only if something is selected).
  - `Ctrl/Cmd+Z` → `undo()`; `Ctrl/Cmd+Shift+Z` or `Ctrl+Y` → `redo()`.
  - `Ctrl/Cmd+D` → `duplicateSelected()` (`preventDefault` to suppress the browser bookmark).
  - `Escape` → `selectItem(null)`.
  - `1` / `2` / `3` → `setGizmoMode('translate' | 'rotate' | 'scale')`.
- Called once from `RoomPlannerPage` (the desktop planner shell).

### B4. Snap — toggle + `TransformControls` props

- Add `snap: false` and `toggleSnap()` to `editorStore` (not in history).
- `PlannerToolbar` gains a "Snap" toggle button (`aria-pressed={snap}`), wired to
  `store.snap` / `store.toggleSnap`.
- `RoomCanvas` reads `snap` from the store and passes it to each `PlacedItem`, which passes
  it to `TransformControls`: `translationSnap={snap ? 0.25 : null}`,
  `rotationSnap={snap ? Math.PI / 12 : null}`, `scaleSnap={snap ? 0.1 : null}`.
- Toolbar also gains Undo/Redo icon buttons (disabled from `past.length` / `future.length`)
  and a short hint that `1/2/3` switch gizmo modes.

## Error handling / edge cases

- Undo/redo no-op silently at the ends of history.
- `duplicateSelected`/`deleteSelected` no-op when nothing is selected.
- After undo/redo, a `selectedId` that no longer exists resets to null (SelectedItemPanel hides).
- Shortcuts never fire while typing (input guard) or before the room is ready.

## Testing

- **`editorStore.test.js`** (extend): undo/redo across add → transform → delete → duplicate;
  history cleared by `loadScene`/`reset`/`initNew`; `duplicateSelected` offsets + selects the
  clone + clamps into the room; `undo` restores prior items and keeps a still-present
  selection; history cap; `toggleSnap` flips the flag without touching history.
- **`useEditorShortcuts`**: a small harness mounts the hook, seeds the store, dispatches
  `keydown` events, and asserts the store changed (delete/undo/redo/duplicate/gizmo/deselect),
  plus the input-focus guard (a keydown from an `<input>` target does nothing).
- **`PlannerToolbar`**: Undo/Redo/Snap buttons render, call their handlers, disable per state.
- Full FE suite stays green (currently 434).

## DNA compliance

- No colour changes: Undo/Redo/Snap/Duplicate are mechanical → neutral/`secondary`/`ghost`
  styling; `imagined` stays on Save, `confirmed` on Checkout only.
- Editor stays desktop-only (Capability Boundary unchanged; shortcuts are a desktop affordance).
- The whole sub-project embodies "make try/adjust/undo feel cheap" — the core brand promise.
