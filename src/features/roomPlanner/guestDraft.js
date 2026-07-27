const STORAGE_KEY = 'nestify-room-draft-v1'
const TOKEN_SESSION_KEY = 'nestify-room-draft-token-v1'
const TOKEN_PATTERN = /^[A-Za-z0-9]{64}$/

export function editorStateToDraftSnapshot(state) {
  return {
    id: null,
    name: state.name,
    description: state.description ?? '',
    room_type: state.roomType ?? 'other',
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

export function readSessionRoomDraftToken() {
  const token = window.sessionStorage.getItem(TOKEN_SESSION_KEY)
  return TOKEN_PATTERN.test(token ?? '') ? token : null
}

export function rememberRoomDraftToken(token) {
  if (!TOKEN_PATTERN.test(token ?? '')) return false
  window.sessionStorage.setItem(TOKEN_SESSION_KEY, token)
  return true
}

export function clearRoomDraftToken() {
  window.sessionStorage.removeItem(TOKEN_SESSION_KEY)
}

export function roomDraftTokenFromHash(hash) {
  const token = new URLSearchParams((hash ?? '').replace(/^#/, '')).get('draft')
  return TOKEN_PATTERN.test(token ?? '') ? token : null
}

export function buildRoomDraftResumeUrl(token, origin = window.location.origin) {
  if (!TOKEN_PATTERN.test(token ?? '')) return null
  // Fragments are not sent to the API or in the HTTP Referer header.
  return `${origin}/room-planner#draft=${token}`
}
