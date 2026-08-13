import { makeLocalId } from './threeD'
import { initialFootprint } from './dimensions'

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
    roomType: r.room_type ?? 'other',
    room: {
      width: num(r.width),
      depth: num(r.depth),
      height: num(r.height),
      walls: {
        back:  r.wall_back  ?? true,
        left:  r.wall_left  ?? true,
        right: r.wall_right ?? true,
      },
    },
    obstacles: (r.obstacles ?? []).map((obstacle) => ({
      id: String(obstacle.id),
      // Legacy column/cutout records had the same interaction and collision as
      // restricted zones. Collapse them at the boundary instead of exposing
      // three names for one capability.
      type: obstacle.type === 'door_swing' ? 'door_swing' : 'restricted',
      x: num(obstacle.x),
      z: num(obstacle.z),
      width: num(obstacle.width, 0.8),
      depth: num(obstacle.depth, 0.8),
      rotation: num(obstacle.rotation),
    })),
    items: (r.items ?? []).map((item) => ({
      localId: makeLocalId(),
      placementId: item.id ?? null,
      variant: {
        id: item.variant?.id ?? null,
        sku: item.variant?.sku ?? '',
        // RoomSceneItemResource omits name/price/thumbnail — fall back to sku.
        name: item.variant?.name ?? item.variant?.sku ?? '',
        model_3d_url: item.variant?.model_3d_url ?? null,
        model_scale_confirmed: item.variant?.model_scale_confirmed === true,
        width_cm: item.variant?.width_cm ?? null,
        height_cm: item.variant?.height_cm ?? null,
        depth_cm: item.variant?.depth_cm ?? null,
        model_size: item.variant?.model_size ?? null,
        price: item.variant?.price ?? null,
        thumbnail: item.variant?.thumbnail ?? null,
        product_slug: item.variant?.product_slug ?? null,
        product_name: item.variant?.product_name ?? null,
      },
      position: vec3(item.position, 0),
      rotation: vec3(item.rotation, 0),
      scale: vec3(item.scale, 1),
      ...initialFootprint(item.variant), // GLB runtime vẫn đo lại để đối chiếu
    })),
  }
}

// Editor state → POST/PATCH /room-scenes payload.
export function editorStateToPayload(state) {
  return {
    name: state.name,
    description: state.description ?? '',
    room_type: state.roomType ?? 'other',
    width: state.room.width,
    depth: state.room.depth,
    height: state.room.height,
    wall_back:  state.room.walls?.back  ?? true,
    wall_left:  state.room.walls?.left  ?? true,
    wall_right: state.room.walls?.right ?? true,
    obstacles: state.obstacles ?? [],
    items: state.items.map((item) => ({
      variant_id: item.variant.id,
      position: { ...item.position },
      rotation: { ...item.rotation },
      scale: { ...item.scale },
    })),
  }
}
