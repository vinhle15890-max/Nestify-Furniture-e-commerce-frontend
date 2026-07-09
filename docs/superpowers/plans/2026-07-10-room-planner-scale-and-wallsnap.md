# Room Planner — Mốc tỉ lệ + Bắt tường — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans hoặc subagent-driven-development. Steps dùng checkbox.

**Goal:** Thêm mốc tỉ lệ (bóng người 1.7m kéo được + khung cửa) và bắt-tường-nam-châm (nút toggle) vào Room Planner.

**Architecture:** Hàm thuần `snapToWalls` trong `collision.js`; cờ ephemeral `wallSnap`/`showScaleRef`/`scaleRefPos` trong `editorStore` (không undo/dirty/BE); component `ScaleReference` (người kéo bằng TransformControls + cửa cố định) render trong `RoomCanvas` khi bật; 2 nút toggle trên `PlannerToolbar`.

**Tech Stack:** React 18 JSX, zustand, @react-three/fiber + drei (TransformControls) + three (capsule/sphere/plane geometry), Vitest + RTL.

## Global Constraints

- Thuần FE, KHÔNG BE, KHÔNG thêm dependency.
- KHÔNG commit (guardrail) — mỗi task đóng bằng `npm run lint` + `npm test -- --run` xanh.
- Plain JS. 3D hex mirror token: người `emerging` #8A7C68, cửa `unbuilt` #C9C4B8. KHÔNG imagined/confirmed/đỏ/terracotta/cream.
- `wallSnap`/`showScaleRef`/`scaleRefPos`: KHÔNG vào undo history, KHÔNG set dirty, KHÔNG trong save payload.

---

### Task 1: `snapToWalls` (pure) trong collision.js

**Files:** Modify `src/features/roomPlanner/collision.js`; Test `src/features/roomPlanner/collision.test.js`.

**Interfaces:** Produces `WALL_SNAP_THRESHOLD` (0.2) và `snapToWalls(position, room, halfExtents, threshold) → {x,y,z}`.

- [ ] **Step 1: Test đỏ** (thêm vào `collision.test.js`)

```js
import { snapToWalls, WALL_SNAP_THRESHOLD } from './collision'

describe('snapToWalls', () => {
  const room = { width: 4, depth: 4, height: 3 }
  const he = { hx: 0.5, hz: 0.5 } // món 1×1
  it('cạnh gần tường (< ngưỡng) → hút flush', () => {
    // flush x = 2 - 0.5 = 1.5; đặt ở 1.4 (cách 0.1 < 0.2) → hút về 1.5
    expect(snapToWalls({ x: 1.4, y: 0, z: 0 }, room, he, WALL_SNAP_THRESHOLD).x).toBeCloseTo(1.5)
  })
  it('xa tường (> ngưỡng) → giữ nguyên', () => {
    expect(snapToWalls({ x: 0.5, y: 0, z: 0 }, room, he, WALL_SNAP_THRESHOLD).x).toBeCloseTo(0.5)
  })
  it('hai trục độc lập', () => {
    const r = snapToWalls({ x: 1.45, y: 0, z: -1.42 }, room, he, WALL_SNAP_THRESHOLD)
    expect(r.x).toBeCloseTo(1.5)
    expect(r.z).toBeCloseTo(-1.5)
  })
  it('giữa phòng không hút', () => {
    expect(snapToWalls({ x: 0, y: 0.3, z: 0 }, room, he, WALL_SNAP_THRESHOLD)).toEqual({ x: 0, y: 0.3, z: 0 })
  })
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/features/roomPlanner/collision.test.js`

- [ ] **Step 3: Thêm vào `collision.js`**

```js
export const WALL_SNAP_THRESHOLD = 0.2

// Hút cạnh món áp sát tường khi cạnh cách tường < threshold. Mỗi trục độc lập.
// Gọi SAU clampRectToRoom (đã nằm trong phòng). y giữ nguyên.
export function snapToWalls(position, room, halfExtents, threshold) {
  const snapAxis = (v, half, he) => {
    const flush = half - he // tường dương
    if (Math.abs(v - flush) < threshold) return flush
    if (Math.abs(v + flush) < threshold) return -flush
    return v
  }
  return {
    x: snapAxis(position.x, room.width / 2, halfExtents.hx),
    y: position.y,
    z: snapAxis(position.z, room.depth / 2, halfExtents.hz),
  }
}
```

- [ ] **Step 4: Chạy → XANH.**
- [ ] **Step 5: Checkpoint** — lint xanh. KHÔNG commit.

---

### Task 2: editorStore — wallSnap + scale-ref state + tích hợp updateTransform

**Files:** Modify `src/features/roomPlanner/editorStore.js`; Test `editorStore.test.js`.

**Interfaces:** Consumes `snapToWalls`, `WALL_SNAP_THRESHOLD` (Task 1). Produces state `wallSnap`, `showScaleRef`, `scaleRefPos{x,z}` + actions `toggleWallSnap()`, `toggleScaleRef()`, `setScaleRefPos({x,z})`; `updateTransform` hút tường khi `wallSnap`.

- [ ] **Step 1: Test đỏ** (thêm vào `editorStore.test.js`)

```js
it('toggleWallSnap / toggleScaleRef lật cờ', () => {
  const g = () => useEditorStore.getState()
  g().initNew({ width: 4, depth: 4, height: 2.8 })
  expect(g().wallSnap).toBe(false)
  g().toggleWallSnap(); expect(g().wallSnap).toBe(true)
  expect(g().showScaleRef).toBe(false)
  g().toggleScaleRef(); expect(g().showScaleRef).toBe(true)
})

it('setScaleRefPos kẹp trong phòng, không đụng history/dirty', () => {
  const g = () => useEditorStore.getState()
  g().initNew({ width: 4, depth: 4, height: 2.8 })
  useEditorStore.setState({ dirty: false })
  const pastBefore = g().past.length
  g().setScaleRefPos({ x: 99, z: -99 })
  expect(g().scaleRefPos).toEqual({ x: 2, z: -2 })
  expect(g().past.length).toBe(pastBefore)
  expect(g().dirty).toBe(false)
})

it('updateTransform hút tường khi wallSnap bật', () => {
  const g = () => useEditorStore.getState()
  g().initNew({ width: 4, depth: 4, height: 2.8 })
  g().addVariant({ id: 1, model_3d_url: null }) // footprint 1×1 → nửa 0.5, flush ±1.5
  const id = g().items[0].localId
  g().toggleWallSnap()
  g().updateTransform(id, { position: { x: 1.42, y: 0, z: 0 } }) // cách flush 0.08 < 0.2
  expect(g().items[0].position.x).toBeCloseTo(1.5)
})

it('updateTransform KHÔNG hút khi wallSnap tắt', () => {
  const g = () => useEditorStore.getState()
  g().initNew({ width: 4, depth: 4, height: 2.8 })
  g().addVariant({ id: 1, model_3d_url: null })
  const id = g().items[0].localId
  g().updateTransform(id, { position: { x: 1.42, y: 0, z: 0 } })
  expect(g().items[0].position.x).toBeCloseTo(1.42)
})
```

- [ ] **Step 2: Chạy → ĐỎ.**

- [ ] **Step 3: Sửa `editorStore.js`**

Import: thêm `snapToWalls, WALL_SNAP_THRESHOLD` vào dòng import collision, và thêm lại `clampToRoom` từ threeD (cho setScaleRefPos):

```js
import { makeLocalId, clampToRoom } from './threeD'
import { clampRectToRoom, rotatedHalfExtents, snapToWalls, WALL_SNAP_THRESHOLD } from './collision'
```

`emptyState` — thêm 3 field (cạnh `snap: false`):

```js
  snap: false,
  wallSnap: false,
  showScaleRef: false,
  scaleRefPos: { x: 0, z: 0 },
```

Actions mới (cạnh `toggleSnap`):

```js
  toggleWallSnap: () => set((s) => ({ wallSnap: !s.wallSnap })),
  toggleScaleRef: () => set((s) => ({ showScaleRef: !s.showScaleRef })),
  setScaleRefPos: (pos) => set((s) => {
    const c = clampToRoom({ x: pos.x, y: 0, z: pos.z }, s.room)
    return { scaleRefPos: { x: c.x, z: c.z } }
  }),
```

`updateTransform` — thêm hút tường sau kẹp:

```js
    if ('position' in patch) {
      const he = rotatedHalfExtents(next.footprint, next.scale, next.rotation.y)
      let p = clampRectToRoom(patch.position, s.room, he)
      if (s.wallSnap) p = snapToWalls(p, s.room, he, WALL_SNAP_THRESHOLD)
      next.position = p
    }
```

- [ ] **Step 4: Chạy → XANH** (`editorStore.test.js`).
- [ ] **Step 5: Checkpoint** — lint xanh. KHÔNG commit.

---

### Task 3: `ScaleReference.jsx` + render trong RoomCanvas

**Files:** Create `src/pages/roomPlanner/scene/ScaleReference.jsx`; Modify `src/pages/roomPlanner/scene/RoomCanvas.jsx`; Test `src/pages/roomPlanner/scene/ScaleReference.test.jsx`.

**Interfaces:** `ScaleReference({ room, onDragChange })` — người kéo được (đọc/ghi `scaleRefPos`) + cửa cố định.

- [ ] **Step 1: Test đỏ** — `ScaleReference.test.jsx`

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ScaleReference } from './ScaleReference'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => children }))
vi.mock('@react-three/drei', () => ({ TransformControls: ({ children }) => children }))

describe('ScaleReference', () => {
  it('render bóng người + cửa (>=3 mesh) không throw', () => {
    useEditorStore.getState().reset()
    const { container } = render(<ScaleReference room={{ width: 4, depth: 4, height: 3 }} onDragChange={() => {}} />)
    expect(container.querySelectorAll('mesh').length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/pages/roomPlanner/scene/ScaleReference.test.jsx`

- [ ] **Step 3: Tạo `ScaleReference.jsx`**

```jsx
import { useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Mốc tỉ lệ THỤ ĐỘNG (không số đo, không verdict): bóng người ~1.7m = sự hiện diện
// của user (kéo được để ướm cạnh từng món) + khung cửa 0.9×2.0m cố định trên tường
// sau. Tông emerging/unbuilt, mờ. Chỉ hiện trong editor khi bật "Tỉ lệ".
export function ScaleReference({ room, onDragChange }) {
  const pos = useEditorStore((s) => s.scaleRefPos)
  const setScaleRefPos = useEditorStore((s) => s.setScaleRefPos)
  const groupRef = useRef()

  const commit = () => {
    const n = groupRef.current
    if (n) setScaleRefPos({ x: n.position.x, z: n.position.z })
  }

  return (
    <group>
      <TransformControls
        object={groupRef}
        mode="translate"
        showY={false}
        onMouseUp={commit}
        onDraggingChanged={(e) => onDragChange(Boolean(e?.value))}
      >
        {/* Người ~1.7m: capsule (thân) + sphere (đầu), emerging mờ. */}
        <group ref={groupRef} position={[pos.x, 0, pos.z]}>
          <mesh position={[0, 0.85, 0]}>
            <capsuleGeometry args={[0.2, 1.3, 6, 12]} />
            <meshStandardMaterial color="#8A7C68" transparent opacity={0.5} />
          </mesh>
          <mesh position={[0, 1.62, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#8A7C68" transparent opacity={0.5} />
          </mesh>
        </group>
      </TransformControls>
      {/* Cửa 0.9×2.0m trên tường sau — unbuilt mờ, lệch ε tránh z-fighting. */}
      <mesh position={[0, 1.0, -room.depth / 2 + 0.01]}>
        <planeGeometry args={[0.9, 2.0]} />
        <meshStandardMaterial color="#C9C4B8" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
```

`RoomCanvas.jsx` — đọc `showScaleRef`, render `ScaleReference` trong SceneStage:

```jsx
import { ScaleReference } from './ScaleReference'
// ... trong RoomCanvas:
  const showScaleRef = useEditorStore((s) => s.showScaleRef)
// ... trong <SceneStage ...> sau danh sách PlacedItem:
      {showScaleRef && <ScaleReference room={room} onDragChange={(d) => setOrbitEnabled(!d)} />}
```

- [ ] **Step 4: Chạy → XANH.**
- [ ] **Step 5: Checkpoint** — lint xanh. KHÔNG commit.

---

### Task 4: Toolbar 2 nút toggle + wiring RoomPlannerPage

**Files:** Modify `src/pages/roomPlanner/PlannerToolbar.jsx`; Modify `src/pages/roomPlanner/RoomPlannerPage.jsx`; Test `PlannerToolbar.test.jsx`.

**Interfaces:** `PlannerToolbar` nhận thêm props `wallSnap, onToggleWallSnap, showScaleRef, onToggleScaleRef`.

- [ ] **Step 1: Test đỏ** (thêm vào `PlannerToolbar.test.jsx`; thêm default props vào `base`)

```js
// trong object base: thêm
//   wallSnap: false, onToggleWallSnap: vi.fn(), showScaleRef: false, onToggleScaleRef: vi.fn(),

it('toggles wall-snap', async () => {
  const onToggleWallSnap = vi.fn()
  render(<PlannerToolbar {...base} onToggleWallSnap={onToggleWallSnap} wallSnap={false} />)
  const btn = screen.getByRole('button', { name: /bắt tường/i })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(btn)
  expect(onToggleWallSnap).toHaveBeenCalled()
})

it('toggles scale reference', async () => {
  const onToggleScaleRef = vi.fn()
  render(<PlannerToolbar {...base} onToggleScaleRef={onToggleScaleRef} showScaleRef={false} />)
  const btn = screen.getByRole('button', { name: /tỉ lệ/i })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(btn)
  expect(onToggleScaleRef).toHaveBeenCalled()
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/pages/roomPlanner/PlannerToolbar.test.jsx`

- [ ] **Step 3: Sửa `PlannerToolbar.jsx`**

Import icon: thêm `Frame, Ruler` vào import lucide.

Props: thêm `wallSnap, onToggleWallSnap, showScaleRef, onToggleScaleRef` vào destructure.

Thay khối "Snap toggle" đơn lẻ bằng NHÓM 3 toggle:

```jsx
        {/* Nhóm hỗ trợ đặt món: bắt điểm lưới / bắt tường / mốc tỉ lệ. */}
        <div className="flex items-center gap-1 rounded-control border border-border p-1">
          <button
            type="button" onClick={onToggleSnap} aria-pressed={snap} title="Bắt điểm 0.25m / 15°"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${snap ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'}`}
          ><Magnet size={15} aria-hidden="true" /> Snap</button>
          <button
            type="button" onClick={onToggleWallSnap} aria-pressed={wallSnap} title="Hút cạnh món áp sát tường"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${wallSnap ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'}`}
          ><Frame size={15} aria-hidden="true" /> Bắt tường</button>
          <button
            type="button" onClick={onToggleScaleRef} aria-pressed={showScaleRef} title="Bóng người 1.7m + cửa làm mốc tỉ lệ"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${showScaleRef ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'}`}
          ><Ruler size={15} aria-hidden="true" /> Tỉ lệ</button>
        </div>
```

(Xóa khối `{/* Snap toggle ... */}` cũ.)

`RoomPlannerPage.jsx` — thêm 4 prop vào `<PlannerToolbar>` (cạnh `snap`/`onToggleSnap`):

```jsx
          snap={store.snap}
          onToggleSnap={store.toggleSnap}
          wallSnap={store.wallSnap}
          onToggleWallSnap={store.toggleWallSnap}
          showScaleRef={store.showScaleRef}
          onToggleScaleRef={store.toggleScaleRef}
```

- [ ] **Step 4: Chạy → XANH** (`PlannerToolbar.test.jsx`).
- [ ] **Step 5: nestify-review** trên `ScaleReference.jsx` + toolbar: người `emerging`, cửa `unbuilt`, không màu cấm/imagined/confirmed, không số đo/verdict. Điều chỉnh nếu cần.
- [ ] **Step 6: Checkpoint cuối** — `npm run lint` + `npm test -- --run` XANH toàn bộ. KHÔNG commit.

---

## Self-Review

- **Spec coverage:** §4 wall-snap = Task 1+2+4; §5 scale-ref = Task 2 (state) + Task 3 (component) + Task 4 (toggle); §6 test rải Task 1–4. Đủ.
- **Placeholder scan:** không TBD; mọi step có code cụ thể.
- **Type consistency:** `snapToWalls(position, room, halfExtents, threshold)`, `setScaleRefPos({x,z})`, `scaleRefPos{x,z}`, props toolbar `wallSnap/onToggleWallSnap/showScaleRef/onToggleScaleRef` khớp giữa các task.
- **Guardrail:** Checkpoint thay Commit.
