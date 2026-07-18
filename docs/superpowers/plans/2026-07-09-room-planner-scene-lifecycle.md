# Room Planner — Scene Lifecycle & Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the already-built backend scene endpoints in the frontend — a "Phòng của tôi" page, a share link, and a public read-only viewer — and fix placed models sinking through the floor.

**Architecture:** Frontend-only. Add thin `api.js`/`hooks.js` functions over existing `/room-scenes` endpoints; a new account page and a public viewer page; extract a shared presentational `SceneStage` so the editor and viewer render 3D through one component. Fix floor-snap by normalising each model's base to its local origin.

**Tech Stack:** React (plain JSX, no TS), react-router-dom, @tanstack/react-query, zustand, @react-three/fiber + drei + three, Tailwind v4 semantic tokens, Vitest + React Testing Library.

## Global Constraints

- **No backend changes.** Verified: `UpdateRoomSceneRequest` uses `sometimes`, so rename via `PATCH { name }` needs no BE change; the shared-viewer and list endpoints already exist.
- **Do NOT run `git commit` until the user explicitly authorizes** (project guardrail overrides the plan's commit cadence). Treat every "Commit" step as *stage + hold*: run it only when the user says to commit.
- **`imagined` (#B5754A) button variant** appears in exactly one place site-wide — the planner Save CTA. The Share/Delete/Open/Copy actions use `primary`/`secondary`, never `imagined`. `confirmed` stays checkout-only.
- **Plain JSX, no TypeScript.** Match existing file/naming conventions.
- **Tests:** Vitest + RTL; mock `@react-three/fiber`'s `Canvas` (see `RoomCanvas.test.jsx`) — never boot three.js in jsdom. The full suite (currently 419 tests) must stay green.
- **Editor stays desktop-only** (`SmallScreenNotice`); the **shared viewer is allowed on mobile** (orbit-only).
- Copy is Vietnamese, matching the Becoming voice.

## File Structure

**Create:**
- `src/pages/account/MyRoomsPage.jsx` — the "Phòng của tôi" list page (Task 2).
- `src/pages/account/MyRoomsPage.test.jsx` — its tests (Task 2).
- `src/pages/roomPlanner/scene/SceneStage.jsx` — shared Canvas + lights + Room + OrbitControls + WebGL/context-loss guards (Task 3).
- `src/pages/roomPlanner/scene/SceneStage.test.jsx` — WebGL-gate test (Task 3).
- `src/pages/roomPlanner/scene/SharedSceneCanvas.jsx` — read-only 3D from a fetched scene (Task 4).
- `src/pages/roomPlanner/SharedRoomPage.jsx` — the public viewer page (Task 4).
- `src/pages/roomPlanner/SharedRoomPage.test.jsx` — its tests (Task 4).
- `src/pages/roomPlanner/ShareSceneDialog.jsx` — the copy-link dialog (Task 5).

**Modify:**
- `src/features/roomPlanner/threeD.js` — add `baseOffset(box)` (Task 1).
- `src/pages/roomPlanner/scene/FurnitureModel.jsx` — normalise model base; offset placeholder; export `ModelErrorBoundary` (Tasks 1 & 4).
- `src/pages/roomPlanner/scene/PlacedItem.jsx` — import `ModelErrorBoundary` from FurnitureModel (Task 4).
- `src/features/roomPlanner/api.js` — add `listScenes`, `deleteScene` (Task 2), `shareScene` (Task 5), `getSharedScene` (Task 4).
- `src/features/roomPlanner/hooks.js` — add `useScenes`, `useDeleteScene`, `useRenameScene` (Task 2), `useSharedScene` (Task 4), `useShareScene` (Task 5).
- `src/pages/roomPlanner/scene/RoomCanvas.jsx` — compose `SceneStage` (Task 3).
- `src/pages/account/AccountPage.jsx` — add "Phòng của tôi" nav card (Task 2).
- `src/app/router.jsx` — add `account/rooms` (protected) + `/room-planner/shared/:token` (public) (Tasks 2 & 4).
- `src/pages/roomPlanner/PlannerToolbar.jsx` — add Share button (Task 5).
- `src/pages/roomPlanner/RoomPlannerPage.jsx` — wire the share flow (Task 5).

---

### Task 1: Floor-snap fix

**Files:**
- Modify: `src/features/roomPlanner/threeD.js`
- Modify: `src/pages/roomPlanner/scene/FurnitureModel.jsx`
- Test: `src/features/roomPlanner/threeD.test.js`

**Interfaces:**
- Produces: `baseOffset(box) → number` in `threeD.js` — given a `THREE.Box3`-shaped object `{ min: { y } }`, returns the y-translation that lifts the model so its base sits at local y=0 (i.e. `-box.min.y`). Returns `0` when the box is degenerate/undefined.

- [ ] **Step 1: Write the failing test**

Create `src/features/roomPlanner/threeD.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { baseOffset } from './threeD'

describe('baseOffset', () => {
  it('lifts a model whose base is below local origin', () => {
    // A box spanning y ∈ [-0.4, 0.4] must rise by 0.4 to rest its base at 0.
    expect(baseOffset({ min: { y: -0.4 } })).toBeCloseTo(0.4)
  })

  it('lowers a model whose base floats above origin', () => {
    expect(baseOffset({ min: { y: 0.25 } })).toBeCloseTo(-0.25)
  })

  it('returns 0 for a missing or degenerate box', () => {
    expect(baseOffset(undefined)).toBe(0)
    expect(baseOffset({ min: { y: NaN } })).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/roomPlanner/threeD.test.js`
Expected: FAIL — `baseOffset is not a function` / not exported.

- [ ] **Step 3: Implement `baseOffset` in `threeD.js`**

Append to `src/features/roomPlanner/threeD.js`:

```javascript
// Given a bounding box, the y-translation that puts the model's base at local
// y=0 so a group at y=0 rests on the floor (fixes centred-origin models sinking).
export function baseOffset(box) {
  const minY = box?.min?.y
  return Number.isFinite(minY) ? -minY : 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/roomPlanner/threeD.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Apply the offset in `FurnitureModel.jsx`**

Rewrite `src/pages/roomPlanner/scene/FurnitureModel.jsx` so the cloned model is normalised to rest on the floor, and the placeholder cube sits on the floor too:

```jsx
import { useMemo } from 'react'
import { Box3 } from 'three'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { baseOffset } from '../../../features/roomPlanner/threeD'

// Loads a .glb and returns a fresh clone so repeated instances don't share nodes.
// The clone is shifted so its base sits at local y=0 — a group at y=0 then rests
// on the floor instead of sinking (models are authored around a centred origin).
// Suspends while loading; an ErrorBoundary in PlacedItem renders the fallback box.
export function FurnitureModel({ url }) {
  const { scene } = useGLTF(url)
  const object = useMemo(() => {
    const clone = cloneSkinned(scene)
    const box = new Box3().setFromObject(clone)
    clone.position.y += baseOffset(box)
    return clone
  }, [scene])
  return <primitive object={object} />
}

export function PlaceholderBox() {
  // `emerging` #8A7C68 — a being-considered placeholder while the .glb loads (or
  // on load failure). Centred unit cube, lifted 0.5 so its base rests on the floor.
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8A7C68" transparent opacity={0.6} />
    </mesh>
  )
}
```

- [ ] **Step 6: Verify nothing regressed**

Run: `npx vitest run src/pages/roomPlanner && npm run lint`
Expected: PASS, lint clean. (`snapToFloor` in `threeD.js` is now dead — leave it; a later editor-depth task may reuse it. Do not remove in this task.)

- [ ] **Step 7: Commit** (stage + hold per Global Constraints)

```bash
git add src/features/roomPlanner/threeD.js src/features/roomPlanner/threeD.test.js src/pages/roomPlanner/scene/FurnitureModel.jsx
git commit -m "fix(planner): rest placed models on the floor instead of sinking"
```

---

### Task 2: "Phòng của tôi" page

**Files:**
- Modify: `src/features/roomPlanner/api.js`
- Modify: `src/features/roomPlanner/hooks.js`
- Create: `src/pages/account/MyRoomsPage.jsx`
- Create: `src/pages/account/MyRoomsPage.test.jsx`
- Modify: `src/app/router.jsx`
- Modify: `src/pages/account/AccountPage.jsx`

**Interfaces:**
- Consumes: existing `apiClient`, `updateScene(id, payload)` in `api.js`.
- Produces:
  - `listScenes(page)` → `GET /room-scenes?page=<n>` resolving `{ data: RoomScene[], meta: { pagination: { total, page, last_page, per_page } } }`.
  - `deleteScene(id)` → `DELETE /room-scenes/{id}`.
  - `useScenes()` → `useInfiniteQuery`; exposes `data.pages`, `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`, `isLoading`, `isError`.
  - `useDeleteScene()` → mutation `mutate(id)`; invalidates `['roomScenes']`.
  - `useRenameScene()` → mutation `mutate({ id, name })`; invalidates `['roomScenes']`.
  - Route `/account/rooms` → `MyRoomsPage`.

- [ ] **Step 1: Add API functions**

Append to `src/features/roomPlanner/api.js`:

```javascript
export function listScenes(page = 1) {
  return apiClient.get('/room-scenes', { params: { page } })
}

export function deleteScene(id) {
  return apiClient.delete(`/room-scenes/${id}`)
}
```

- [ ] **Step 2: Add hooks**

Append to `src/features/roomPlanner/hooks.js` (add `useInfiniteQuery` to the existing `@tanstack/react-query` import):

```javascript
export function useScenes() {
  return useInfiniteQuery({
    queryKey: ['roomScenes'],
    queryFn: ({ pageParam = 1 }) => roomPlannerApi.listScenes(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage?.meta?.pagination
      return p && p.page < p.last_page ? p.page + 1 : undefined
    },
  })
}

export function useDeleteScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => roomPlannerApi.deleteScene(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}

export function useRenameScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }) => roomPlannerApi.updateScene(id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}
```

- [ ] **Step 3: Write the failing test**

Create `src/pages/account/MyRoomsPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { MyRoomsPage } from './MyRoomsPage'
import * as roomPlannerApi from '../../features/roomPlanner/api'

vi.mock('../../features/roomPlanner/api')

const page1 = {
  data: [
    {
      id: 7,
      name: 'Phòng khách',
      width: 4, depth: 5, height: 2.8,
      is_public: false,
      items: [{ id: 1, variant: { id: 1, sku: 'SOFA', model_3d_url: 'a.glb' } }],
      created_at: '2026-07-01T10:00:00Z',
    },
  ],
  meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 10 } },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyRoomsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MyRoomsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    roomPlannerApi.listScenes.mockResolvedValue(page1)
  })

  it('lists saved rooms with a link to open each one', async () => {
    renderPage()
    expect(await screen.findByText('Phòng khách')).toBeInTheDocument()
    expect(screen.getByText(/4 × 5 × 2\.8 m/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mở/ })).toHaveAttribute('href', '/room-planner/7')
  })

  it('shows an empty state when there are no rooms', async () => {
    roomPlannerApi.listScenes.mockResolvedValue({ data: [], meta: { pagination: { total: 0, page: 1, last_page: 1, per_page: 10 } } })
    renderPage()
    expect(await screen.findByText(/Chưa có phòng nào/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tạo phòng mới/ })).toHaveAttribute('href', '/room-planner')
  })

  it('deletes a room after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    roomPlannerApi.deleteScene.mockResolvedValue(null)
    renderPage()
    await screen.findByText('Phòng khách')
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
    await waitFor(() => expect(roomPlannerApi.deleteScene).toHaveBeenCalledWith(7))
  })

  it('renames a room', async () => {
    roomPlannerApi.updateScene.mockResolvedValue({ data: { id: 7, name: 'Phòng ngủ' } })
    renderPage()
    await screen.findByText('Phòng khách')
    await userEvent.click(screen.getByRole('button', { name: 'Đổi tên' }))
    const input = screen.getByRole('textbox', { name: 'Tên phòng' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Phòng ngủ{Enter}')
    await waitFor(() => expect(roomPlannerApi.updateScene).toHaveBeenCalledWith(7, { name: 'Phòng ngủ' }))
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/pages/account/MyRoomsPage.test.jsx`
Expected: FAIL — cannot resolve `./MyRoomsPage`.

- [ ] **Step 5: Implement `MyRoomsPage.jsx`**

Create `src/pages/account/MyRoomsPage.jsx`:

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Pencil, Trash2, Plus, Share2 } from 'lucide-react'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { BecomingRoomArt } from '../../components/BecomingRoomArt'
import { Input } from '../../components/Input'
import { useScenes, useDeleteScene, useRenameScene } from '../../features/roomPlanner/hooks'
import { useToastStore } from '../../store/toastStore'
import { formatDate } from '../../lib/format'

function RoomCard({ scene }) {
  const rename = useRenameScene()
  const remove = useDeleteScene()
  const addToast = useToastStore((s) => s.addToast)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(scene.name)

  const commitName = () => {
    setEditing(false)
    const next = name.trim()
    if (!next || next === scene.name) { setName(scene.name); return }
    rename.mutate({ id: scene.id, name: next }, {
      onError: () => { setName(scene.name); addToast({ title: 'Đổi tên thất bại.', variant: 'error' }) },
    })
  }

  const handleDelete = () => {
    if (!window.confirm(`Xoá phòng “${scene.name}”?`)) return
    remove.mutate(scene.id, {
      onSuccess: () => addToast({ title: 'Đã xoá phòng.', variant: 'success' }),
      onError: () => addToast({ title: 'Xoá phòng thất bại.', variant: 'error' }),
    })
  }

  const dims = `${scene.width} × ${scene.depth} × ${scene.height} m`

  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <Input
            aria-label="Tên phòng"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName() }}
          />
        ) : (
          <p className="truncate font-display text-lg text-foreground">{scene.name}</p>
        )}
        {scene.is_public && <Badge tone="in-stock"><Share2 size={12} /> Đang chia sẻ</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">{dims} · {scene.items?.length ?? 0} món · {formatDate(scene.created_at)}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Link
          to={`/room-planner/${scene.id}`}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-surface hover:bg-primary-hover"
        >
          <Box size={15} /> Mở
        </Link>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-sm text-foreground hover:border-border-strong">
          <Pencil size={15} /> Đổi tên
        </button>
        <button type="button" onClick={handleDelete} disabled={remove.isPending} className="inline-flex items-center gap-1.5 rounded-control border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50">
          <Trash2 size={15} /> Xoá
        </button>
      </div>
    </li>
  )
}

export function MyRoomsPage() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useScenes()
  const scenes = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Không gian của bạn</p>
            <h1 className="mt-1 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight text-foreground">Phòng của tôi</h1>
          </div>
          <Link to="/room-planner" className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-surface hover:bg-primary-hover">
            <Plus size={16} /> Tạo phòng mới
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-12"><Spinner label="Đang tải danh sách phòng..." /></div>
        ) : isError ? (
          <p className="mt-12 text-sm text-muted-foreground">Không tải được danh sách phòng.</p>
        ) : scenes.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-5 text-center">
            <div className="w-full max-w-[360px]"><BecomingRoomArt level={1} /></div>
            <p className="max-w-sm text-muted-foreground">Chưa có phòng nào — bắt đầu hình dung không gian đầu tiên của bạn.</p>
            <Link to="/room-planner" className="inline-flex items-center gap-2 rounded-control bg-ink px-4 py-2.5 text-sm font-medium text-canvas hover:opacity-90">
              <Plus size={16} /> Tạo phòng mới
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {scenes.map((scene) => <RoomCard key={scene.id} scene={scene} />)}
            </ul>
            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? 'Đang tải...' : 'Tải thêm'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/pages/account/MyRoomsPage.test.jsx`
Expected: PASS (4 tests). If `Badge` tone or `Input` prop names differ, open those components and adjust; do not invent props.

- [ ] **Step 7: Register the route**

In `src/app/router.jsx`, add the lazy import beside the other account imports:

```javascript
const MyRoomsPage = named(() => import('../pages/account/MyRoomsPage'), 'MyRoomsPage')
```

And add the route inside the existing storefront `ProtectedRoute` children (next to `account/addresses`):

```javascript
          { path: 'account/rooms', element: lazyPage(<MyRoomsPage />) },
```

- [ ] **Step 8: Add the Account entry point**

In `src/pages/account/AccountPage.jsx`, add `Box` to the lucide import and a nav item:

```javascript
const navItems = [
  { to: '/account/rooms', label: 'Phòng của tôi', icon: Box },
  { to: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { to: '/orders', label: 'Đơn hàng của tôi', icon: Package },
  { to: '/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
]
```

- [ ] **Step 9: Verify**

Run: `npx vitest run src/pages/account && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 10: Commit** (stage + hold)

```bash
git add src/features/roomPlanner/api.js src/features/roomPlanner/hooks.js src/pages/account/MyRoomsPage.jsx src/pages/account/MyRoomsPage.test.jsx src/app/router.jsx src/pages/account/AccountPage.jsx
git commit -m "feat(planner): add 'Phòng của tôi' saved-rooms page"
```

---

### Task 3: Extract `SceneStage`; refactor `RoomCanvas`

**Files:**
- Create: `src/pages/roomPlanner/scene/SceneStage.jsx`
- Create: `src/pages/roomPlanner/scene/SceneStage.test.jsx`
- Modify: `src/pages/roomPlanner/scene/RoomCanvas.jsx`

**Interfaces:**
- Produces: `SceneStage({ room, orbitEnabled = true, children })` — renders the WebGL-support gate (falling back to the "unsupported" panel), the `<Canvas>` with lights + `<Room>` + `<OrbitControls enabled={orbitEnabled}>`, the runtime context-loss overlay, and `children` inside the Canvas. No editor-store coupling.
- Consumes (RoomCanvas): `SceneStage`; keeps its own store reads, the deselect plane, and per-item `PlacedItem`s as `children`.

- [ ] **Step 1: Create `SceneStage.jsx`** (move the presentational parts out of `RoomCanvas` verbatim)

Create `src/pages/roomPlanner/scene/SceneStage.jsx`:

```jsx
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MonitorOff, MonitorX } from 'lucide-react'
import { Room } from './Room'
import { useWebGLSupport } from '../../../hooks/useWebGLSupport'

function ContextLostOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/85 px-8 text-center backdrop-blur-sm">
      <MonitorX size={36} className="text-muted-foreground" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">Mất kết nối đồ hoạ tạm thời</p>
      <p className="max-w-sm text-sm text-muted-foreground">Đang khôi phục hiển thị 3D…</p>
    </div>
  )
}

function WebGLUnsupportedFallback({ room }) {
  const hasDims = room.width > 0 || room.depth > 0 || room.height > 0
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <MonitorOff size={40} className="text-muted-foreground" aria-hidden="true" />
      <p className="text-lg font-medium text-foreground">Trình duyệt hoặc thiết bị này không hỗ trợ hiển thị 3D</p>
      <p className="max-w-sm text-sm text-muted-foreground">Xem phòng trong không gian 3D cần WebGL. Vui lòng thử trình duyệt hoặc thiết bị khác.</p>
      {hasDims && (
        <p className="text-sm text-muted-foreground">Kích thước phòng: {room.width} × {room.depth} × {room.height} m</p>
      )}
    </div>
  )
}

// Shared presentational stage: WebGL gate + Canvas + lights + Room + OrbitControls
// + runtime context-loss handling. The editor (RoomCanvas) and the read-only viewer
// (SharedSceneCanvas) both compose it, passing their own scene content as children.
export function SceneStage({ room, orbitEnabled = true, children }) {
  const webglSupported = useWebGLSupport()
  const [contextLost, setContextLost] = useState(false)

  if (!webglSupported) return <WebGLUnsupportedFallback room={room} />

  const camDistance = Math.max(room.width, room.depth, 4) * 1.4

  const handleCreated = ({ gl }) => {
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); setContextLost(true) })
    canvas.addEventListener('webglcontextrestored', () => setContextLost(false))
  }

  return (
    <div className="relative h-full w-full">
      <Canvas onCreated={handleCreated} shadows camera={{ position: [camDistance, camDistance, camDistance], fov: 45 }}>
        <hemisphereLight intensity={0.9} groundColor="#C9C4B8" />
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
        <Room width={room.width} depth={room.depth} height={room.height} />
        {children}
        <OrbitControls makeDefault enabled={orbitEnabled} target={[0, room.height / 4, 0]} />
      </Canvas>
      {contextLost && <ContextLostOverlay />}
    </div>
  )
}
```

- [ ] **Step 2: Refactor `RoomCanvas.jsx` to compose `SceneStage`**

Replace `src/pages/roomPlanner/scene/RoomCanvas.jsx` with:

```jsx
import { useState } from 'react'
import { SceneStage } from './SceneStage'
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

  return (
    <SceneStage room={room} orbitEnabled={orbitEnabled}>
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
    </SceneStage>
  )
}

export default RoomCanvas
```

- [ ] **Step 3: Move the WebGL-gate test to `SceneStage`**

Create `src/pages/roomPlanner/scene/SceneStage.test.jsx` (mirrors the existing `RoomCanvas.test.jsx` mock; it now targets `SceneStage` directly):

```jsx
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { SceneStage } from './SceneStage'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ onCreated, children }) => (
    <canvas data-testid="r3f-canvas" ref={(el) => { if (el && onCreated) onCreated({ gl: { domElement: el } }) }}>{children}</canvas>
  ),
}))
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null }))
vi.mock('./Room', () => ({ Room: () => null }))

const realGetContext = HTMLCanvasElement.prototype.getContext
afterEach(() => { HTMLCanvasElement.prototype.getContext = realGetContext; cleanup() })

const room = { width: 4, depth: 5, height: 2.8 }

describe('SceneStage WebGL gate', () => {
  test('no WebGL → renders fallback, does NOT mount <Canvas>', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
    render(<SceneStage room={room} />)
    expect(screen.getByText(/không hỗ trợ hiển thị 3D/)).toBeInTheDocument()
    expect(screen.queryByTestId('r3f-canvas')).not.toBeInTheDocument()
  })

  test('WebGL present → mounts <Canvas> with children', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ getExtension: () => ({ loseContext: vi.fn() }) }))
    render(<SceneStage room={room}><mesh data-testid="child" /></SceneStage>)
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Reconcile the old `RoomCanvas.test.jsx`**

The context-loss / WebGL assertions now live in `SceneStage`. Open `src/pages/roomPlanner/scene/RoomCanvas.test.jsx`; if its cases only exercised the WebGL gate / context-loss (now moved), delete the file (coverage preserved by `SceneStage.test.jsx`). If it also asserts editor-specific wiring, keep those cases and drop only the moved ones. Do not leave duplicated WebGL-gate assertions in both files.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/pages/roomPlanner/scene && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 6: Commit** (stage + hold)

```bash
git add src/pages/roomPlanner/scene/SceneStage.jsx src/pages/roomPlanner/scene/SceneStage.test.jsx src/pages/roomPlanner/scene/RoomCanvas.jsx src/pages/roomPlanner/scene/RoomCanvas.test.jsx
git commit -m "refactor(planner): extract shared SceneStage from RoomCanvas"
```

---

### Task 4: Shared read-only viewer

**Files:**
- Modify: `src/features/roomPlanner/api.js`
- Modify: `src/features/roomPlanner/hooks.js`
- Modify: `src/pages/roomPlanner/scene/FurnitureModel.jsx` (export `ModelErrorBoundary`)
- Modify: `src/pages/roomPlanner/scene/PlacedItem.jsx` (import it)
- Create: `src/pages/roomPlanner/scene/SharedSceneCanvas.jsx`
- Create: `src/pages/roomPlanner/SharedRoomPage.jsx`
- Create: `src/pages/roomPlanner/SharedRoomPage.test.jsx`
- Modify: `src/app/router.jsx`

**Interfaces:**
- Consumes: `SceneStage` (Task 3), `sceneToEditorState` (`mappers.js`), `FurnitureModel`/`PlaceholderBox`/`ModelErrorBoundary` (`FurnitureModel.jsx`).
- Produces:
  - `getSharedScene(token)` → `GET /room-scenes/share/{token}` resolving `{ data: RoomScene }`.
  - `useSharedScene(token)` → query keyed `['sharedScene', token]`, `enabled: !!token`.
  - `SharedSceneCanvas({ room, items })` — read-only 3D (items are editor-state-shaped `{ localId, variant, position, rotation, scale }`).
  - Public route `/room-planner/shared/:token` → `SharedRoomPage`.

- [ ] **Step 1: Move `ModelErrorBoundary` into `FurnitureModel.jsx` and export it**

At the top of `src/pages/roomPlanner/scene/FurnitureModel.jsx`, add `Component` to the react import and export the boundary (moved from `PlacedItem.jsx`):

```jsx
import { Component, useMemo } from 'react'
```

Append after `PlaceholderBox`:

```jsx
// Renders a placeholder if its child throws (e.g. a broken/missing .glb).
export class ModelErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <PlaceholderBox /> : this.props.children }
}
```

In `src/pages/roomPlanner/scene/PlacedItem.jsx`, delete the local `ModelErrorBoundary` class and import it instead:

```jsx
import { Suspense, useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { FurnitureModel, PlaceholderBox, ModelErrorBoundary } from './FurnitureModel'
```

- [ ] **Step 2: Add API + hook**

Append to `src/features/roomPlanner/api.js`:

```javascript
export function getSharedScene(token) {
  return apiClient.get(`/room-scenes/share/${token}`)
}
```

Append to `src/features/roomPlanner/hooks.js`:

```javascript
export function useSharedScene(token) {
  return useQuery({
    queryKey: ['sharedScene', token],
    queryFn: () => roomPlannerApi.getSharedScene(token),
    enabled: !!token,
    retry: false,
  })
}
```

- [ ] **Step 3: Create `SharedSceneCanvas.jsx`**

Create `src/pages/roomPlanner/scene/SharedSceneCanvas.jsx`:

```jsx
import { Suspense } from 'react'
import { SceneStage } from './SceneStage'
import { FurnitureModel, PlaceholderBox, ModelErrorBoundary } from './FurnitureModel'

// Read-only render of a saved scene: same stage as the editor, but each item is a
// static group with no TransformControls and no selection handler.
export function SharedSceneCanvas({ room, items }) {
  return (
    <SceneStage room={room}>
      {items.map((item) => (
        <group
          key={item.localId}
          position={[item.position.x, item.position.y, item.position.z]}
          rotation={[item.rotation.x, item.rotation.y, item.rotation.z]}
          scale={[item.scale.x, item.scale.y, item.scale.z]}
        >
          <ModelErrorBoundary>
            <Suspense fallback={<PlaceholderBox />}>
              {item.variant.model_3d_url ? <FurnitureModel url={item.variant.model_3d_url} /> : <PlaceholderBox />}
            </Suspense>
          </ModelErrorBoundary>
        </group>
      ))}
    </SceneStage>
  )
}
```

- [ ] **Step 4: Write the failing test**

Create `src/pages/roomPlanner/SharedRoomPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SharedRoomPage } from './SharedRoomPage'
import * as roomPlannerApi from '../../features/roomPlanner/api'

vi.mock('../../features/roomPlanner/api')
// The real 3D canvas is irrelevant to this page's logic; stub it.
vi.mock('./scene/SharedSceneCanvas', () => ({ SharedSceneCanvas: () => <div data-testid="shared-canvas" /> }))

const scene = {
  data: {
    id: 7, name: 'Phòng khách', width: 4, depth: 5, height: 2.8, is_public: true,
    items: [{ id: 1, variant: { id: 1, sku: 'SOFA', model_3d_url: 'a.glb' }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }],
  },
}

function renderAt(token) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/room-planner/shared/${token}`]}>
        <Routes><Route path="/room-planner/shared/:token" element={<SharedRoomPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SharedRoomPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the shared scene name and read-only canvas (no editing chrome)', async () => {
    roomPlannerApi.getSharedScene.mockResolvedValue(scene)
    renderAt('tok123')
    expect(await screen.findByText('Phòng khách')).toBeInTheDocument()
    expect(screen.getByTestId('shared-canvas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Khám phá cửa hàng/ })).toHaveAttribute('href', '/c/all')
    // No editor affordances leak into the public viewer.
    expect(screen.queryByRole('button', { name: 'Thêm vào giỏ' })).not.toBeInTheDocument()
  })

  it('shows a friendly not-found message when the token is invalid', async () => {
    roomPlannerApi.getSharedScene.mockRejectedValue({ status: 404 })
    renderAt('bad')
    expect(await screen.findByText(/không tồn tại hoặc đã gỡ/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/SharedRoomPage.test.jsx`
Expected: FAIL — cannot resolve `./SharedRoomPage`.

- [ ] **Step 6: Implement `SharedRoomPage.jsx`**

Create `src/pages/roomPlanner/SharedRoomPage.jsx`:

```jsx
import { useParams, Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Spinner } from '../../components/Spinner'
import { SharedSceneCanvas } from './scene/SharedSceneCanvas'
import { useSharedScene } from '../../features/roomPlanner/hooks'
import { sceneToEditorState } from '../../features/roomPlanner/mappers'

export function SharedRoomPage() {
  const { token } = useParams()
  const { data, isLoading, isError } = useSharedScene(token)

  if (isLoading) {
    return <div className="flex h-dvh items-center justify-center bg-canvas"><Spinner label="Đang tải phòng" /></div>
  }
  if (isError || !data?.data) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas px-8 text-center">
        <p className="text-foreground">Phòng chia sẻ không tồn tại hoặc đã gỡ.</p>
        <Link to="/" className="text-accent hover:underline">Về cửa hàng Nestify</Link>
      </div>
    )
  }

  const scene = data.data
  const state = sceneToEditorState(scene)

  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 md:px-6">
        <Link to="/" aria-label="Nestify — trang chủ"><Logo className="h-8 w-auto" /></Link>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-foreground">{scene.name}</p>
        <Link to="/c/all" className="shrink-0 rounded-control bg-ink px-3 py-1.5 text-sm font-medium text-canvas hover:opacity-90">Khám phá cửa hàng</Link>
      </header>
      <main className="relative min-h-0 flex-1">
        <SharedSceneCanvas room={state.room} items={state.items} />
      </main>
    </div>
  )
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/SharedRoomPage.test.jsx`
Expected: PASS (2 tests). If the not-found branch does not trigger, confirm the rejection shape — `useSharedScene` uses `retry: false`, so a rejected promise sets `isError`.

- [ ] **Step 8: Register the public route**

In `src/app/router.jsx` add the lazy import beside `RoomPlannerPage`:

```javascript
const SharedRoomPage = named(() => import('../pages/roomPlanner/SharedRoomPage'), 'SharedRoomPage')
```

Add a new **top-level, public** route object (a sibling of the planner's `ProtectedRoute` block — NOT inside `Layout`, NOT inside `ProtectedRoute`), e.g. right after the room-planner route group:

```javascript
  {
    // Public read-only shared scene — no auth, no storefront chrome.
    path: '/room-planner/shared/:token',
    element: lazyPage(<SharedRoomPage />),
  },
```

- [ ] **Step 9: Verify**

Run: `npx vitest run src/pages/roomPlanner && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 10: Commit** (stage + hold)

```bash
git add src/features/roomPlanner/api.js src/features/roomPlanner/hooks.js src/pages/roomPlanner/scene/FurnitureModel.jsx src/pages/roomPlanner/scene/PlacedItem.jsx src/pages/roomPlanner/scene/SharedSceneCanvas.jsx src/pages/roomPlanner/SharedRoomPage.jsx src/pages/roomPlanner/SharedRoomPage.test.jsx src/app/router.jsx
git commit -m "feat(planner): add public read-only shared-room viewer"
```

---

### Task 5: Share from the planner toolbar

**Files:**
- Modify: `src/features/roomPlanner/api.js`
- Modify: `src/features/roomPlanner/hooks.js`
- Create: `src/pages/roomPlanner/ShareSceneDialog.jsx`
- Modify: `src/pages/roomPlanner/PlannerToolbar.jsx`
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx`
- Test: `src/pages/roomPlanner/ShareSceneDialog.test.jsx`

**Interfaces:**
- Consumes: `ensureSaved()` (already in `RoomPlannerPage`), `BecomingModal`.
- Produces:
  - `shareScene(id)` → `POST /room-scenes/{id}/share` resolving `{ data: RoomScene with share_token }`.
  - `useShareScene()` → mutation `mutateAsync(id)`.
  - `ShareSceneDialog({ open, onOpenChange, token })` — shows the public URL and a Copy button.
  - `PlannerToolbar` gains `onShare` + `sharing` props and a "Chia sẻ" button.

- [ ] **Step 1: Add API + hook**

Append to `src/features/roomPlanner/api.js`:

```javascript
export function shareScene(id) {
  return apiClient.post(`/room-scenes/${id}/share`)
}
```

Append to `src/features/roomPlanner/hooks.js`:

```javascript
export function useShareScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => roomPlannerApi.shareScene(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}
```

- [ ] **Step 2: Write the failing test**

Create `src/pages/roomPlanner/ShareSceneDialog.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareSceneDialog } from './ShareSceneDialog'

describe('ShareSceneDialog', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } })
  })

  it('shows the public share URL and copies it', async () => {
    render(<ShareSceneDialog open token="tok123" onOpenChange={() => {}} />)
    const url = `${window.location.origin}/room-planner/shared/tok123`
    expect(screen.getByDisplayValue(url)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Sao chép/ }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/pages/roomPlanner/ShareSceneDialog.test.jsx`
Expected: FAIL — cannot resolve `./ShareSceneDialog`.

- [ ] **Step 4: Implement `ShareSceneDialog.jsx`**

Create `src/pages/roomPlanner/ShareSceneDialog.jsx`:

```jsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { BecomingModal } from '../../components/BecomingModal'

export function ShareSceneDialog({ open, onOpenChange, token }) {
  const [copied, setCopied] = useState(false)
  const url = token ? `${window.location.origin}/room-planner/shared/${token}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the input is already selectable for manual copy.
    }
  }

  return (
    <BecomingModal open={open} onOpenChange={onOpenChange} title="Chia sẻ phòng" description="Bất kỳ ai có link đều xem được phòng này ở chế độ chỉ xem.">
      <div className="flex items-center gap-2">
        <input
          aria-label="Link chia sẻ"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-primary px-3 py-2 text-sm font-medium text-surface hover:bg-primary-hover"
        >
          {copied ? <><Check size={15} /> Đã sao chép</> : <><Copy size={15} /> Sao chép</>}
        </button>
      </div>
    </BecomingModal>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/roomPlanner/ShareSceneDialog.test.jsx`
Expected: PASS. If `BecomingModal` requires a different open/title prop shape, open it and match; do not invent props.

- [ ] **Step 6: Add the Share button to `PlannerToolbar.jsx`**

Add `Share2` to the lucide import, add `onShare` + `sharing` to the props, and place the button just before the Save button (neutral `secondary` styling — never `imagined`):

```jsx
        <Button type="button" variant="secondary" onClick={onShare} disabled={sharing || itemCount === 0}>
          {sharing ? <Spinner label="Đang tạo link" /> : <><Share2 size={16} /> Chia sẻ</>}
        </Button>
```

- [ ] **Step 7: Wire the flow in `RoomPlannerPage.jsx`**

Import the dialog + hook, add state, add a handler, pass props, render the dialog:

```jsx
import { ShareSceneDialog } from './ShareSceneDialog'
// add useShareScene to the existing hooks import from '../../features/roomPlanner/hooks'
```

```jsx
  const shareScene = useShareScene()
  const [shareToken, setShareToken] = useState(null)

  const handleShare = async () => {
    try {
      const sceneId = await ensureSaved()
      const response = await shareScene.mutateAsync(sceneId)
      setShareToken(response.data.share_token)
    } catch (error) {
      addToast({ title: 'Tạo link chia sẻ thất bại.', description: error?.message, variant: 'error' })
    }
  }
```

Pass to the toolbar:

```jsx
          onShare={handleShare}
          sharing={shareScene.isPending || createScene.isPending || updateScene.isPending}
```

Render the dialog near `RoomSetupDialog`:

```jsx
      <ShareSceneDialog
        open={shareToken !== null}
        onOpenChange={(open) => { if (!open) setShareToken(null) }}
        token={shareToken}
      />
```

- [ ] **Step 8: Verify the whole planner + full suite**

Run: `npx vitest run src/pages/roomPlanner && npm run lint`
Expected: PASS, lint clean. Then run the full suite:
Run: `npx vitest run`
Expected: all green (≥ 419 + the new tests).

- [ ] **Step 9: Commit** (stage + hold)

```bash
git add src/features/roomPlanner/api.js src/features/roomPlanner/hooks.js src/pages/roomPlanner/ShareSceneDialog.jsx src/pages/roomPlanner/ShareSceneDialog.test.jsx src/pages/roomPlanner/PlannerToolbar.jsx src/pages/roomPlanner/RoomPlannerPage.jsx
git commit -m "feat(planner): share a saved room via a public link from the toolbar"
```

---

## Self-Review

**Spec coverage:**
- A0 floor-snap → Task 1. ✓
- A1 My Rooms (list/open/rename/delete, empty state, load-more, Account entry) → Task 2. ✓
- A2 Share (toolbar button, ensureSaved, dialog, copy, idempotent) → Task 5. ✓
- A3 Shared viewer (public route, read-only, mobile-allowed, 404, WebGL fallback) + `SceneStage` extraction → Tasks 3 & 4. ✓
- A4 routes (`account/rooms` protected, `shared/:token` public) → Tasks 2 & 4. ✓
- Testing per surface → each task ships tests; Task 5 ends on a full-suite run. ✓
- Non-goals (thumbnails, revoke, shared product list, duplicate) → untouched. ✓

**Placeholder scan:** No TBD/TODO; every code step shows real code; tests are concrete. Steps that depend on a component's exact prop shape (`Badge`, `Input`, `BecomingModal`) instruct the engineer to read the component and match rather than guess — not a placeholder, a guardrail.

**Type consistency:** `useScenes`/`useDeleteScene`/`useRenameScene` (Task 2), `useSharedScene`/`getSharedScene`/`SharedSceneCanvas({room,items})` (Task 4), `useShareScene`/`shareScene`/`ShareSceneDialog({open,onOpenChange,token})` (Task 5), and `SceneStage({room,orbitEnabled,children})` (Task 3) are used with the same names/shapes wherever consumed. `ModelErrorBoundary` is defined once (moved to `FurnitureModel.jsx`, Task 4) and imported by both `PlacedItem` and `SharedSceneCanvas`.
