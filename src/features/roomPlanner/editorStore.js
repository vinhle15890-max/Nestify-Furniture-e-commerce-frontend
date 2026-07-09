import { create } from 'zustand'
import { sceneToEditorState } from './mappers'
import { makeLocalId, clampToRoom } from './threeD'

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
}

const HISTORY_CAP = 50
const snapshot = (items) => structuredClone(items)
// Push the current items onto the undo stack (capped) and drop any redo future.
const pushPast = (s) => ({ past: [...s.past, snapshot(s.items)].slice(-HISTORY_CAP), future: [] })

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
  past: [],
  future: [],
  snap: false,
}

export const useEditorStore = create((set) => ({
  ...emptyState,

  reset: () => set({ ...emptyState }),

  initNew: (room) => set({ ...emptyState, room, status: 'ready' }),

  loadScene: (resource) => set({ ...sceneToEditorState(resource), selectedId: null, gizmoMode: 'translate', dirty: false, status: 'ready', past: [], future: [] }),

  setName: (name) => set({ name, dirty: true }),

  // NOTE: does not re-clamp existing items; the next updateTransform re-clamps them to the new room.
  setRoom: (room) => set({ room, dirty: true }),

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

  selectItem: (localId) => set({ selectedId: localId }),

  setGizmoMode: (gizmoMode) => set({ gizmoMode }),

  toggleSnap: () => set((s) => ({ snap: !s.snap })),

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

  markSaved: (id) => set({ id, dirty: false }),
}))
