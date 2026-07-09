# Room Planner — Editor Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the planner feel professional — undo/redo, duplicate, keyboard shortcuts, and a snap toggle — all frontend, no new dependency.

**Architecture:** All spatial-edit state lives in `editorStore`; add hand-rolled `past`/`future` snapshot history, a `duplicateSelected` action, and a `snap` flag. A `useEditorShortcuts` hook drives the store from the keyboard. The toolbar exposes undo/redo/snap; snap is applied via `TransformControls` snap props threaded through `RoomCanvas` → `PlacedItem`.

**Tech Stack:** React (JSX), zustand 4.5, @react-three/drei 9.114 `TransformControls`, Vitest + RTL.

## Global Constraints

- **No new npm dependency** — undo/redo is a hand-rolled snapshot stack (zustand only).
- **No BE changes.**
- **Do NOT run `git commit` until the user authorizes** (project guardrail). "Commit" steps = *stage + hold*.
- **Colour roles unchanged:** Undo/Redo/Snap/Duplicate are mechanical → `secondary`/`ghost`
  styling; `imagined` stays on Save, `confirmed` on Checkout only.
- Plain JSX (no TS). Editor stays desktop-only. Full FE suite (434) stays green.
- Snap values: `translationSnap 0.25`, `rotationSnap Math.PI/12`, `scaleSnap 0.1`.
- Gizmo-mode keys: `1`=translate, `2`=rotate, `3`=scale.

## File Structure

**Modify:**
- `src/features/roomPlanner/editorStore.js` — history, `duplicateSelected`, `undo`/`redo`, `snap`/`toggleSnap`.
- `src/features/roomPlanner/editorStore.test.js` — new cases.
- `src/pages/roomPlanner/SelectedItemPanel.jsx` — "Nhân bản" button (`onDuplicate` prop).
- `src/pages/roomPlanner/RoomPlannerPage.jsx` — call `useEditorShortcuts`; pass duplicate + undo/redo/snap props.
- `src/pages/roomPlanner/PlannerToolbar.jsx` — Undo/Redo buttons + Snap toggle + gizmo-key hint.
- `src/pages/roomPlanner/PlannerToolbar.test.jsx` — new cases.
- `src/pages/roomPlanner/scene/RoomCanvas.jsx` — read `snap`, pass to items.
- `src/pages/roomPlanner/scene/PlacedItem.jsx` — snap props on `TransformControls`.

**Create:**
- `src/pages/roomPlanner/useEditorShortcuts.js` + `useEditorShortcuts.test.jsx`.

---

### Task 1: `editorStore` — history, duplicate, snap

**Files:**
- Modify: `src/features/roomPlanner/editorStore.js`
- Test: `src/features/roomPlanner/editorStore.test.js`

**Interfaces:**
- Produces (new store members): `past: []`, `future: []`, `snap: false`; actions
  `duplicateSelected()`, `undo()`, `redo()`, `toggleSnap()`. Item-mutating actions
  (`addVariant`, `updateTransform`, `deleteSelected`, `resetSelectedTransform`,
  `duplicateSelected`) push the pre-change items onto `past` and clear `future`.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/roomPlanner/editorStore.test.js`:

```javascript
  it('undo/redo step through add and transform', () => {
    const store = () => useEditorStore.getState()
    store().initNew({ width: 4, depth: 4, height: 2.8 })
    store().addVariant(variant)
    const id = store().items[0].localId
    store().updateTransform(id, { position: { x: 1, y: 0, z: 1 } })
    expect(store().items[0].position).toEqual({ x: 1, y: 0, z: 1 })

    store().undo() // undo the transform
    expect(store().items[0].position).toEqual({ x: 0, y: 0, z: 0 })
    store().undo() // undo the add
    expect(store().items).toHaveLength(0)

    store().redo() // redo the add
    expect(store().items).toHaveLength(1)
    store().redo() // redo the transform
    expect(store().items[0].position).toEqual({ x: 1, y: 0, z: 1 })
  })

  it('undo/redo are no-ops at the ends of history', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    expect(() => { useEditorStore.getState().undo(); useEditorStore.getState().redo() }).not.toThrow()
    expect(useEditorStore.getState().items).toHaveLength(0)
  })

  it('duplicateSelected clones with an offset, clamps, and selects the clone', () => {
    const store = () => useEditorStore.getState()
    store().initNew({ width: 4, depth: 4, height: 2.8 })
    store().addVariant(variant) // at origin
    store().duplicateSelected()
    const s = store()
    expect(s.items).toHaveLength(2)
    expect(s.items[1].position).toEqual({ x: 0.3, y: 0, z: 0.3 })
    expect(s.selectedId).toBe(s.items[1].localId)
    expect(s.items[1].variant.id).toBe(variant.id)
  })

  it('duplicateSelected is a no-op when nothing is selected', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().selectItem(null)
    useEditorStore.getState().duplicateSelected()
    expect(useEditorStore.getState().items).toHaveLength(0)
  })

  it('loadScene and reset clear undo history', () => {
    const store = () => useEditorStore.getState()
    store().initNew({ width: 4, depth: 4, height: 2.8 })
    store().addVariant(variant)
    expect(store().past.length).toBeGreaterThan(0)
    store().loadScene({ id: 1, name: 'P', width: '3', depth: '3', height: '2.5', items: [] })
    expect(store().past).toEqual([])
    expect(store().future).toEqual([])
  })

  it('toggleSnap flips the snap flag without touching history', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    expect(useEditorStore.getState().snap).toBe(false)
    useEditorStore.getState().toggleSnap()
    expect(useEditorStore.getState().snap).toBe(true)
    expect(useEditorStore.getState().past).toEqual([])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/roomPlanner/editorStore.test.js`
Expected: FAIL — `undo`/`duplicateSelected`/`toggleSnap`/`snap` undefined.

- [ ] **Step 3: Implement the store changes**

Edit `src/features/roomPlanner/editorStore.js`. Add the history cap + snapshot helper near the top (after imports):

```javascript
const HISTORY_CAP = 50
const snapshot = (items) => structuredClone(items)
// Push the current items onto the undo stack (capped) and drop any redo future.
const pushPast = (s) => ({ past: [...s.past, snapshot(s.items)].slice(-HISTORY_CAP), future: [] })
```

Add `past: [], future: [], snap: false` to `emptyState`.

Prefix the item-mutating actions with `...pushPast(s)` and add the new actions. The updated action set:

```javascript
  addVariant: (variant) => set((s) => {
    const item = { localId: makeLocalId(), variant, ...structuredClone(IDENTITY) }
    return { ...pushPast(s), items: [...s.items, item], selectedId: item.localId, dirty: true }
  }),

  duplicateSelected: () => set((s) => {
    if (s.selectedId === null) return {}
    const src = s.items.find((it) => it.localId === s.selectedId)
    if (!src) return {}
    const clone = {
      ...structuredClone(src),
      localId: makeLocalId(),
      position: clampToRoom({ x: src.position.x + 0.3, y: src.position.y, z: src.position.z + 0.3 }, s.room),
    }
    return { ...pushPast(s), items: [...s.items, clone], selectedId: clone.localId, dirty: true }
  }),

  updateTransform: (localId, patch) => set((s) => ({
    ...pushPast(s),
    dirty: true,
    items: s.items.map((it) => {
      if (it.localId !== localId) return it
      const next = { ...it }
      if ('position' in patch) next.position = clampToRoom(patch.position, s.room)
      if ('rotation' in patch) next.rotation = { ...patch.rotation }
      if ('scale' in patch) next.scale = { ...patch.scale }
      return next
    }),
  })),

  deleteSelected: () => set((s) => {
    if (s.selectedId === null) return {}
    return {
      ...pushPast(s),
      items: s.items.filter((it) => it.localId !== s.selectedId),
      selectedId: null,
      dirty: true,
    }
  }),

  resetSelectedTransform: () => set((s) => ({
    ...pushPast(s),
    dirty: true,
    items: s.items.map((it) => (it.localId === s.selectedId ? { ...it, ...structuredClone(IDENTITY) } : it)),
  })),

  undo: () => set((s) => {
    if (s.past.length === 0) return {}
    const previous = s.past[s.past.length - 1]
    const stillSelected = previous.some((it) => it.localId === s.selectedId)
    return {
      items: previous,
      past: s.past.slice(0, -1),
      future: [snapshot(s.items), ...s.future],
      selectedId: stillSelected ? s.selectedId : null,
      dirty: true,
    }
  }),

  redo: () => set((s) => {
    if (s.future.length === 0) return {}
    const next = s.future[0]
    const stillSelected = next.some((it) => it.localId === s.selectedId)
    return {
      items: next,
      past: [...s.past, snapshot(s.items)].slice(-HISTORY_CAP),
      future: s.future.slice(1),
      selectedId: stillSelected ? s.selectedId : null,
      dirty: true,
    }
  }),

  toggleSnap: () => set((s) => ({ snap: !s.snap })),
```

`loadScene` must also clear history — add `past: [], future: []` to its `set(...)`:

```javascript
  loadScene: (resource) => set({ ...sceneToEditorState(resource), selectedId: null, gizmoMode: 'translate', dirty: false, status: 'ready', past: [], future: [] }),
```

(`reset` and `initNew` already spread `...emptyState`, so they reset `past`/`future`/`snap`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/roomPlanner/editorStore.test.js`
Expected: PASS (existing + 6 new).

- [ ] **Step 5: Commit** (stage + hold)

```bash
git add src/features/roomPlanner/editorStore.js src/features/roomPlanner/editorStore.test.js
git commit -m "feat(planner): add undo/redo history, duplicate, and snap flag to the editor store"
```

---

### Task 2: keyboard shortcuts + duplicate button

**Files:**
- Create: `src/pages/roomPlanner/useEditorShortcuts.js`
- Create: `src/pages/roomPlanner/useEditorShortcuts.test.jsx`
- Modify: `src/pages/roomPlanner/SelectedItemPanel.jsx`
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx`

**Interfaces:**
- Consumes: `editorStore` actions from Task 1.
- Produces: `useEditorShortcuts()` — installs a window keydown listener; `SelectedItemPanel`
  gains an `onDuplicate` prop and a "Nhân bản" button.

- [ ] **Step 1: Write the failing hook test**

Create `src/pages/roomPlanner/useEditorShortcuts.test.jsx`:

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const variant = { id: 12, sku: 'S', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 }

function Harness() {
  useEditorShortcuts()
  return <input data-testid="field" aria-label="field" />
}

function seedReadyWithItem() {
  const s = useEditorStore.getState()
  s.reset()
  s.initNew({ width: 4, depth: 4, height: 2.8 })
  s.addVariant(variant)
}

describe('useEditorShortcuts', () => {
  beforeEach(() => { seedReadyWithItem() })

  it('Delete removes the selected item', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(useEditorStore.getState().items).toHaveLength(0)
  })

  it('Ctrl+Z undoes, Ctrl+Shift+Z redoes', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true }) // undo the add
    expect(useEditorStore.getState().items).toHaveLength(0)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }) // redo
    expect(useEditorStore.getState().items).toHaveLength(1)
  })

  it('Ctrl+D duplicates the selection', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    expect(useEditorStore.getState().items).toHaveLength(2)
  })

  it('digit keys switch gizmo mode; Escape deselects', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: '2' })
    expect(useEditorStore.getState().gizmoMode).toBe('rotate')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('ignores shortcuts while typing in a field', () => {
    const { getByTestId } = render(<Harness />)
    fireEvent.keyDown(getByTestId('field'), { key: 'Delete' })
    expect(useEditorStore.getState().items).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/useEditorShortcuts.test.jsx`
Expected: FAIL — cannot resolve `./useEditorShortcuts`.

- [ ] **Step 3: Implement the hook**

Create `src/pages/roomPlanner/useEditorShortcuts.js`:

```javascript
import { useEffect } from 'react'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const GIZMO_KEYS = { 1: 'translate', 2: 'rotate', 3: 'scale' }

// Keyboard editing for the planner. Reads the store via getState() so the single
// window listener never goes stale. No-ops while typing in a field or before the
// room is ready.
export function useEditorShortcuts() {
  useEffect(() => {
    const handler = (e) => {
      const store = useEditorStore.getState()
      if (store.status !== 'ready') return

      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return

      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); return }
      if (mod && key === 'y') { e.preventDefault(); store.redo(); return }
      if (mod && key === 'd') { e.preventDefault(); store.duplicateSelected(); return }
      if (mod) return // leave other ctrl/cmd combos to the browser

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedId !== null) { e.preventDefault(); store.deleteSelected() }
        return
      }
      if (e.key === 'Escape') { store.selectItem(null); return }
      if (GIZMO_KEYS[e.key]) { store.setGizmoMode(GIZMO_KEYS[e.key]) }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/useEditorShortcuts.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the "Nhân bản" button to `SelectedItemPanel.jsx`**

Add `Copy` to the lucide import, add `onDuplicate` to the props, and add a button before
"Đặt lại vị trí":

```jsx
import { Copy, RotateCcw, Trash2 } from 'lucide-react'

export function SelectedItemPanel({ item, onDelete, onResetTransform, onDuplicate }) {
  if (!item) return null
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <p className="mb-3 truncate text-sm font-medium text-foreground">{item.variant.name}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-border py-2 text-sm text-foreground hover:border-border-strong"
        >
          <Copy size={15} aria-hidden="true" /> Nhân bản
        </button>
        <button
          type="button"
          onClick={onResetTransform}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-border py-2 text-sm text-foreground hover:border-border-strong"
        >
          <RotateCcw size={15} aria-hidden="true" /> Đặt lại vị trí
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-destructive/40 py-2 text-sm text-destructive hover:bg-destructive/5"
        >
          <Trash2 size={15} aria-hidden="true" /> Xoá
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Wire the hook + duplicate in `RoomPlannerPage.jsx`**

Import and call the hook (top of the component body), and pass `onDuplicate`:

```jsx
import { useEditorShortcuts } from './useEditorShortcuts'
```

```jsx
  useEditorShortcuts()
```

```jsx
            <SelectedItemPanel item={selectedItem} onDelete={store.deleteSelected} onResetTransform={store.resetSelectedTransform} onDuplicate={store.duplicateSelected} />
```

- [ ] **Step 7: Verify**

Run: `npx vitest run src/pages/roomPlanner && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 8: Commit** (stage + hold)

```bash
git add src/pages/roomPlanner/useEditorShortcuts.js src/pages/roomPlanner/useEditorShortcuts.test.jsx src/pages/roomPlanner/SelectedItemPanel.jsx src/pages/roomPlanner/RoomPlannerPage.jsx
git commit -m "feat(planner): keyboard shortcuts and a duplicate-item action"
```

---

### Task 3: toolbar undo/redo + snap toggle + snap plumbing

**Files:**
- Modify: `src/pages/roomPlanner/PlannerToolbar.jsx`
- Modify: `src/pages/roomPlanner/PlannerToolbar.test.jsx`
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx`
- Modify: `src/pages/roomPlanner/scene/RoomCanvas.jsx`
- Modify: `src/pages/roomPlanner/scene/PlacedItem.jsx`

**Interfaces:**
- Consumes: store `undo`/`redo`/`past`/`future`/`snap`/`toggleSnap` (Task 1).
- Produces: `PlannerToolbar` gains `onUndo`, `onRedo`, `canUndo`, `canRedo`, `snap`,
  `onToggleSnap`; `PlacedItem` gains a `snap` prop applied to `TransformControls`.

- [ ] **Step 1: Write the failing toolbar tests**

In `src/pages/roomPlanner/PlannerToolbar.test.jsx`, add `onUndo, onRedo, canUndo, canRedo, snap, onToggleSnap` to the `base` object, then add:

```jsx
  it('calls onUndo / onRedo and disables them per history', async () => {
    const onUndo = vi.fn(); const onRedo = vi.fn()
    render(<PlannerToolbar {...base} onUndo={onUndo} onRedo={onRedo} canUndo canRedo={false} />)
    await userEvent.click(screen.getByRole('button', { name: /hoàn tác/i }))
    expect(onUndo).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /làm lại/i })).toBeDisabled()
  })

  it('toggles snap', async () => {
    const onToggleSnap = vi.fn()
    render(<PlannerToolbar {...base} onToggleSnap={onToggleSnap} snap={false} />)
    const btn = screen.getByRole('button', { name: /snap/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(onToggleSnap).toHaveBeenCalled()
  })
```

Set the `base` additions to: `onUndo: vi.fn(), onRedo: vi.fn(), canUndo: true, canRedo: true, snap: false, onToggleSnap: vi.fn()`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/PlannerToolbar.test.jsx`
Expected: FAIL — no undo/redo/snap buttons.

- [ ] **Step 3: Add the buttons to `PlannerToolbar.jsx`**

Add `Undo2, Redo2, Magnet` to the lucide import; add `onUndo, onRedo, canUndo, canRedo, snap, onToggleSnap` to the props. Insert an undo/redo group and a snap toggle around the gizmo-mode cluster (all neutral styling — a small icon-button style):

```jsx
      <div className="flex items-center gap-1 rounded-control border border-border p-1">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Hoàn tác"
          className="rounded-control p-1.5 text-foreground hover:bg-surface-alt disabled:opacity-40">
          <Undo2 size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Làm lại"
          className="rounded-control p-1.5 text-foreground hover:bg-surface-alt disabled:opacity-40">
          <Redo2 size={16} aria-hidden="true" />
        </button>
      </div>
```

And, next to the gizmo-mode group, the snap toggle:

```jsx
      <button type="button" onClick={onToggleSnap} aria-pressed={snap} title="Bắt điểm 0.25m / 15°"
        className={`flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-sm transition-colors ${snap ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'}`}>
        <Magnet size={15} aria-hidden="true" /> Snap
      </button>
```

Keep the placement inside the toolbar's centre area; do not alter the Save/Share/cart/order group.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/PlannerToolbar.test.jsx`
Expected: PASS.

- [ ] **Step 5: Thread snap through `RoomCanvas.jsx` → `PlacedItem.jsx`**

In `RoomCanvas.jsx`, read `snap` and pass it to each `PlacedItem`:

```jsx
  const snap = useEditorStore((s) => s.snap)
```

```jsx
        <PlacedItem
          key={item.localId}
          item={item}
          selected={item.localId === selectedId}
          gizmoMode={gizmoMode}
          snap={snap}
          onSelect={selectItem}
          onTransform={updateTransform}
          onDragChange={(dragging) => setOrbitEnabled(!dragging)}
        />
```

In `PlacedItem.jsx`, accept `snap` and apply the snap props on `TransformControls`:

```jsx
export function PlacedItem({ item, selected, gizmoMode, snap, onSelect, onTransform, onDragChange }) {
```

```jsx
    <TransformControls
      object={groupRef}
      mode={gizmoMode}
      translationSnap={snap ? 0.25 : null}
      rotationSnap={snap ? Math.PI / 12 : null}
      scaleSnap={snap ? 0.1 : null}
      onMouseUp={commit}
      onDraggingChanged={(e) => onDragChange(Boolean(e?.value))}
    >
```

- [ ] **Step 6: Wire the toolbar props in `RoomPlannerPage.jsx`**

Pass the undo/redo/snap props to `PlannerToolbar` (the `store` here is the full `useEditorStore()`):

```jsx
          onUndo={store.undo}
          onRedo={store.redo}
          canUndo={store.past.length > 0}
          canRedo={store.future.length > 0}
          snap={store.snap}
          onToggleSnap={store.toggleSnap}
```

- [ ] **Step 7: Verify the planner suite + full FE suite**

Run: `npx vitest run src/pages/roomPlanner src/features/roomPlanner && npm run lint`
Expected: PASS, lint clean.
Run: `npx vitest run`
Expected: all green (≥ 434 + new tests).

- [ ] **Step 8: Commit** (stage + hold)

```bash
git add src/pages/roomPlanner/PlannerToolbar.jsx src/pages/roomPlanner/PlannerToolbar.test.jsx src/pages/roomPlanner/RoomPlannerPage.jsx src/pages/roomPlanner/scene/RoomCanvas.jsx src/pages/roomPlanner/scene/PlacedItem.jsx
git commit -m "feat(planner): toolbar undo/redo and a grid/rotation snap toggle"
```

---

## Self-Review

**Spec coverage:**
- B1 undo/redo (history in store + toolbar buttons + Ctrl+Z/Y) → Task 1 (store) + Task 3 (toolbar) + Task 2 (keys). ✓
- B2 duplicate (store action + SelectedItemPanel button + Ctrl+D) → Task 1 + Task 2. ✓
- B3 shortcuts (delete/gizmo/undo/redo/duplicate/deselect + input guard) → Task 2. ✓
- B4 snap (store flag + toolbar toggle + TransformControls props) → Task 1 + Task 3. ✓
- Testing per layer (store units, hook, toolbar) → each task; full suite at the end. ✓
- Non-goals (wall-snap, multi-select, copy/paste, undoing name/room) → untouched. ✓

**Placeholder scan:** No TBD/TODO; every step shows real code and exact run commands.

**Type/name consistency:** store actions `undo`/`redo`/`duplicateSelected`/`toggleSnap` and
state `past`/`future`/`snap` are defined in Task 1 and consumed by name in Tasks 2 (hook,
`onDuplicate`) and 3 (toolbar props `onUndo`/`onRedo`/`canUndo`/`canRedo`/`snap`/`onToggleSnap`;
`PlacedItem` `snap` prop). Gizmo-key map `{1,2,3}` matches the spec. Snap values
`0.25`/`Math.PI/12`/`0.1` are identical in store-independent `PlacedItem` and the spec.
