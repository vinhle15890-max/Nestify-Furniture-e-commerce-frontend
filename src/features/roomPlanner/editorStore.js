import { create } from 'zustand'
import { sceneToEditorState } from './mappers'
import { makeLocalId, clampToRoom } from './threeD'
import { clampRectToRoom, projectTransform, rotatedHalfExtents } from './collision'

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
}

// Footprint (kích thước thật) mặc định trước khi model được đo. KHÔNG gộp vào
// IDENTITY vì resetSelectedTransform spread IDENTITY — sẽ xoá footprint đã đo.
const DEFAULT_FOOTPRINT = { x: 1, y: 1, z: 1 }

const HISTORY_CAP = 50
const snapshot = (items) => structuredClone(items)
// Push the current items onto the undo stack (capped) and drop any redo future.
const pushPast = (s) => ({ past: [...s.past, snapshot(s.items)].slice(-HISTORY_CAP), future: [] })

const ROOM_MIN = 2
const ROOM_MAX = 30
const HEIGHT_MIN = 2
const HEIGHT_MAX = 5
const clampDim = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const clampObstacle = (obstacle, room) => {
  const radiusX = obstacle.type === 'door_swing' ? obstacle.width : obstacle.width / 2
  const radiusZ = obstacle.type === 'door_swing' ? obstacle.depth : obstacle.depth / 2
  const limitX = Math.max(0, room.width / 2 - radiusX)
  const limitZ = Math.max(0, room.depth / 2 - radiusZ)
  return { ...obstacle, x: clampDim(obstacle.x, -limitX, limitX), z: clampDim(obstacle.z, -limitZ, limitZ) }
}

const emptyState = {
  id: null,
  name: 'Phòng của tôi',
  description: '',
  roomType: 'other',
  room: { width: 0, depth: 0, height: 0, walls: { back: true, left: true, right: true } },
  items: [],
  obstacles: [],
  selectedId: null,
  selectedObstacleId: null,
  obstacleGizmoMode: 'translate',
  pendingPlacementId: null,
  gizmoMode: 'translate',
  editMode: 'furnish', // 'furnish' | 'room'
  viewMode: 'perspective', // 'perspective' | 'top'
  dirty: false,
  status: 'idle', // 'idle' | 'ready'
  past: [],
  future: [],
  snap: true,
  wallSnap: true,
  showScaleRef: false,
  scaleRefPos: { x: 0, z: 0 },
}

export const useEditorStore = create((set, get) => ({
  ...emptyState,

  reset: () => set({ ...emptyState }),

  initNew: (room, details = {}) => set({
    ...emptyState,
    name: details.name ?? emptyState.name,
    roomType: details.roomType ?? 'other',
    room: { ...room, walls: room.walls ?? { back: true, left: true, right: true } },
    status: 'ready',
  }),

  loadScene: (resource) => set({ ...sceneToEditorState(resource), selectedId: null, gizmoMode: 'translate', dirty: false, status: 'ready', past: [], future: [] }),

  setName: (name) => set({ name, dirty: true }),

  // NOTE: does not re-clamp existing items; the next updateTransform re-clamps them to the new room.
  setRoom: (room) => set({ room, dirty: true }),

  setEditMode: (editMode) => set({
    editMode,
    viewMode: editMode === 'room' ? 'top' : 'perspective',
    selectedObstacleId: editMode === 'room' ? get().selectedObstacleId : null,
  }),

  setViewMode: (viewMode) => set({
    viewMode: viewMode === 'top' ? 'top' : 'perspective',
    editMode: 'furnish',
  }),

  // Kéo đổi kích thước vỏ phòng. Kẹp min/max, RE-CLAMP mọi item vào phòng mới
  // (sửa bug cũ: setRoom không re-clamp → thu nhỏ phòng thì đồ lọt ra ngoài tường).
  // Room-shell edits (resize + walls) intentionally sit OUTSIDE undo history
  // (history is items-only) — do NOT add pushPast() back here.
  resizeRoom: (patch) => set((s) => {
    const room = {
      ...s.room,
      width:  'width'  in patch ? clampDim(patch.width,  ROOM_MIN, ROOM_MAX)   : s.room.width,
      depth:  'depth'  in patch ? clampDim(patch.depth,  ROOM_MIN, ROOM_MAX)   : s.room.depth,
      height: 'height' in patch ? clampDim(patch.height, HEIGHT_MIN, HEIGHT_MAX) : s.room.height,
    }
    const items = s.items.map((it) => {
      const he = rotatedHalfExtents(it.footprint, it.scale, it.rotation.y)
      return { ...it, position: clampRectToRoom(it.position, room, he) }
    })
    return { room, items, dirty: true }
  }),

  // Room-shell edit — intentionally NOT undoable (history is items-only); see note above resizeRoom.
  toggleWall: (side) => set((s) => ({
    room: { ...s.room, walls: { ...s.room.walls, [side]: !s.room.walls[side] } },
    dirty: true,
  })),

  addObstacle: (type) => set((s) => {
    const id = makeLocalId()
    return {
    obstacles: [...s.obstacles, {
      id, type, x: 0, z: 0,
      width: type === 'door_swing' ? 0.9 : 0.8,
      depth: type === 'door_swing' ? 0.9 : 0.8,
      rotation: 0,
    }],
    selectedObstacleId: id,
    dirty: true,
  }}),

  selectObstacle: (id) => set({ selectedObstacleId: id }),
  setObstacleGizmoMode: (mode) => set({ obstacleGizmoMode: mode === 'rotate' ? 'rotate' : 'translate' }),

  updateObstacle: (id, patch) => set((s) => ({
    obstacles: s.obstacles.map((obstacle) => obstacle.id === id ? clampObstacle({ ...obstacle, ...patch }, s.room) : obstacle),
    dirty: true,
  })),

  removeObstacle: (id) => set((s) => ({
    obstacles: s.obstacles.filter((obstacle) => obstacle.id !== id),
    selectedObstacleId: s.selectedObstacleId === id ? null : s.selectedObstacleId,
    dirty: true,
  })),

  addVariant: (variant, { provisional = false } = {}) => set((s) => {
    const item = { localId: makeLocalId(), variant, footprint: { ...DEFAULT_FOOTPRINT }, ...structuredClone(IDENTITY) }
    return { ...pushPast(s), items: [...s.items, item], selectedId: item.localId, pendingPlacementId: provisional ? item.localId : null, dirty: true }
  }),

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

  selectItem: (localId) => set({ selectedId: localId }),

  setGizmoMode: (gizmoMode) => set({ gizmoMode: gizmoMode === 'rotate' ? 'rotate' : 'translate' }),

  nudgeSelected: (delta) => set((s) => {
    const item = s.items.find((candidate) => candidate.localId === s.selectedId)
    if (!item) return {}
    const position = {
      x: item.position.x + (delta.x ?? 0),
      y: item.position.y,
      z: item.position.z + (delta.z ?? 0),
    }
    return {
      ...pushPast(s),
      dirty: true,
      items: s.items.map((candidate) => candidate.localId === item.localId
        ? { ...candidate, ...projectTransform(candidate, { position }, s.room, s.wallSnap) }
        : candidate),
    }
  }),

  rotateSelected: (radians) => set((s) => {
    const item = s.items.find((candidate) => candidate.localId === s.selectedId)
    if (!item) return {}
    const rotation = { ...item.rotation, y: item.rotation.y + radians }
    return {
      ...pushPast(s),
      dirty: true,
      items: s.items.map((candidate) => candidate.localId === item.localId
        ? { ...candidate, ...projectTransform(candidate, { rotation }, s.room, s.wallSnap) }
        : candidate),
    }
  }),

  confirmPlacement: () => set((s) => ({
    pendingPlacementId: null,
    selectedId: s.selectedId === s.pendingPlacementId ? null : s.selectedId,
  })),

  cancelPlacement: () => set((s) => {
    if (s.pendingPlacementId === null) return {}
    const pendingId = s.pendingPlacementId
    // Removing snapshots that contain the provisional item prevents Undo from
    // resurrecting a placement the customer explicitly cancelled.
    return {
      items: s.items.filter((item) => item.localId !== pendingId),
      past: s.past.filter((items) => !items.some((item) => item.localId === pendingId)),
      future: [],
      selectedId: null,
      pendingPlacementId: null,
      dirty: true,
    }
  }),

  toggleSnap: () => set((s) => ({ snap: !s.snap })),

  toggleWallSnap: () => set((s) => ({ wallSnap: !s.wallSnap })),

  // Mốc tỉ lệ = trạng thái xem (view aid): ephemeral, KHÔNG history/dirty/BE.
  toggleScaleRef: () => set((s) => ({ showScaleRef: !s.showScaleRef })),
  setScaleRefPos: (pos) => set((s) => {
    const c = clampToRoom({ x: pos.x, y: 0, z: pos.z }, s.room)
    return { scaleRefPos: { x: c.x, z: c.z } }
  }),

  // Ghi kích thước thật (đo từ GLB). KHÔNG vào undo history, KHÔNG set dirty —
  // đây là metadata dẫn xuất, không phải hành động người dùng. No-op nếu không đổi.
  reportFootprint: (localId, size) => {
    const s = get()
    const idx = s.items.findIndex((it) => it.localId === localId)
    if (idx === -1) return
    const cur = s.items[idx].footprint
    const near = (a, b) => Math.abs(a - b) < 1e-4
    if (near(cur.x, size.x) && near(cur.y, size.y) && near(cur.z, size.z)) return
    set((state) => {
      const items = state.items.slice()
      const measured = { ...items[idx], footprint: { x: size.x, y: size.y, z: size.z } }
      items[idx] = { ...measured, ...projectTransform(measured, {}, state.room, state.wallSnap) }
      return { items }
    })
  },

  updateTransform: (localId, patch) => set((s) => ({
    ...pushPast(s),
    dirty: true,
    items: s.items.map((it) => {
      if (it.localId !== localId) return it
      const allowedPatch = { ...patch }
      delete allowedPatch.scale
      return { ...it, ...projectTransform(it, allowedPatch, s.room, s.wallSnap) }
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

  removeItem: (localId) => set((s) => {
    if (!s.items.some((item) => item.localId === localId)) return {}
    return {
      ...pushPast(s),
      items: s.items.filter((item) => item.localId !== localId),
      selectedId: s.selectedId === localId ? null : s.selectedId,
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

  markSaved: (id, persistedItems = null) => set((s) => ({
    id,
    dirty: false,
    // The API recreates placements on update. Reconcile ids by the submitted
    // order while retaining local ids and undo history for cheap reversibility.
    items: persistedItems
      ? s.items.map((item, index) => ({ ...item, placementId: persistedItems[index]?.id ?? null }))
      : s.items,
  })),
}))
