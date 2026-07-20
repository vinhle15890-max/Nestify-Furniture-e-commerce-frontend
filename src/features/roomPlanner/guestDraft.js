const STORAGE_KEY = 'nestify-room-draft-v1'

export function editorStateToDraftSnapshot(state) {
  return {
    id: null,
    name: state.name,
    description: state.description ?? '',
    width: state.room.width,
    depth: state.room.depth,
    height: state.room.height,
    wall_back: state.room.walls?.back ?? true,
    wall_left: state.room.walls?.left ?? true,
    wall_right: state.room.walls?.right ?? true,
    items: state.items.map((item) => ({
      variant: item.variant,
      position: item.position,
      rotation: item.rotation,
      scale: item.scale,
    })),
  }
}

export function readLocalRoomDraft() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    return value?.version === 1 ? value.scene : null
  } catch {
    return null
  }
}

export function writeLocalRoomDraft(scene) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, scene, savedAt: new Date().toISOString() }))
}

export function clearLocalRoomDraft() {
  window.localStorage.removeItem(STORAGE_KEY)
}
