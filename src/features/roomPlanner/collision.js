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
  const ax = { x: c, z: s } // trục +x cục bộ trong world
  const az = { x: -s, z: c } // trục +z cục bộ trong world
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

// Khoảng hút nam châm = khe cạnh–tường tối đa để món nhảy áp sát tường. Phải đủ
// LỚN để cảm nhận được: clamp đã pin món sát tường khi kéo hết cỡ, nên nếu ngưỡng
// quá nhỏ (vd 0.2m) thì "bắt tường" gần như trùng clamp và nhìn như không hoạt động.
export const WALL_SNAP_THRESHOLD = 0.5

// Hút cạnh món áp sát tường khi cạnh cách tường < threshold. Mỗi trục độc lập.
// Gọi SAU clampRectToRoom (đã nằm trong phòng). y giữ nguyên.
export function snapToWalls(position, room, halfExtents, threshold) {
  const snapAxis = (v, half, he) => {
    const flush = half - he // tường phía dương
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

// Projects a candidate transform onto the nearest valid floor transform. This
// is shared by the live Three object and the persisted editor store so neither
// can represent a different validity rule.
export function projectTransform(item, patch, room, wallSnap = false) {
  const rotation = patch.rotation ? { ...patch.rotation } : { ...item.rotation }
  const scale = patch.scale ? { ...patch.scale } : { ...item.scale }
  const candidate = patch.position ? { ...patch.position } : { ...item.position }
  const halfExtents = rotatedHalfExtents(item.footprint, scale, rotation.y)
  let position = clampRectToRoom({ ...candidate, y: 0 }, room, halfExtents)
  if (wallSnap) position = snapToWalls(position, room, halfExtents, WALL_SNAP_THRESHOLD)
  position.y = 0
  return { position, rotation, scale }
}
