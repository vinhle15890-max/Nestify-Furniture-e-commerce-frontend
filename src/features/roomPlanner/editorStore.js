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

export const useEditorStore = create((set) => ({
  ...emptyState,

  reset: () => set({ ...emptyState }),

  initNew: (room) => set({ ...emptyState, room, status: 'ready' }),

  loadScene: (resource) => set({ ...sceneToEditorState(resource), selectedId: null, gizmoMode: 'translate', dirty: false, status: 'ready' }),

  setName: (name) => set({ name, dirty: true }),

  // NOTE: does not re-clamp existing items; the next updateTransform re-clamps them to the new room.
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
      if ('position' in patch) next.position = clampToRoom(patch.position, s.room)
      if ('rotation' in patch) next.rotation = { ...patch.rotation }
      if ('scale' in patch) next.scale = { ...patch.scale }
      return next
    }),
  })),

  deleteSelected: () => set((s) => {
    if (s.selectedId === null) return {}
    return {
      items: s.items.filter((it) => it.localId !== s.selectedId),
      selectedId: null,
      dirty: true,
    }
  }),

  resetSelectedTransform: () => set((s) => ({
    dirty: true,
    items: s.items.map((it) => (it.localId === s.selectedId ? { ...it, ...structuredClone(IDENTITY) } : it)),
  })),

  markSaved: (id) => set({ id, dirty: false }),
}))
