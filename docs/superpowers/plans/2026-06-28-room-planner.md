# 3D Room Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a logged-in, full-screen 3D room planner where a user defines a room, drops in catalog furniture that has a `.glb` model, transforms it with a gizmo, and saves the scene — consuming the already-built backend room-scene API.

**Architecture:** New feature folder `src/features/roomPlanner/` (api + query hooks + a Zustand editor store + pure mapper/geometry helpers) and page tree `src/pages/roomPlanner/` (route entry + UI chrome + a `scene/` subtree of React-Three-Fiber components). The planner is a standalone full-screen route (no storefront `Layout`) behind `ProtectedRoute`, lazy-loaded so the three.js bundle never touches the main chunk.

**Tech Stack:** React 18, `three` + `@react-three/fiber` v8 + `@react-three/drei` v9, Zustand v4, TanStack Query v5, React Hook Form + Yup, Tailwind v4 tokens, Vitest + React Testing Library.

## Global Constraints

- **React 18 only** — install `@react-three/fiber@8` and `@react-three/drei@9`. Fiber v9 / drei v10 require React 19 and MUST NOT be used. Pin: `three@0.169.0`, `@react-three/fiber@8.17.10`, `@react-three/drei@9.114.0`.
- **Never change design tokens** (`src/styles/tokens.css` is shared with the storefront). Reuse existing primitives (`Modal`, `Input`, `Button`, `SearchInput`, `EmptyState`, `Spinner`, `useToastStore`).
- **Units are metres** (glTF convention). Default room **4.0 × 5.0 × 2.8 m**.
- **Room is centred at the origin**: the floor spans `[-width/2, width/2]` (X) × `[-depth/2, depth/2]` (Z), `y=0` is the floor.
- **BE update replaces all items**: `PATCH /room-scenes/{id}` with `items` deletes and recreates them. The FE always sends the full item array.
- `apiClient.get/post/patch` return the **response body** directly (axios interceptor unwraps `response.data`). All endpoints are relative to `VITE_API_BASE_URL` (which already includes `/api`).
- **All UI copy in Vietnamese.**
- **Tests never render real WebGL.** Pure logic is unit-tested directly; components that mount `<Canvas>` are tested with the canvas module mocked.
- **Do NOT commit until the user explicitly authorises.** The final step of each task is `git add` (stage only). Replace the listed `git commit` with staging unless/until the user says commits are allowed.
- BE item resource (`RoomSceneItemResource`) only returns `variant.{id,sku,model_3d_url}` — **not** name/price/thumbnail. On load, fall back to `sku` for display names.

---

### Task 1: Pure helpers — mappers, geometry, placeable list

**Files:**
- Create: `src/features/roomPlanner/threeD.js`
- Create: `src/features/roomPlanner/mappers.js`
- Create: `src/features/roomPlanner/placeable.js`
- Test: `src/features/roomPlanner/threeD.test.js`
- Test: `src/features/roomPlanner/mappers.test.js`
- Test: `src/features/roomPlanner/placeable.test.js`

**Interfaces:**
- Produces:
  - `makeLocalId(): number` — monotonic client id for placed items.
  - `clamp(v, min, max): number`
  - `snapToFloor(position, restingHeight): {x,y,z}` — returns position with `y = restingHeight`.
  - `clampToRoom(position, room): {x,y,z}` — clamps x/z into the room footprint, keeps y.
  - `sceneToEditorState(resource): { id, name, description, room:{width,depth,height}, items:[...] }`
  - `editorStateToPayload(state): { name, description, width, depth, height, items:[{variant_id, position, rotation, scale}] }`
  - `toPlaceableItems(products): Array<{ product:{id,name,thumbnail}, variant:{id,sku,name,model_3d_url,price,thumbnail} }>`
  - Editor item shape: `{ localId, variant:{id,sku,name,model_3d_url,price,thumbnail}, position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z} }`

- [ ] **Step 1: Write the failing tests**

`src/features/roomPlanner/threeD.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { makeLocalId, clamp, snapToFloor, clampToRoom } from './threeD'

describe('roomPlanner/threeD', () => {
  it('makeLocalId returns increasing unique ids', () => {
    const a = makeLocalId()
    const b = makeLocalId()
    expect(b).toBeGreaterThan(a)
  })

  it('clamp bounds a value', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })

  it('snapToFloor sets y to the resting height', () => {
    expect(snapToFloor({ x: 1, y: 9, z: 2 }, 0.5)).toEqual({ x: 1, y: 0.5, z: 2 })
  })

  it('clampToRoom keeps the centre inside the footprint and preserves y', () => {
    const room = { width: 4, depth: 6, height: 2.8 }
    expect(clampToRoom({ x: 10, y: 0.5, z: -10 }, room)).toEqual({ x: 2, y: 0.5, z: -3 })
    expect(clampToRoom({ x: 1, y: 0.5, z: 1 }, room)).toEqual({ x: 1, y: 0.5, z: 1 })
  })
})
```

`src/features/roomPlanner/mappers.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { sceneToEditorState, editorStateToPayload } from './mappers'

const resource = {
  id: 7,
  name: 'Phòng khách',
  description: 'Bản nháp',
  width: '4.00',
  depth: '5.00',
  height: '2.80',
  items: [
    {
      id: 1,
      variant: { id: 12, sku: 'SOFA-RED', model_3d_url: 'https://x/m.glb' },
      position: { x: '1.0000', y: '0.0000', z: '2.0000' },
      rotation: { x: '0', y: '1.57', z: '0' },
      scale: { x: '1', y: '1', z: '1' },
    },
  ],
}

describe('roomPlanner/mappers', () => {
  it('sceneToEditorState parses numbers and falls back name to sku', () => {
    const state = sceneToEditorState(resource)
    expect(state.id).toBe(7)
    expect(state.room).toEqual({ width: 4, depth: 5, height: 2.8 })
    expect(state.items).toHaveLength(1)
    const item = state.items[0]
    expect(item.variant).toMatchObject({ id: 12, sku: 'SOFA-RED', name: 'SOFA-RED', model_3d_url: 'https://x/m.glb' })
    expect(item.position).toEqual({ x: 1, y: 0, z: 2 })
    expect(item.rotation).toEqual({ x: 0, y: 1.57, z: 0 })
    expect(typeof item.localId).toBe('number')
  })

  it('editorStateToPayload emits the BE item shape', () => {
    const state = sceneToEditorState(resource)
    const payload = editorStateToPayload(state)
    expect(payload).toEqual({
      name: 'Phòng khách',
      description: 'Bản nháp',
      width: 4,
      depth: 5,
      height: 2.8,
      items: [
        {
          variant_id: 12,
          position: { x: 1, y: 0, z: 2 },
          rotation: { x: 0, y: 1.57, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      ],
    })
  })

  it('sceneToEditorState tolerates a null/empty resource', () => {
    const state = sceneToEditorState(null)
    expect(state.id).toBeNull()
    expect(state.items).toEqual([])
  })
})
```

`src/features/roomPlanner/placeable.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { toPlaceableItems } from './placeable'

describe('roomPlanner/placeable', () => {
  it('keeps only variants that have a 3D model and carries the product thumbnail', () => {
    const products = [
      {
        id: 1, name: 'Sofa', thumbnail: 'thumb.jpg',
        variants: [
          { id: 11, sku: 'A', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 },
          { id: 12, sku: 'B', name: 'Xanh', model_3d_url: null, price: 120 },
        ],
      },
      { id: 2, name: 'Bàn', thumbnail: null, variants: [{ id: 21, sku: 'C', model_3d_url: '', price: 50 }] },
    ]
    const out = toPlaceableItems(products)
    expect(out).toHaveLength(1)
    expect(out[0].variant).toMatchObject({ id: 11, model_3d_url: 'a.glb', thumbnail: 'thumb.jpg' })
    expect(out[0].product).toEqual({ id: 1, name: 'Sofa', thumbnail: 'thumb.jpg' })
  })

  it('handles missing products/variants', () => {
    expect(toPlaceableItems(undefined)).toEqual([])
    expect(toPlaceableItems([{ id: 1, name: 'X' }])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/roomPlanner/threeD.test.js src/features/roomPlanner/mappers.test.js src/features/roomPlanner/placeable.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the helpers**

`src/features/roomPlanner/threeD.js`:
```js
let seq = 0

// Monotonic client-only id for placed items (BE assigns real ids on save).
export function makeLocalId() {
  seq += 1
  return seq
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// Lay an item on the floor: its origin rises to `restingHeight` (half its
// world-space height, computed from the model's bounding box at placement time).
export function snapToFloor(position, restingHeight) {
  return { x: position.x, y: restingHeight, z: position.z }
}

// Keep an item's centre inside the room footprint (room is centred at origin).
export function clampToRoom(position, room) {
  const halfW = room.width / 2
  const halfD = room.depth / 2
  return {
    x: clamp(position.x, -halfW, halfW),
    y: position.y,
    z: clamp(position.z, -halfD, halfD),
  }
}
```

`src/features/roomPlanner/mappers.js`:
```js
import { makeLocalId } from './threeD'

const num = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const vec3 = (source, fallback) => ({
  x: num(source?.x, fallback),
  y: num(source?.y, fallback),
  z: num(source?.z, fallback),
})

// GET /room-scenes/:id resource → editor state.
export function sceneToEditorState(resource) {
  const r = resource ?? {}
  return {
    id: r.id ?? null,
    name: r.name ?? 'Phòng của tôi',
    description: r.description ?? '',
    room: {
      width: num(r.width),
      depth: num(r.depth),
      height: num(r.height),
    },
    items: (r.items ?? []).map((item) => ({
      localId: makeLocalId(),
      variant: {
        id: item.variant?.id,
        sku: item.variant?.sku ?? '',
        // RoomSceneItemResource omits name/price/thumbnail — fall back to sku.
        name: item.variant?.name ?? item.variant?.sku ?? '',
        model_3d_url: item.variant?.model_3d_url ?? null,
        price: item.variant?.price ?? null,
        thumbnail: item.variant?.thumbnail ?? null,
      },
      position: vec3(item.position, 0),
      rotation: vec3(item.rotation, 0),
      scale: vec3(item.scale, 1),
    })),
  }
}

// Editor state → POST/PATCH /room-scenes payload.
export function editorStateToPayload(state) {
  return {
    name: state.name,
    description: state.description ?? '',
    width: state.room.width,
    depth: state.room.depth,
    height: state.room.height,
    items: state.items.map((item) => ({
      variant_id: item.variant.id,
      position: { ...item.position },
      rotation: { ...item.rotation },
      scale: { ...item.scale },
    })),
  }
}
```

`src/features/roomPlanner/placeable.js`:
```js
// Flatten product pages into a list of placeable {product, variant} entries,
// keeping only variants that actually have a 3D model. The product thumbnail
// is carried onto the variant for the tray (variants have no image of their own).
export function toPlaceableItems(products) {
  const out = []
  for (const product of products ?? []) {
    for (const variant of product.variants ?? []) {
      if (!variant.model_3d_url) continue
      out.push({
        product: { id: product.id, name: product.name, thumbnail: product.thumbnail ?? null },
        variant: {
          id: variant.id,
          sku: variant.sku,
          name: variant.name ?? variant.sku,
          model_3d_url: variant.model_3d_url,
          price: variant.price ?? null,
          thumbnail: product.thumbnail ?? null,
        },
      })
    }
  }
  return out
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/roomPlanner/threeD.test.js src/features/roomPlanner/mappers.test.js src/features/roomPlanner/placeable.test.js`
Expected: PASS (3 files).

- [ ] **Step 5: Stage (commit only when authorised)**

```bash
git add src/features/roomPlanner/threeD.js src/features/roomPlanner/mappers.js src/features/roomPlanner/placeable.js \
        src/features/roomPlanner/threeD.test.js src/features/roomPlanner/mappers.test.js src/features/roomPlanner/placeable.test.js
# git commit -m "feat(room-planner): pure mappers + geometry helpers"  # only when user authorises commits
```

---

### Task 2: Editor store (Zustand)

**Files:**
- Create: `src/features/roomPlanner/editorStore.js`
- Test: `src/features/roomPlanner/editorStore.test.js`

**Interfaces:**
- Consumes: `sceneToEditorState` (Task 1), `makeLocalId`, `clampToRoom` (Task 1).
- Produces: `useEditorStore` (Zustand hook) with state `{ id, name, description, room, items, selectedId, gizmoMode, dirty, status }` and actions:
  - `initNew(room): void` — fresh scene with given dimensions, `status:'ready'`.
  - `loadScene(resource): void` — hydrate from a BE resource, `dirty:false`, `status:'ready'`.
  - `setName(name)`, `setRoom(room)`
  - `addVariant(variant): void` — append item at origin, select it, `dirty:true`.
  - `selectItem(localId|null)`, `setGizmoMode('translate'|'rotate'|'scale')`
  - `updateTransform(localId, { position?, rotation?, scale? }): void` — merge, clamp position to room, `dirty:true`.
  - `deleteSelected(): void`, `resetSelectedTransform(): void`
  - `markSaved(id): void` — set id, `dirty:false`.
  - `reset(): void` — back to empty `status:'idle'` (call on unmount/route change).

- [ ] **Step 1: Write the failing test**

`src/features/roomPlanner/editorStore.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from './editorStore'

const variant = { id: 12, sku: 'SOFA-RED', name: 'Đỏ', model_3d_url: 'a.glb', price: 100, thumbnail: null }

describe('roomPlanner/editorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
  })

  it('initNew sets the room and becomes ready', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    const s = useEditorStore.getState()
    expect(s.room).toEqual({ width: 4, depth: 5, height: 2.8 })
    expect(s.status).toBe('ready')
    expect(s.dirty).toBe(false)
  })

  it('addVariant appends, selects, and marks dirty', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const s = useEditorStore.getState()
    expect(s.items).toHaveLength(1)
    expect(s.items[0].position).toEqual({ x: 0, y: 0, z: 0 })
    expect(s.selectedId).toBe(s.items[0].localId)
    expect(s.dirty).toBe(true)
  })

  it('updateTransform clamps position into the room', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    useEditorStore.getState().updateTransform(id, { position: { x: 99, y: 0.5, z: -99 } })
    expect(useEditorStore.getState().items[0].position).toEqual({ x: 2, y: 0.5, z: -2 })
  })

  it('deleteSelected removes the selected item', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    useEditorStore.getState().deleteSelected()
    expect(useEditorStore.getState().items).toHaveLength(0)
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('resetSelectedTransform restores identity transform', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    useEditorStore.getState().updateTransform(id, { rotation: { x: 0, y: 1, z: 0 } })
    useEditorStore.getState().resetSelectedTransform()
    expect(useEditorStore.getState().items[0].rotation).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('markSaved sets id and clears dirty', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    useEditorStore.getState().markSaved(42)
    expect(useEditorStore.getState().id).toBe(42)
    expect(useEditorStore.getState().dirty).toBe(false)
  })

  it('loadScene hydrates from a BE resource', () => {
    useEditorStore.getState().loadScene({
      id: 9, name: 'P', width: '3', depth: '3', height: '2.5',
      items: [{ id: 1, variant: { id: 5, sku: 'X', model_3d_url: 'x.glb' }, position: { x: '1', y: '0', z: '0' } }],
    })
    const s = useEditorStore.getState()
    expect(s.id).toBe(9)
    expect(s.items).toHaveLength(1)
    expect(s.dirty).toBe(false)
    expect(s.status).toBe('ready')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/roomPlanner/editorStore.test.js`
Expected: FAIL — `editorStore` not found.

- [ ] **Step 3: Implement the store**

`src/features/roomPlanner/editorStore.js`:
```js
import { create } from 'zustand'
import { sceneToEditorState } from './mappers'
import { makeLocalId, clampToRoom } from './threeD'

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
}

const emptyState = {
  id: null,
  name: 'Phòng của tôi',
  description: '',
  room: { width: 0, depth: 0, height: 0 },
  items: [],
  selectedId: null,
  gizmoMode: 'translate',
  dirty: false,
  status: 'idle', // 'idle' | 'ready'
}

export const useEditorStore = create((set, get) => ({
  ...emptyState,

  reset: () => set({ ...emptyState }),

  initNew: (room) => set({ ...emptyState, room, status: 'ready' }),

  loadScene: (resource) => set({ ...sceneToEditorState(resource), selectedId: null, gizmoMode: 'translate', dirty: false, status: 'ready' }),

  setName: (name) => set({ name, dirty: true }),

  setRoom: (room) => set({ room, dirty: true }),

  addVariant: (variant) => set((s) => {
    const item = { localId: makeLocalId(), variant, ...structuredClone(IDENTITY) }
    return { items: [...s.items, item], selectedId: item.localId, dirty: true }
  }),

  selectItem: (localId) => set({ selectedId: localId }),

  setGizmoMode: (gizmoMode) => set({ gizmoMode }),

  updateTransform: (localId, patch) => set((s) => ({
    dirty: true,
    items: s.items.map((it) => {
      if (it.localId !== localId) return it
      const next = { ...it }
      if (patch.position) next.position = clampToRoom(patch.position, s.room)
      if (patch.rotation) next.rotation = { ...patch.rotation }
      if (patch.scale) next.scale = { ...patch.scale }
      return next
    }),
  })),

  deleteSelected: () => set((s) => ({
    items: s.items.filter((it) => it.localId !== s.selectedId),
    selectedId: null,
    dirty: true,
  })),

  resetSelectedTransform: () => set((s) => ({
    dirty: true,
    items: s.items.map((it) => (it.localId === s.selectedId ? { ...it, ...structuredClone(IDENTITY) } : it)),
  })),

  markSaved: (id) => set({ id, dirty: false }),
}))
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/roomPlanner/editorStore.test.js`
Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/features/roomPlanner/editorStore.js src/features/roomPlanner/editorStore.test.js
```

---

### Task 3: Data layer — room-scene api/hooks + catalog search param

**Files:**
- Create: `src/features/roomPlanner/api.js`
- Create: `src/features/roomPlanner/hooks.js`
- Modify: `src/features/catalog/api.js` (add `search` → `filter[search]`)
- Test: `src/features/roomPlanner/api.test.js`

**Interfaces:**
- Produces:
  - `getScene(id)`, `createScene(payload)`, `updateScene(id, payload)` (api.js)
  - `useScene(id)`, `useCreateScene()`, `useUpdateScene()` (hooks.js)
  - `getProducts({ ..., search })` now forwards `filter[search]`.

- [ ] **Step 1: Write the failing test**

`src/features/roomPlanner/api.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../lib/apiClient'
import { getScene, createScene, updateScene } from './api'

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

describe('roomPlanner/api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getScene calls GET /room-scenes/:id', () => {
    getScene(7)
    expect(apiClient.get).toHaveBeenCalledWith('/room-scenes/7')
  })

  it('createScene posts the payload', () => {
    const payload = { name: 'P', width: 4, depth: 5, height: 2.8, items: [] }
    createScene(payload)
    expect(apiClient.post).toHaveBeenCalledWith('/room-scenes', payload)
  })

  it('updateScene patches /room-scenes/:id', () => {
    const payload = { name: 'P', items: [] }
    updateScene(9, payload)
    expect(apiClient.patch).toHaveBeenCalledWith('/room-scenes/9', payload)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/roomPlanner/api.test.js`
Expected: FAIL — `./api` not found.

- [ ] **Step 3: Implement api + hooks, extend catalog**

`src/features/roomPlanner/api.js`:
```js
import { apiClient } from '../../lib/apiClient'

export function getScene(id) {
  return apiClient.get(`/room-scenes/${id}`)
}

export function createScene(payload) {
  return apiClient.post('/room-scenes', payload)
}

export function updateScene(id, payload) {
  return apiClient.patch(`/room-scenes/${id}`, payload)
}
```

`src/features/roomPlanner/hooks.js`:
```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as roomPlannerApi from './api'

export function useScene(id) {
  return useQuery({
    queryKey: ['roomScene', id],
    queryFn: () => roomPlannerApi.getScene(id),
    enabled: !!id,
  })
}

export function useCreateScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => roomPlannerApi.createScene(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['roomScene', response.data.id], response)
    },
  })
}

export function useUpdateScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => roomPlannerApi.updateScene(id, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['roomScene', response.data.id], response)
    },
  })
}
```

In `src/features/catalog/api.js`, replace `getProducts` with the version that also forwards `search`:
```js
export function getProducts({ category, brand, sort, cursor, limit, search } = {}) {
  const params = {}
  if (category) params['filter[category]'] = category
  if (brand) params['filter[brand]'] = brand
  if (search) params['filter[search]'] = search
  if (sort) params.sort = sort
  if (cursor) params.cursor = cursor
  if (limit) params.limit = limit

  return apiClient.get('/products', { params })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/roomPlanner/api.test.js src/features/catalog`
Expected: PASS (new api test + existing catalog tests still green).

- [ ] **Step 5: Stage**

```bash
git add src/features/roomPlanner/api.js src/features/roomPlanner/hooks.js src/features/roomPlanner/api.test.js src/features/catalog/api.js
```

---

### Task 4: Install 3D deps + scene components

> No unit tests — these mount WebGL. Verified by `npm run build`. They read state from `useEditorStore` and render the room + models.

**Files:**
- Modify: `package.json` (deps via install command)
- Create: `src/pages/roomPlanner/scene/RoomCanvas.jsx`
- Create: `src/pages/roomPlanner/scene/Room.jsx`
- Create: `src/pages/roomPlanner/scene/FurnitureModel.jsx`
- Create: `src/pages/roomPlanner/scene/PlacedItem.jsx`

**Interfaces:**
- Consumes: `useEditorStore` (Task 2).
- Produces: `RoomCanvas` (default + named export) — the full `<Canvas>` subtree; mounted by `RoomPlannerPage` (Task 8).

- [ ] **Step 1: Install the pinned 3D stack**

Run:
```bash
npm install three@0.169.0 @react-three/fiber@8.17.10 @react-three/drei@9.114.0
```
Expected: added without peer-dependency errors against React 18.3.

- [ ] **Step 2: Implement `Room.jsx`**

`src/pages/roomPlanner/scene/Room.jsx`:
```jsx
// Floor + faint walls + grid, sized from room dimensions (metres). Centred at origin.
export function Room({ width, depth, height }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#F1ECE1" />
      </mesh>
      <gridHelper args={[Math.max(width, depth), Math.max(width, depth), '#D8CFBE', '#E8E1D2']} position={[0, 0.01, 0]} />
      {/* Back + side walls, low opacity so they never block the view. */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#FAF8F3" transparent opacity={0.18} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color="#FAF8F3" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Implement `FurnitureModel.jsx`**

`src/pages/roomPlanner/scene/FurnitureModel.jsx`:
```jsx
import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

// Loads a .glb and returns a fresh clone so repeated instances don't share nodes.
// Suspends while loading; an ErrorBoundary in PlacedItem renders the fallback box.
export function FurnitureModel({ url }) {
  const { scene } = useGLTF(url)
  const object = useMemo(() => cloneSkinned(scene), [scene])
  return <primitive object={object} />
}

export function PlaceholderBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#B08D57" transparent opacity={0.6} />
    </mesh>
  )
}
```

- [ ] **Step 4: Implement `PlacedItem.jsx`**

`src/pages/roomPlanner/scene/PlacedItem.jsx`:
```jsx
import { Component, Suspense, useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { FurnitureModel, PlaceholderBox } from './FurnitureModel'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Renders a placeholder if its child throws (e.g. a broken/missing .glb).
class ModelErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <PlaceholderBox /> : this.props.children
  }
}

export function PlacedItem({ item, selected, gizmoMode, onSelect, onTransform, onDragChange }) {
  const groupRef = useRef()
  const { position, rotation, scale } = item

  const commit = () => {
    const node = groupRef.current
    if (!node) return
    onTransform(item.localId, {
      position: { x: node.position.x, y: node.position.y, z: node.position.z },
      rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
      scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z },
    })
  }

  const content = (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(item.localId)
      }}
    >
      <ModelErrorBoundary>
        <Suspense fallback={<PlaceholderBox />}>
          {item.variant.model_3d_url ? <FurnitureModel url={item.variant.model_3d_url} /> : <PlaceholderBox />}
        </Suspense>
      </ModelErrorBoundary>
    </group>
  )

  if (!selected) return content

  return (
    <TransformControls
      object={groupRef}
      mode={gizmoMode}
      onMouseUp={commit}
      onObjectChange={commit}
      onDraggingChanged={(e) => onDragChange(Boolean(e?.value))}
    >
      {content}
    </TransformControls>
  )
}

// re-export to satisfy linting if store import is unused elsewhere
export { useEditorStore }
```

> Note: the `useEditorStore` re-export line above is intentional only if your lint config flags the import; otherwise drop the import. The page wires the callbacks (`onSelect`/`onTransform`/`onDragChange`) from the store in Task 8.

- [ ] **Step 5: Implement `RoomCanvas.jsx`**

`src/pages/roomPlanner/scene/RoomCanvas.jsx`:
```jsx
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Room } from './Room'
import { PlacedItem } from './PlacedItem'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

export function RoomCanvas() {
  const room = useEditorStore((s) => s.room)
  const items = useEditorStore((s) => s.items)
  const selectedId = useEditorStore((s) => s.selectedId)
  const gizmoMode = useEditorStore((s) => s.gizmoMode)
  const selectItem = useEditorStore((s) => s.selectItem)
  const updateTransform = useEditorStore((s) => s.updateTransform)
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  const camDistance = Math.max(room.width, room.depth, 4) * 1.4

  return (
    <Canvas shadows camera={{ position: [camDistance, camDistance, camDistance], fov: 45 }}>
      <hemisphereLight intensity={0.9} groundColor="#cfc6b5" />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <Room width={room.width} depth={room.depth} height={room.height} />
      {/* Click empty space → deselect. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={() => selectItem(null)} visible={false}>
        <planeGeometry args={[room.width, room.depth]} />
      </mesh>
      {items.map((item) => (
        <PlacedItem
          key={item.localId}
          item={item}
          selected={item.localId === selectedId}
          gizmoMode={gizmoMode}
          onSelect={selectItem}
          onTransform={updateTransform}
          onDragChange={(dragging) => setOrbitEnabled(!dragging)}
        />
      ))}
      <OrbitControls makeDefault enabled={orbitEnabled} target={[0, room.height / 4, 0]} />
    </Canvas>
  )
}

export default RoomCanvas
```

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds; the planner scene modules land in a lazy chunk (no errors about three/fiber/drei).

- [ ] **Step 7: Stage**

```bash
git add package.json package-lock.json src/pages/roomPlanner/scene/
```

---

### Task 5: RoomSetupDialog

**Files:**
- Create: `src/pages/roomPlanner/RoomSetupDialog.jsx`
- Test: `src/pages/roomPlanner/RoomSetupDialog.test.jsx`

**Interfaces:**
- Consumes: `Modal`, `Input`, `Button` primitives.
- Produces: `RoomSetupDialog({ open, onOpenChange, initialRoom, onSubmit })` — calls `onSubmit({ width, depth, height })` with positive metres.

- [ ] **Step 1: Write the failing test**

`src/pages/roomPlanner/RoomSetupDialog.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomSetupDialog } from './RoomSetupDialog'

describe('RoomSetupDialog', () => {
  it('submits positive dimensions', async () => {
    const onSubmit = vi.fn()
    render(<RoomSetupDialog open onOpenChange={() => {}} initialRoom={{ width: 4, depth: 5, height: 2.8 }} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /tạo phòng/i }))
    expect(onSubmit).toHaveBeenCalledWith({ width: 4, depth: 5, height: 2.8 })
  })

  it('rejects non-positive dimensions', async () => {
    const onSubmit = vi.fn()
    render(<RoomSetupDialog open onOpenChange={() => {}} initialRoom={{ width: 0, depth: 5, height: 2.8 }} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /tạo phòng/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/lớn hơn 0/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/RoomSetupDialog.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the dialog**

`src/pages/roomPlanner/RoomSetupDialog.jsx`:
```jsx
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

const FIELDS = [
  { key: 'width', label: 'Chiều rộng (m)' },
  { key: 'depth', label: 'Chiều sâu (m)' },
  { key: 'height', label: 'Chiều cao (m)' },
]

export function RoomSetupDialog({ open, onOpenChange, initialRoom, onSubmit }) {
  const [values, setValues] = useState(initialRoom)
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const parsed = {
      width: Number(values.width),
      depth: Number(values.depth),
      height: Number(values.height),
    }
    if (![parsed.width, parsed.depth, parsed.height].every((n) => Number.isFinite(n) && n > 0)) {
      setError('Kích thước phải lớn hơn 0.')
      return
    }
    onSubmit(parsed)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Kích thước phòng">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor={`room-${field.key}`}>
              {field.label}
              <Input
                id={`room-${field.key}`}
                type="number"
                step="0.1"
                min="0.1"
                value={values[field.key]}
                onChange={(event) => setValues((v) => ({ ...v, [field.key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit">Tạo phòng</Button>
        </div>
      </form>
    </Modal>
  )
}
```

> If `Modal`'s prop names differ (check `src/components/Modal.jsx`), adapt `open/onOpenChange/title` to match; the existing `AddressFormModal` is a working reference.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/RoomSetupDialog.test.jsx`
Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/pages/roomPlanner/RoomSetupDialog.jsx src/pages/roomPlanner/RoomSetupDialog.test.jsx
```

---

### Task 6: CatalogTray

**Files:**
- Create: `src/pages/roomPlanner/CatalogTray.jsx`
- Test: `src/pages/roomPlanner/CatalogTray.test.jsx`

**Interfaces:**
- Consumes: `useInfiniteProducts` (catalog hooks), `toPlaceableItems` (Task 1), `SearchInput`, `EmptyState`, `Spinner`.
- Produces: `CatalogTray({ onAdd })` — renders placeable variants; clicking one calls `onAdd(variant)`.

- [ ] **Step 1: Write the failing test**

`src/pages/roomPlanner/CatalogTray.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CatalogTray } from './CatalogTray'
import * as catalogApi from '../../features/catalog/api'

vi.mock('../../features/catalog/api')

function renderTray(onAdd = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CatalogTray onAdd={onAdd} />
    </QueryClientProvider>,
  )
  return onAdd
}

describe('CatalogTray', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogApi.getProducts.mockResolvedValue({
      data: [
        {
          id: 1, name: 'Sofa', thumbnail: null,
          variants: [
            { id: 11, sku: 'A', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 },
            { id: 12, sku: 'B', name: 'Xanh', model_3d_url: null, price: 120 },
          ],
        },
      ],
      meta: { pagination: { has_more: false, next_cursor: null } },
    })
  })

  it('lists only variants with a 3D model and adds on click', async () => {
    const onAdd = renderTray()
    const button = await screen.findByRole('button', { name: /Sofa.*Đỏ/s })
    expect(screen.queryByText('Xanh')).not.toBeInTheDocument()
    await userEvent.click(button)
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 11, model_3d_url: 'a.glb' }))
  })

  it('shows an empty state when no products have a 3D model', async () => {
    catalogApi.getProducts.mockResolvedValue({
      data: [{ id: 2, name: 'Bàn', variants: [{ id: 21, sku: 'C', model_3d_url: null }] }],
      meta: { pagination: { has_more: false, next_cursor: null } },
    })
    renderTray()
    expect(await screen.findByText(/chưa có sản phẩm.*3d/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/CatalogTray.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the tray**

`src/pages/roomPlanner/CatalogTray.jsx`:
```jsx
import { useMemo, useState } from 'react'
import { Box, Plus } from 'lucide-react'
import { useInfiniteProducts } from '../../features/catalog/hooks'
import { toPlaceableItems } from '../../features/roomPlanner/placeable'
import { SearchInput } from '../../components/SearchInput'
import { EmptyState } from '../../components/admin/EmptyState'
import { Spinner } from '../../components/Spinner'
import { formatCurrency } from '../../lib/format'

export function CatalogTray({ onAdd }) {
  const [search, setSearch] = useState('')
  const query = useInfiniteProducts({ search, limit: 24 })

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  )
  const placeable = useMemo(() => toPlaceableItems(products), [products])

  return (
    <div className="flex h-full flex-col gap-3">
      <SearchInput placeholder="Tìm nội thất 3D..." onDebouncedChange={setSearch} />
      {query.isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : placeable.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Chưa có sản phẩm 3D"
          description="Chưa có sản phẩm nào có mô hình 3D (.glb) để thêm vào phòng."
        />
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {placeable.map(({ product, variant }) => (
            <li key={variant.id}>
              <button
                type="button"
                onClick={() => onAdd(variant)}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-2 text-left transition-colors hover:border-border-strong"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-alt">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Box size={18} className="text-muted-foreground" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{product.name} · {variant.name}</span>
                  {variant.price != null && (
                    <span className="block text-xs text-muted-foreground">{formatCurrency(variant.price)}</span>
                  )}
                </span>
                <Plus size={16} className="shrink-0 text-accent" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          className="rounded-control border border-border py-2 text-sm text-foreground hover:border-border-strong"
        >
          Tải thêm
        </button>
      )}
    </div>
  )
}
```

> Verify `formatCurrency` exists at `src/lib/format.js` (used across the storefront). If the path differs, import from wherever `ProductCard`/`CartPage` import it. If no helper exists, render `variant.price` with `.toLocaleString('vi-VN')`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/CatalogTray.test.jsx`
Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/pages/roomPlanner/CatalogTray.jsx src/pages/roomPlanner/CatalogTray.test.jsx
```

---

### Task 7: PlannerToolbar + SelectedItemPanel

**Files:**
- Create: `src/pages/roomPlanner/PlannerToolbar.jsx`
- Create: `src/pages/roomPlanner/SelectedItemPanel.jsx`
- Test: `src/pages/roomPlanner/PlannerToolbar.test.jsx`
- Test: `src/pages/roomPlanner/SelectedItemPanel.test.jsx`

**Interfaces:**
- Produces:
  - `PlannerToolbar({ name, onNameChange, gizmoMode, onGizmoModeChange, onSave, saving, dirty, onExit })`
  - `SelectedItemPanel({ item, onDelete, onResetTransform })` — renders nothing when `item` is null.

- [ ] **Step 1: Write the failing tests**

`src/pages/roomPlanner/PlannerToolbar.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerToolbar } from './PlannerToolbar'

const base = {
  name: 'Phòng A', onNameChange: vi.fn(), gizmoMode: 'translate',
  onGizmoModeChange: vi.fn(), onSave: vi.fn(), saving: false, dirty: true, onExit: vi.fn(),
}

describe('PlannerToolbar', () => {
  it('calls onSave when Lưu is clicked', async () => {
    const onSave = vi.fn()
    render(<PlannerToolbar {...base} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /lưu/i }))
    expect(onSave).toHaveBeenCalled()
  })

  it('switches gizmo mode', async () => {
    const onGizmoModeChange = vi.fn()
    render(<PlannerToolbar {...base} onGizmoModeChange={onGizmoModeChange} />)
    await userEvent.click(screen.getByRole('button', { name: /xoay/i }))
    expect(onGizmoModeChange).toHaveBeenCalledWith('rotate')
  })

  it('disables save when not dirty', () => {
    render(<PlannerToolbar {...base} dirty={false} />)
    expect(screen.getByRole('button', { name: /lưu/i })).toBeDisabled()
  })
})
```

`src/pages/roomPlanner/SelectedItemPanel.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectedItemPanel } from './SelectedItemPanel'

describe('SelectedItemPanel', () => {
  it('renders nothing without a selected item', () => {
    const { container } = render(<SelectedItemPanel item={null} onDelete={vi.fn()} onResetTransform={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('deletes and resets the selected item', async () => {
    const onDelete = vi.fn()
    const onResetTransform = vi.fn()
    const item = { localId: 1, variant: { name: 'Ghế Sofa' } }
    render(<SelectedItemPanel item={item} onDelete={onDelete} onResetTransform={onResetTransform} />)
    expect(screen.getByText('Ghế Sofa')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /đặt lại vị trí/i }))
    await userEvent.click(screen.getByRole('button', { name: /xoá/i }))
    expect(onResetTransform).toHaveBeenCalled()
    expect(onDelete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/roomPlanner/PlannerToolbar.test.jsx src/pages/roomPlanner/SelectedItemPanel.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both components**

`src/pages/roomPlanner/PlannerToolbar.jsx`:
```jsx
import { Move3d, RotateCw, Maximize, Save, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

const MODES = [
  { key: 'translate', label: 'Di chuyển', icon: Move3d },
  { key: 'rotate', label: 'Xoay', icon: RotateCw },
  { key: 'scale', label: 'Phóng to', icon: Maximize },
]

export function PlannerToolbar({ name, onNameChange, gizmoMode, onGizmoModeChange, onSave, saving, dirty, onExit }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Thoát" className="text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <input
          aria-label="Tên phòng"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="rounded-control border border-transparent bg-transparent px-2 py-1 text-base font-medium text-foreground hover:border-border focus-visible:border-border-strong focus-visible:outline-none"
        />
      </div>

      <div className="flex items-center gap-1 rounded-control border border-border p-1">
        {MODES.map((mode) => {
          const Icon = mode.icon
          const active = gizmoMode === mode.key
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => onGizmoModeChange(mode.key)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface-alt'
              }`}
            >
              <Icon size={15} aria-hidden="true" /> {mode.label}
            </button>
          )
        })}
      </div>

      <Button type="button" onClick={onSave} disabled={saving || !dirty}>
        {saving ? <Spinner label="Đang lưu" /> : <><Save size={16} /> Lưu</>}
      </Button>
    </div>
  )
}
```

`src/pages/roomPlanner/SelectedItemPanel.jsx`:
```jsx
import { RotateCcw, Trash2 } from 'lucide-react'

export function SelectedItemPanel({ item, onDelete, onResetTransform }) {
  if (!item) return null
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <p className="mb-3 truncate text-sm font-medium text-foreground">{item.variant.name}</p>
      <div className="flex gap-2">
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/roomPlanner/PlannerToolbar.test.jsx src/pages/roomPlanner/SelectedItemPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/pages/roomPlanner/PlannerToolbar.jsx src/pages/roomPlanner/SelectedItemPanel.jsx \
        src/pages/roomPlanner/PlannerToolbar.test.jsx src/pages/roomPlanner/SelectedItemPanel.test.jsx
```

---

### Task 8: RoomPlannerPage + routing + header link

**Files:**
- Create: `src/pages/roomPlanner/RoomPlannerPage.jsx`
- Create: `src/pages/roomPlanner/SmallScreenNotice.jsx`
- Modify: `src/app/router.jsx` (lazy import + standalone protected route)
- Modify: `src/components/layout/Header.jsx` (nav link)
- Test: `src/pages/roomPlanner/RoomPlannerPage.test.jsx`

**Interfaces:**
- Consumes: `useEditorStore` (Task 2), `useScene/useCreateScene/useUpdateScene` (Task 3), `editorStateToPayload` (Task 1), `RoomCanvas` (Task 4), `RoomSetupDialog` (Task 5), `CatalogTray` (Task 6), `PlannerToolbar`/`SelectedItemPanel` (Task 7).
- Produces: `RoomPlannerPage` (named export) mounted at `/room-planner` and `/room-planner/:id`.

- [ ] **Step 1: Write the failing test**

`src/pages/roomPlanner/RoomPlannerPage.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoomPlannerPage } from './RoomPlannerPage'
import * as roomPlannerApi from '../../features/roomPlanner/api'
import * as catalogApi from '../../features/catalog/api'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

// The 3D canvas can't run in jsdom — replace it with a marker.
vi.mock('./scene/RoomCanvas', () => ({ RoomCanvas: () => <div data-testid="room-canvas" /> }))
vi.mock('../../features/roomPlanner/api')
vi.mock('../../features/catalog/api')

function renderPage(path = '/room-planner') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/room-planner" element={<RoomPlannerPage />} />
          <Route path="/room-planner/:id" element={<RoomPlannerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RoomPlannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditorStore.getState().reset()
    catalogApi.getProducts.mockResolvedValue({
      data: [{ id: 1, name: 'Sofa', thumbnail: null, variants: [{ id: 11, sku: 'A', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 }] }],
      meta: { pagination: { has_more: false, next_cursor: null } },
    })
  })

  it('shows the setup dialog for a new room, then the canvas', async () => {
    renderPage('/room-planner')
    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    expect(await screen.findByTestId('room-canvas')).toBeInTheDocument()
  })

  it('adds a tray item then saves via create and shows the saved state', async () => {
    roomPlannerApi.createScene.mockResolvedValue({ data: { id: 55, name: 'Phòng của tôi' } })
    renderPage('/room-planner')
    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Sofa.*Đỏ/s }))
    await userEvent.click(screen.getByRole('button', { name: /lưu/i }))
    await waitFor(() => expect(roomPlannerApi.createScene).toHaveBeenCalled())
    const payload = roomPlannerApi.createScene.mock.calls[0][0]
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].variant_id).toBe(11)
  })

  it('loads an existing scene by id without the setup dialog', async () => {
    roomPlannerApi.getScene.mockResolvedValue({
      data: { id: 9, name: 'Phòng cũ', width: '4', depth: '5', height: '2.8', items: [] },
    })
    renderPage('/room-planner/9')
    expect(await screen.findByTestId('room-canvas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tạo phòng/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/RoomPlannerPage.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SmallScreenNotice.jsx` and `RoomPlannerPage.jsx`**

`src/pages/roomPlanner/SmallScreenNotice.jsx`:
```jsx
import { Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SmallScreenNotice() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-8 text-center lg:hidden">
      <Monitor size={40} className="text-accent" aria-hidden="true" />
      <p className="text-lg font-medium text-foreground">Thiết kế phòng 3D dùng tốt nhất trên máy tính</p>
      <p className="max-w-sm text-sm text-muted-foreground">Vui lòng mở trên màn hình lớn hơn để có trải nghiệm chỉnh sửa đầy đủ.</p>
      <Link to="/" className="text-sm text-accent hover:underline">Về cửa hàng</Link>
    </div>
  )
}
```

`src/pages/roomPlanner/RoomPlannerPage.jsx`:
```jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RoomCanvas } from './scene/RoomCanvas'
import { RoomSetupDialog } from './RoomSetupDialog'
import { CatalogTray } from './CatalogTray'
import { PlannerToolbar } from './PlannerToolbar'
import { SelectedItemPanel } from './SelectedItemPanel'
import { SmallScreenNotice } from './SmallScreenNotice'
import { Spinner } from '../../components/Spinner'
import { useEditorStore } from '../../features/roomPlanner/editorStore'
import { useScene, useCreateScene, useUpdateScene } from '../../features/roomPlanner/hooks'
import { editorStateToPayload } from '../../features/roomPlanner/mappers'
import { useToastStore } from '../../store/toastStore'

const DEFAULT_ROOM = { width: 4, depth: 5, height: 2.8 }

export function RoomPlannerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((state) => state.addToast)

  const sceneQuery = useScene(id)
  const createScene = useCreateScene()
  const updateScene = useUpdateScene()

  const store = useEditorStore()
  const [setupOpen, setSetupOpen] = useState(!id)

  // Fresh store whenever the route target changes.
  useEffect(() => {
    store.reset()
    setSetupOpen(!id)
    return () => store.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Hydrate an existing scene once it loads.
  useEffect(() => {
    if (id && sceneQuery.data?.data) {
      store.loadScene(sceneQuery.data.data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sceneQuery.data])

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const handler = (event) => {
      if (store.dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [store.dirty])

  const handleCreateRoom = (room) => {
    store.initNew(room)
    setSetupOpen(false)
  }

  const handleSave = async () => {
    const payload = editorStateToPayload(store)
    try {
      if (store.id) {
        await updateScene.mutateAsync({ id: store.id, payload })
      } else {
        const response = await createScene.mutateAsync(payload)
        store.markSaved(response.data.id)
        navigate(`/room-planner/${response.data.id}`, { replace: true })
      }
      addToast({ type: 'success', message: 'Đã lưu phòng.' })
    } catch (error) {
      addToast({ type: 'error', message: error?.message ?? 'Lưu phòng thất bại.' })
    }
  }

  const handleExit = () => {
    if (store.dirty && !window.confirm('Bạn có thay đổi chưa lưu. Thoát?')) return
    navigate('/')
  }

  const selectedItem = store.items.find((item) => item.localId === store.selectedId) ?? null

  if (id && sceneQuery.isLoading) {
    return <div className="flex h-dvh items-center justify-center"><Spinner label="Đang tải phòng" /></div>
  }
  if (id && sceneQuery.isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
        <p className="text-foreground">Không tìm thấy phòng thiết kế.</p>
        <button type="button" onClick={() => navigate('/')} className="text-accent hover:underline">Về cửa hàng</button>
      </div>
    )
  }

  return (
    <>
      <SmallScreenNotice />
      <div className="hidden h-dvh flex-col lg:flex">
        <PlannerToolbar
          name={store.name}
          onNameChange={store.setName}
          gizmoMode={store.gizmoMode}
          onGizmoModeChange={store.setGizmoMode}
          onSave={handleSave}
          saving={createScene.isPending || updateScene.isPending}
          dirty={store.dirty}
          onExit={handleExit}
        />
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-hidden border-r border-border bg-surface-alt/40 p-4">
            <CatalogTray onAdd={store.addVariant} />
            <SelectedItemPanel item={selectedItem} onDelete={store.deleteSelected} onResetTransform={store.resetSelectedTransform} />
          </aside>
          <main className="relative min-w-0 flex-1 bg-surface">
            {store.status === 'ready' && <RoomCanvas />}
          </main>
        </div>
      </div>

      <RoomSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initialRoom={DEFAULT_ROOM}
        onSubmit={handleCreateRoom}
      />
    </>
  )
}
```

> Check `useToastStore`'s `addToast` signature against an existing caller (`AddressFormModal` uses `addToast`). Match its argument shape (`{ type, message }` vs positional) exactly.

- [ ] **Step 4: Wire routing + header link**

In `src/app/router.jsx`, add the lazy import next to the other `named(...)` lines:
```js
const RoomPlannerPage = named(() => import('../pages/roomPlanner/RoomPlannerPage'), 'RoomPlannerPage')
```
Add this **top-level route object** to the `routes` array (sibling of the `/` and `/admin` objects, so it gets no storefront Header/Footer):
```js
  {
    // Full-screen 3D planner — standalone chrome, logged-in only.
    element: <ProtectedRoute />,
    children: [
      { path: '/room-planner', element: lazyPage(<RoomPlannerPage />) },
      { path: '/room-planner/:id', element: lazyPage(<RoomPlannerPage />) },
    ],
  },
```

In `src/components/layout/Header.jsx`, add a nav link inside the desktop `<nav className="hidden ... md:flex">`, after the "Sản phẩm" link:
```jsx
          <NavLink to="/room-planner" className={navLinkClass}>
            Thiết kế phòng 3D
          </NavLink>
```

- [ ] **Step 5: Run the page test + the full suite**

Run: `npx vitest run src/pages/roomPlanner/RoomPlannerPage.test.jsx`
Expected: PASS.

Run: `npx vitest run`
Expected: whole suite green (if `src/components/layout/layout.test.jsx` asserts an exact nav-link set, update it to include "Thiết kế phòng 3D").

- [ ] **Step 6: Lint + build**

Run: `npm run lint && npm run build`
Expected: no lint errors; build succeeds with the planner in its own lazy chunk.

- [ ] **Step 7: Stage**

```bash
git add src/pages/roomPlanner/RoomPlannerPage.jsx src/pages/roomPlanner/SmallScreenNotice.jsx \
        src/pages/roomPlanner/RoomPlannerPage.test.jsx src/app/router.jsx src/components/layout/Header.jsx
```

---

### Task 9: Documentation

**Files:**
- Modify: `Nestify-Furniture-e-commerce-frontend/docs/FE-TEAM-WORKFLOW.md`
- Modify: `Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md`

> Per the keep-docs-in-sync convention. The report `NestifyBaoCao_v2.docx` is **not** edited — note the change for the user.

- [ ] **Step 1: Document the Room Planner feature flow in `FE-TEAM-WORKFLOW.md`**

Add a feature section in the same outline style as the other features (Actor → Entry → layer flow → side-effects → errors → defence points). Cover:
- Actor: logged-in customer. Entry: header "Thiết kế phòng 3D" → `/room-planner` (and `/room-planner/:id`), behind `ProtectedRoute`, standalone full-screen (no storefront `Layout`).
- Layer flow: `RoomPlannerPage` → `useEditorStore` (Zustand) holds room + items + selection; `scene/RoomCanvas` renders with R3F/drei; `CatalogTray` → `useInfiniteProducts` filtered by `toPlaceableItems` (variants with `model_3d_url`); save → `useCreateScene`/`useUpdateScene` → `POST`/`PATCH /room-scenes` (full item replace).
- Side-effects: first save redirects `/room-planner` → `/room-planner/:id`; `beforeunload` + exit guard on unsaved changes.
- Defence points: why three.js is lazy-loaded (bundle), why metres (glTF), why the BE replaces items on update (idempotent save), why WebGL isn't unit-tested (jsdom) and what is tested instead (pure mappers/store + mocked-canvas component tests), the demo prerequisite that variants need a real `.glb`.
- Slot it into the FE team division (it touches catalog data + a new domain; assign alongside Product/Catalog or as a dedicated advanced-feature owner).

- [ ] **Step 2: Document the consumed endpoints in `FE_AI_CONTEXT.md`**

Add the room-scene endpoints the FE now consumes: `GET /room-scenes/{id}`, `POST /room-scenes`, `PATCH /room-scenes/{id}` (note: sending `items` replaces them). State that `model_3d_url` on `ProductVariantResource` drives which products are placeable, and that `GET /products` already eager-loads active variants. Note that share & convert-to-order exist on the BE but are not yet consumed by the FE.

- [ ] **Step 3: Note the report change for the user**

Add a one-line reminder (in the PR/summary, not in the docx): "Report `NestifyBaoCao_v2.docx` — add the 3D Room Planner FE feature if it should appear there; not auto-edited."

- [ ] **Step 4: Stage**

```bash
git add Nestify-Furniture-e-commerce-frontend/docs/FE-TEAM-WORKFLOW.md
# FE_AI_CONTEXT.md lives in the backend repo — stage from there:
# git -C ../Nestify-Furniture-e-commerce-backend add docs/FE_AI_CONTEXT.md
```

---

## Self-Review

**Spec coverage:**
- §3 architecture (feature folder + page tree + scene subtree) → Tasks 1–8. ✔
- §3 routing standalone + ProtectedRoute + lazy + header link → Task 8. ✔
- §2 deps (fiber v8 / drei v9 / three) → Task 4 (pinned in Global Constraints). ✔
- §3 data layer (api/hooks) + client-side 3D filter → Tasks 1 (`toPlaceableItems`), 3, 6. ✔
- §4 state model + map ⇄ payload + create-then-update redirect → Tasks 1, 2, 8. ✔
- §5 3D scene (room/floor/walls/grid, glb clone, error→placeholder, OrbitControls, TransformControls, snap/clamp) → Tasks 1 (snap/clamp), 4. ✔
- §6 UI chrome (toolbar, tray, selected panel, setup dialog metres/defaults, small-screen) → Tasks 5–8. ✔
- §7 error/edge (not-logged-in, 404, glb fail, save fail, dirty guard, empty tray) → Tasks 8 (page), 4 (boundary), 6 (empty). ✔
- §8 seeding/demo → operational note in Global Constraints + Task 9 Step 3. ✔
- §9 testing (pure unit + mocked-canvas component, no WebGL) → Tasks 1–3, 5–8. ✔
- §10 docs → Task 9. ✔

**Placeholder scan:** No TBD/TODO. Two "verify the primitive's prop/signature" notes (Modal, useToastStore, formatCurrency) point at concrete reference files to copy from, not unfinished work.

**Type consistency:** `makeLocalId`, `clampToRoom`, `snapToFloor` defined in Task 1, consumed by Tasks 2/4. `sceneToEditorState`/`editorStateToPayload` (Task 1) used in Tasks 2/8. `toPlaceableItems` (Task 1) used in Task 6. Store actions named in Task 2 are exactly those called in Tasks 7/8 (`addVariant`, `selectItem`, `setGizmoMode`, `updateTransform`, `deleteSelected`, `resetSelectedTransform`, `markSaved`, `setName`, `setRoom`, `initNew`, `loadScene`, `reset`). `useScene/useCreateScene/useUpdateScene` (Task 3) consumed in Task 8 with the `{ id, payload }` mutate shape defined in Task 3. Consistent.
