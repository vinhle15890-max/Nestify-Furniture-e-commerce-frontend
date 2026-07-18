# Room Planner — Spatial Confidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Món trong Room Planner không xuyên tường, và khi hai món tranh chỗ thì được nhắc nhẹ — bằng cách đo footprint mỗi món rồi dùng cho kẹp-tường theo kích thước + phát hiện chồng lấn.

**Architecture:** Thêm module hình học thuần `collision.js` (SAT cho OBB 2D + kẹp phòng theo cạnh). `editorStore` lưu `footprint` mỗi item (đo từ GLB lúc render qua `FurnitureModel.onMeasure → reportFootprint`, không vào undo/dirty). `RoomCanvas` suy ra tập xung đột và truyền cờ `conflict` cho `PlacedItem`; một notice điềm tĩnh hiện ở panel.

**Tech Stack:** React 18 (JSX), zustand, @react-three/fiber + drei + three (`Box3`, `Vector3`), Vitest + RTL.

## Global Constraints

- **Thuần FE, KHÔNG đụng BE.** Không migration, không đổi resource/endpoint/payload.
- **KHÔNG thêm dependency.** Hình học tự viết; chỉ dùng `three` đã có.
- **KHÔNG commit** (guardrail dự án) — mỗi task kết thúc bằng `npm run lint` + `npm test -- --run` XANH thay cho commit; chờ user cho phép commit.
- **Plain JS (JSX), no TypeScript.** Design tokens/semantic classes cho UI; hex trong 3D mirror token (WebGL không đọc CSS).
- **DNA:** tín hiệu cảnh báo KHÔNG đỏ báo lỗi; KHÔNG `imagined` #B5754A (dành Lưu), KHÔNG `confirmed` #3D5A45 (dành checkout), KHÔNG terracotta #D97757 / cream #F4F1EA. Marker mặc định = `ink` #26262B opacity thấp (trung tính, không báo động); chốt cuối qua skill **nestify-review**.
- Test 3D: mock `@react-three/fiber` Canvas theo pattern hiện có (children bỏ qua).

---

### Task 1: Module hình học thuần `collision.js`

**Files:**
- Create: `src/features/roomPlanner/collision.js`
- Test: `src/features/roomPlanner/collision.test.js`

**Interfaces:**
- Consumes: `clamp` từ `src/features/roomPlanner/threeD.js`.
- Produces:
  - `rotatedHalfExtents(footprint, scale, angleY) → { hx, hz }`
  - `itemRect(item) → { cx, cz, hx, hz, angle }`
  - `overlaps(rectA, rectB) → boolean`
  - `findOverlaps(items) → Set<localId>`
  - `clampRectToRoom(position, room, halfExtents) → { x, y, z }`
  - Item shape dùng ở đây: `{ localId, position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z}, footprint:{x,y,z} }`.

- [ ] **Step 1: Viết test đỏ** — `src/features/roomPlanner/collision.test.js`

```js
import { describe, it, expect } from 'vitest'
import { rotatedHalfExtents, itemRect, overlaps, findOverlaps, clampRectToRoom } from './collision'

const item = (over) => ({
  localId: 1,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  footprint: { x: 2, y: 1, z: 1 },
  ...over,
})

describe('rotatedHalfExtents', () => {
  it('không xoay → nửa footprint*scale', () => {
    expect(rotatedHalfExtents({ x: 2, y: 1, z: 4 }, { x: 1, y: 1, z: 1 }, 0)).toEqual({ hx: 1, hz: 2 })
  })
  it('xoay 90° → tráo trục x/z', () => {
    const r = rotatedHalfExtents({ x: 2, y: 1, z: 4 }, { x: 1, y: 1, z: 1 }, Math.PI / 2)
    expect(r.hx).toBeCloseTo(2)
    expect(r.hz).toBeCloseTo(1)
  })
  it('tính cả scale', () => {
    expect(rotatedHalfExtents({ x: 2, y: 1, z: 2 }, { x: 2, y: 1, z: 1 }, 0)).toEqual({ hx: 2, hz: 1 })
  })
})

describe('overlaps (SAT OBB)', () => {
  it('hai hộp chồng nhau → true', () => {
    expect(overlaps(itemRect(item()), itemRect(item({ localId: 2, position: { x: 1, y: 0, z: 0 } })))).toBe(true)
  })
  it('rời hẳn → false', () => {
    expect(overlaps(itemRect(item()), itemRect(item({ localId: 2, position: { x: 5, y: 0, z: 0 } })))).toBe(false)
  })
  it('chỉ chạm mép → false', () => {
    // footprint x=2 → nửa = 1; hai tâm cách đúng 2.0 → chạm mép, không chồng
    expect(overlaps(itemRect(item()), itemRect(item({ localId: 2, position: { x: 2, y: 0, z: 0 } })))).toBe(false)
  })
  it('hai OBB xoay 45° cài nhau → true', () => {
    const a = itemRect(item({ footprint: { x: 2, y: 1, z: 2 }, rotation: { x: 0, y: Math.PI / 4, z: 0 } }))
    const b = itemRect(item({ localId: 2, footprint: { x: 2, y: 1, z: 2 }, position: { x: 1.2, y: 0, z: 0 } }))
    expect(overlaps(a, b)).toBe(true)
  })
})

describe('findOverlaps', () => {
  it('hai món đè → cả hai localId trong Set', () => {
    const set = findOverlaps([item({ localId: 1 }), item({ localId: 2, position: { x: 1, y: 0, z: 0 } })])
    expect(set.has(1)).toBe(true)
    expect(set.has(2)).toBe(true)
  })
  it('món phẳng (< 0.1m) bị loại — thảm dưới bàn không báo', () => {
    const rug = item({ localId: 9, footprint: { x: 3, y: 0.02, z: 3 } })
    const table = item({ localId: 10 })
    expect(findOverlaps([rug, table]).size).toBe(0)
  })
  it('món rời không vào Set', () => {
    const set = findOverlaps([item({ localId: 1 }), item({ localId: 2, position: { x: 9, y: 0, z: 0 } })])
    expect(set.size).toBe(0)
  })
})

describe('clampRectToRoom', () => {
  const room = { width: 4, depth: 4, height: 3 }
  it('món vừa → kẹp cạnh (không xuyên tường)', () => {
    // hx=1 → giới hạn tâm x ∈ [-1, 1]
    expect(clampRectToRoom({ x: 5, y: 0, z: 0 }, room, { hx: 1, hz: 1 })).toEqual({ x: 1, y: 0, z: 0 })
  })
  it('món to hơn phòng trên một trục → về giữa (0)', () => {
    expect(clampRectToRoom({ x: 5, y: 0, z: 0 }, room, { hx: 3, hz: 1 })).toEqual({ x: 0, y: 0, z: 1 })
  })
})
```

- [ ] **Step 2: Chạy test → phải ĐỎ**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run src/features/roomPlanner/collision.test.js`
Expected: FAIL ("does not provide an export named ...").

- [ ] **Step 3: Viết `collision.js`**

```js
import { clamp } from './threeD'

const EPS = 1e-6
const FLAT_THRESHOLD = 0.1 // món cao < 0.1m (thảm/chiếu) không tính chồng lấn

// Nửa-kích-thước AABB (X,Z) của footprint sau khi xoay quanh Y. Tường song song
// trục nên AABB này là CHÍNH XÁC cho kẹp tường.
export function rotatedHalfExtents(footprint, scale, angleY) {
  const hx = (footprint.x * scale.x) / 2
  const hz = (footprint.z * scale.z) / 2
  const c = Math.abs(Math.cos(angleY))
  const s = Math.abs(Math.sin(angleY))
  return { hx: hx * c + hz * s, hz: hx * s + hz * c }
}

// Hình chữ nhật có hướng (OBB) trên mặt bằng cho một item.
export function itemRect(item) {
  return {
    cx: item.position.x,
    cz: item.position.z,
    hx: (item.footprint.x * item.scale.x) / 2,
    hz: (item.footprint.z * item.scale.z) / 2,
    angle: item.rotation.y,
  }
}

function corners(r) {
  const c = Math.cos(r.angle)
  const s = Math.sin(r.angle)
  const ax = { x: c, z: s }     // trục +x cục bộ trong world
  const az = { x: -s, z: c }    // trục +z cục bộ trong world
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sz]) => ({
    x: r.cx + ax.x * r.hx * sx + az.x * r.hz * sz,
    z: r.cz + ax.z * r.hx * sx + az.z * r.hz * sz,
  }))
}

function project(pts, axis) {
  let min = Infinity
  let max = -Infinity
  for (const p of pts) {
    const d = p.x * axis.x + p.z * axis.z
    if (d < min) min = d
    if (d > max) max = d
  }
  return { min, max }
}

// SAT cho hai OBB 2D. Chạm mép (khe ~0) KHÔNG tính là chồng.
export function overlaps(a, b) {
  const ca = corners(a)
  const cb = corners(b)
  const axes = [
    { x: Math.cos(a.angle), z: Math.sin(a.angle) },
    { x: -Math.sin(a.angle), z: Math.cos(a.angle) },
    { x: Math.cos(b.angle), z: Math.sin(b.angle) },
    { x: -Math.sin(b.angle), z: Math.cos(b.angle) },
  ]
  for (const axis of axes) {
    const pa = project(ca, axis)
    const pb = project(cb, axis)
    if (pa.max <= pb.min + EPS || pb.max <= pa.min + EPS) return false
  }
  return true
}

// Tập localId đè ít nhất một món khác. Món phẳng (thảm) bị loại.
export function findOverlaps(items) {
  const solid = (items ?? []).filter((it) => it.footprint.y * it.scale.y >= FLAT_THRESHOLD)
  const rects = solid.map((it) => ({ localId: it.localId, rect: itemRect(it) }))
  const conflict = new Set()
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlaps(rects[i].rect, rects[j].rect)) {
        conflict.add(rects[i].localId)
        conflict.add(rects[j].localId)
      }
    }
  }
  return conflict
}

// Kẹp tâm để footprint (đã xoay) nằm gọn trong phòng. Món to hơn phòng trên một
// trục → về giữa (0) trục đó.
export function clampRectToRoom(position, room, halfExtents) {
  const limX = room.width / 2 - halfExtents.hx
  const limZ = room.depth / 2 - halfExtents.hz
  return {
    x: limX <= 0 ? 0 : clamp(position.x, -limX, limX),
    y: position.y,
    z: limZ <= 0 ? 0 : clamp(position.z, -limZ, limZ),
  }
}
```

- [ ] **Step 4: Chạy test → XANH**

Run: `npm test -- --run src/features/roomPlanner/collision.test.js`
Expected: PASS (11 test).

- [ ] **Step 5: Checkpoint** — `npm run lint` xanh. (KHÔNG commit — guardrail.)

---

### Task 2: `editorStore` — footprint mặc định, `reportFootprint`, kẹp size-aware

**Files:**
- Modify: `src/features/roomPlanner/editorStore.js`
- Modify: `src/features/roomPlanner/mappers.js` (thêm `footprint` mặc định cho item load về)
- Test: `src/features/roomPlanner/editorStore.test.js` (bổ sung)

**Interfaces:**
- Consumes: `clampRectToRoom`, `rotatedHalfExtents` (Task 1).
- Produces:
  - Mọi item trong store có `footprint: { x, y, z }` (mặc định `{1,1,1}`).
  - `reportFootprint(localId, size)` — cập nhật footprint, KHÔNG vào history, KHÔNG set dirty, no-op nếu không đổi.
  - `updateTransform` / `duplicateSelected` kẹp theo kích thước (dùng `clampRectToRoom`).

- [ ] **Step 1: Viết test đỏ** (thêm vào `editorStore.test.js`)

```js
// --- footprint + reportFootprint ---
it('addVariant khởi tạo footprint mặc định {1,1,1}', () => {
  const s = freshStore() // helper hiện có trong file test; nếu chưa có, dùng useEditorStore.getState()
  s.getState().addVariant({ id: 1, model_3d_url: null })
  expect(s.getState().items[0].footprint).toEqual({ x: 1, y: 1, z: 1 })
})

it('reportFootprint cập nhật đúng item, KHÔNG đụng history/dirty', () => {
  const s = freshStore()
  s.getState().addVariant({ id: 1, model_3d_url: null })
  const id = s.getState().items[0].localId
  const pastBefore = s.getState().past.length
  s.setState({ dirty: false })
  s.getState().reportFootprint(id, { x: 2, y: 0.8, z: 1.5 })
  expect(s.getState().items[0].footprint).toEqual({ x: 2, y: 0.8, z: 1.5 })
  expect(s.getState().past.length).toBe(pastBefore) // history không đổi
  expect(s.getState().dirty).toBe(false)            // không bẩn hoá
})

it('reportFootprint no-op nếu size không đổi', () => {
  const s = freshStore()
  s.getState().addVariant({ id: 1, model_3d_url: null })
  const id = s.getState().items[0].localId
  s.getState().reportFootprint(id, { x: 1, y: 1, z: 1 }) // trùng mặc định
  const itemsRef = s.getState().items
  s.getState().reportFootprint(id, { x: 1, y: 1, z: 1 })
  expect(s.getState().items).toBe(itemsRef) // không tạo mảng mới
})

// --- kẹp size-aware ---
it('updateTransform kẹp theo kích thước — sofa to không xuyên tường', () => {
  const s = freshStore()
  s.setState({ room: { width: 4, depth: 4, height: 3 } })
  s.getState().addVariant({ id: 1, model_3d_url: null })
  const id = s.getState().items[0].localId
  s.getState().reportFootprint(id, { x: 2, y: 1, z: 1 }) // rộng 2m → nửa 1m
  s.getState().updateTransform(id, { position: { x: 10, y: 0, z: 0 } })
  expect(s.getState().items[0].position.x).toBeCloseTo(1) // 2 - 1
})
```

> Nếu file test chưa có helper `freshStore`, dùng trực tiếp: `import { useEditorStore } from './editorStore'`, `beforeEach(() => useEditorStore.getState().reset())`, và thay `s.getState()` bằng `useEditorStore.getState()`. Giữ đúng pattern các test hiện có trong file.

- [ ] **Step 2: Chạy test → ĐỎ**

Run: `npm test -- --run src/features/roomPlanner/editorStore.test.js`
Expected: FAIL ("reportFootprint is not a function", footprint undefined).

- [ ] **Step 3: Sửa `editorStore.js`**

Thêm import + hằng số (đầu file, cạnh `IDENTITY`):

```js
import { makeLocalId } from './threeD'
import { clampRectToRoom, rotatedHalfExtents } from './collision'

const DEFAULT_FOOTPRINT = { x: 1, y: 1, z: 1 }
```

> Lưu ý: BỎ `clampToRoom` khỏi import nếu không còn dùng chỗ nào khác trong file (lint sẽ báo unused). KHÔNG thêm `footprint` vào `IDENTITY` (vì `resetSelectedTransform` spread IDENTITY — sẽ xoá footprint đã đo).

`addVariant` — gắn footprint mặc định:

```js
addVariant: (variant) => set((s) => {
  const item = { localId: makeLocalId(), variant, footprint: { ...DEFAULT_FOOTPRINT }, ...structuredClone(IDENTITY) }
  return { ...pushPast(s), items: [...s.items, item], selectedId: item.localId, dirty: true }
}),
```

`reportFootprint` — action mới (đặt cạnh `toggleSnap`):

```js
reportFootprint: (localId, size) => set((s) => {
  const idx = s.items.findIndex((it) => it.localId === localId)
  if (idx === -1) return {}
  const cur = s.items[idx].footprint
  const near = (a, b) => Math.abs(a - b) < 1e-4
  if (near(cur.x, size.x) && near(cur.y, size.y) && near(cur.z, size.z)) return {} // no-op, không re-render
  const items = s.items.slice()
  items[idx] = { ...items[idx], footprint: { x: size.x, y: size.y, z: size.z } }
  return { items } // KHÔNG pushPast, KHÔNG dirty
}),
```

`duplicateSelected` — kẹp size-aware:

```js
duplicateSelected: () => set((s) => {
  if (s.selectedId === null) return {}
  const src = s.items.find((it) => it.localId === s.selectedId)
  if (!src) return {}
  const he = rotatedHalfExtents(src.footprint, src.scale, src.rotation.y)
  const clone = {
    ...structuredClone(src),
    localId: makeLocalId(),
    position: clampRectToRoom({ x: src.position.x + 0.3, y: src.position.y, z: src.position.z + 0.3 }, s.room, he),
  }
  return { ...pushPast(s), items: [...s.items, clone], selectedId: clone.localId, dirty: true }
}),
```

`updateTransform` — áp rotation/scale trước, rồi kẹp position theo kích thước mới:

```js
updateTransform: (localId, patch) => set((s) => ({
  ...pushPast(s),
  dirty: true,
  items: s.items.map((it) => {
    if (it.localId !== localId) return it
    const next = { ...it }
    if ('rotation' in patch) next.rotation = { ...patch.rotation }
    if ('scale' in patch) next.scale = { ...patch.scale }
    if ('position' in patch) {
      const he = rotatedHalfExtents(next.footprint, next.scale, next.rotation.y)
      next.position = clampRectToRoom(patch.position, s.room, he)
    }
    return next
  }),
})),
```

Sửa `mappers.js` — thêm `footprint` mặc định cho item load về (trong object tại `sceneToEditorState`, cạnh `scale`):

```js
      position: vec3(item.position, 0),
      rotation: vec3(item.rotation, 0),
      scale: vec3(item.scale, 1),
      footprint: { x: 1, y: 1, z: 1 }, // đo lại từ GLB khi render
```

- [ ] **Step 4: Chạy test → XANH**

Run: `npm test -- --run src/features/roomPlanner/editorStore.test.js`
Expected: PASS (các test cũ + mới).

- [ ] **Step 5: Checkpoint** — `npm run lint` xanh (đặc biệt kiểm import `clampToRoom` unused). KHÔNG commit.

---

### Task 3: Đo footprint từ GLB — `FurnitureModel.onMeasure` → `reportFootprint`

**Files:**
- Modify: `src/pages/roomPlanner/scene/FurnitureModel.jsx`
- Modify: `src/pages/roomPlanner/scene/PlacedItem.jsx`
- Modify: `src/pages/roomPlanner/scene/RoomCanvas.jsx`
- Test: `src/pages/roomPlanner/scene/PlacedItem.test.jsx` (tạo nếu chưa có) hoặc bổ sung `SceneStage.test.jsx`

**Interfaces:**
- Consumes: `reportFootprint` (Task 2).
- Produces: `FurnitureModel` nhận prop `onMeasure(size)`; `PlacedItem` nhận prop `onMeasure`; `RoomCanvas` bind `onMeasure={(size) => reportFootprint(item.localId, size)}`.

- [ ] **Step 1: Viết test đỏ** — `src/pages/roomPlanner/scene/PlacedItem.test.jsx`

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { PlacedItem } from './PlacedItem'

// Mock R3F: <Canvas> children bỏ qua; các primitive render như div rỗng.
vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => children }))
// FurnitureModel gọi onMeasure ngay khi mount (giả lập model đã đo).
vi.mock('./FurnitureModel', () => ({
  FurnitureModel: ({ onMeasure }) => { onMeasure?.({ x: 2, y: 1, z: 1.5 }); return null },
  PlaceholderBox: () => null,
  ModelErrorBoundary: ({ children }) => children,
}))

const baseItem = {
  localId: 7,
  variant: { model_3d_url: 'sofa.glb' },
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  footprint: { x: 1, y: 1, z: 1 },
}

describe('PlacedItem đo footprint', () => {
  it('chuyển size từ FurnitureModel ra onMeasure', () => {
    const onMeasure = vi.fn()
    render(
      <PlacedItem item={baseItem} selected={false} gizmoMode="translate" snap={false} conflict={false}
        onSelect={() => {}} onTransform={() => {}} onDragChange={() => {}} onMeasure={onMeasure} />,
    )
    expect(onMeasure).toHaveBeenCalledWith({ x: 2, y: 1, z: 1.5 })
  })
})
```

- [ ] **Step 2: Chạy test → ĐỎ**

Run: `npm test -- --run src/pages/roomPlanner/scene/PlacedItem.test.jsx`
Expected: FAIL (`onMeasure` chưa được truyền/gọi).

- [ ] **Step 3: Sửa 3 file**

`FurnitureModel.jsx` — đo size + bắn `onMeasure` một lần:

```jsx
import { Component, useEffect, useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { baseOffset } from '../../../features/roomPlanner/threeD'

export function FurnitureModel({ url, onMeasure }) {
  const { scene } = useGLTF(url)
  const measured = useMemo(() => {
    const clone = cloneSkinned(scene)
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    clone.position.y += baseOffset(box)
    return { clone, size: { x: size.x, y: size.y, z: size.z } }
  }, [scene])

  // Đẩy kích thước thật lên store một lần khi model sẵn sàng. reportFootprint
  // đã no-op nếu size trùng, nên gọi lại (khi onMeasure đổi định danh) vô hại.
  useEffect(() => {
    onMeasure?.(measured.size)
  }, [measured, onMeasure])

  return <primitive object={measured.clone} />
}
```

(giữ nguyên `PlaceholderBox` và `ModelErrorBoundary` phía dưới file.)

`PlacedItem.jsx` — nhận `onMeasure` + `conflict` (marker để Task 4), truyền `onMeasure` cho model:

```jsx
export function PlacedItem({ item, selected, gizmoMode, snap, conflict, onSelect, onTransform, onDragChange, onMeasure }) {
```

Trong `content`, đổi nhánh model:

```jsx
        <ModelErrorBoundary>
          <Suspense fallback={<PlaceholderBox />}>
            {item.variant.model_3d_url
              ? <FurnitureModel url={item.variant.model_3d_url} onMeasure={onMeasure} />
              : <PlaceholderBox />}
          </Suspense>
        </ModelErrorBoundary>
```

(Cờ `conflict` sẽ được dùng ở Task 4 — chưa render marker trong task này; prop được khai báo để tránh sửa chữ ký hai lần.)

`RoomCanvas.jsx` — bind `reportFootprint` cho từng item:

```jsx
  const reportFootprint = useEditorStore((s) => s.reportFootprint)
  // ... trong map:
        <PlacedItem
          key={item.localId}
          item={item}
          selected={item.localId === selectedId}
          gizmoMode={gizmoMode}
          snap={snap}
          onSelect={selectItem}
          onTransform={updateTransform}
          onDragChange={(dragging) => setOrbitEnabled(!dragging)}
          onMeasure={(size) => reportFootprint(item.localId, size)}
        />
```

- [ ] **Step 4: Chạy test → XANH**

Run: `npm test -- --run src/pages/roomPlanner/scene/PlacedItem.test.jsx`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — `npm run lint` + `npm test -- --run` xanh. KHÔNG commit.

---

### Task 4: Tín hiệu chồng lấn — marker 3D + notice panel

**Files:**
- Modify: `src/pages/roomPlanner/scene/RoomCanvas.jsx` (tính `conflictSet`, truyền `conflict`)
- Modify: `src/pages/roomPlanner/scene/PlacedItem.jsx` (render marker footprint khi `conflict`)
- Create: `src/pages/roomPlanner/OverlapNotice.jsx` (dòng nhắc điềm tĩnh)
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx` (đặt `<OverlapNotice>` trong aside, gần `<RoomSummary>`)
- Test: `src/pages/roomPlanner/OverlapNotice.test.jsx` (tạo); bổ sung `RoomCanvas` conflict wiring nếu có test file
- Sau khi xong UI: chạy skill **nestify-review** để chốt hex marker.

**Interfaces:**
- Consumes: `findOverlaps` (Task 1), `conflict` prop (Task 3).
- Produces: `OverlapNotice({ items })` → dòng chữ khi có chồng lấn, `null` khi không.

- [ ] **Step 1: Viết test đỏ** — `src/pages/roomPlanner/OverlapNotice.test.jsx`

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OverlapNotice } from './OverlapNotice'

const solid = (localId, x) => ({
  localId, position: { x, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 }, footprint: { x: 2, y: 1, z: 1 },
})

describe('OverlapNotice', () => {
  it('không có chồng lấn → không hiện gì', () => {
    const { container } = render(<OverlapNotice items={[solid(1, 0), solid(2, 9)]} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('có chồng lấn → hiện nhắc điềm tĩnh', () => {
    render(<OverlapNotice items={[solid(1, 0), solid(2, 1)]} />)
    expect(screen.getByText(/chồng lên nhau/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Chạy test → ĐỎ**

Run: `npm test -- --run src/pages/roomPlanner/OverlapNotice.test.jsx`
Expected: FAIL (chưa có file/thành phần).

- [ ] **Step 3: Tạo `OverlapNotice.jsx` + render marker + wiring**

`OverlapNotice.jsx` — giọng nhắc nhẹ, KHÔNG báo động, dùng semantic token:

```jsx
import { AlertCircle } from 'lucide-react'
import { findOverlaps } from '../../features/roomPlanner/collision'

// Nhắc điềm tĩnh khi có món chồng nhau — KHÔNG chặn thao tác (undo/kéo-lại vốn rẻ).
export function OverlapNotice({ items }) {
  const count = findOverlaps(items).size
  if (count === 0) return null
  return (
    <div className="flex items-start gap-2 rounded-control border border-border bg-surface-alt px-3 py-2 text-sm text-muted-foreground">
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{count} món đang chồng lên nhau. Kéo tách ra để phòng dễ hình dung hơn.</span>
    </div>
  )
}
```

`PlacedItem.jsx` — thêm ô footprint mờ trên sàn khi `conflict` (đặt trong `content`, ngay dưới `<ModelErrorBoundary>…`):

```jsx
      {conflict && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[item.footprint.x, item.footprint.z]} />
          {/* `ink` #26262B mờ — nhắc trung tính, KHÔNG đỏ báo động. Chốt qua nestify-review. */}
          <meshBasicMaterial color="#26262B" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}
```

`RoomCanvas.jsx` — tính `conflictSet` (useMemo theo items) + truyền `conflict`:

```jsx
import { useMemo, useState } from 'react'
import { findOverlaps } from '../../../features/roomPlanner/collision'
// ...
  const conflictSet = useMemo(() => findOverlaps(items), [items])
// ... trong <PlacedItem ... >
          conflict={conflictSet.has(item.localId)}
```

`RoomPlannerPage.jsx` — đặt notice trong aside, ngay trên hoặc dưới `<RoomSummary items={store.items} />`:

```jsx
            <OverlapNotice items={store.items} />
            <RoomSummary items={store.items} />
```

Thêm import ở đầu `RoomPlannerPage.jsx`:

```jsx
import { OverlapNotice } from './OverlapNotice'
```

- [ ] **Step 4: Chạy test → XANH**

Run: `npm test -- --run src/pages/roomPlanner/OverlapNotice.test.jsx`
Expected: PASS.

- [ ] **Step 5: nestify-review** — chạy skill `nestify-review` trên `OverlapNotice.jsx`, `PlacedItem.jsx` (marker), `RoomPlannerPage.jsx`. Xác nhận: không đỏ/terracotta/cream, không `imagined`/`confirmed` sai chỗ, giọng nhắc "warm guide". Điều chỉnh hex marker theo kết luận review.

- [ ] **Step 6: Checkpoint cuối** — `npm run lint` + `npm test -- --run` XANH toàn bộ. KHÔNG commit (chờ user).

---

## Self-Review (đã soát)

- **Spec coverage:** §4 footprint→store = Task 2+3; §5 collision.js = Task 1; §6 cảnh báo = Task 4; §7 kẹp tường = Task 2 (updateTransform/duplicate) + Task 1 (clampRectToRoom); §8 test rải khắp Task 1–4. Đủ.
- **Placeholder scan:** không có TBD; hex marker có giá trị cụ thể (#26262B) + cờ nestify-review (quyết định đúng thời điểm, không phải lỗ hổng).
- **Type consistency:** item shape `{position,rotation,scale,footprint}` nhất quán mọi task; `reportFootprint(localId, size)`, `clampRectToRoom(position, room, halfExtents)`, `rotatedHalfExtents(footprint, scale, angleY)` tên/tham số khớp giữa Task 1↔2↔3↔4.
- **Guardrail:** mọi bước "Checkpoint" thay cho "Commit" — không commit tới khi user cho phép.
