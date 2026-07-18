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

// Given a bounding box, the y-translation that puts the model's base at local
// y=0 so a group at y=0 rests on the floor (fixes centred-origin models sinking).
export function baseOffset(box) {
  const minY = box?.min?.y
  return Number.isFinite(minY) ? -minY : 0
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
