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
        id: item.variant?.id ?? null,
        sku: item.variant?.sku ?? '',
        // RoomSceneItemResource omits name/price/thumbnail — fall back to sku.
        name: item.variant?.name ?? item.variant?.sku ?? '',
        model_3d_url: item.variant?.model_3d_url ?? null,
        price: item.variant?.price ?? null,
        thumbnail: item.variant?.thumbnail ?? null,
        product_slug: item.variant?.product_slug ?? null,
        product_name: item.variant?.product_name ?? null,
      },
      position: vec3(item.position, 0),
      rotation: vec3(item.rotation, 0),
      scale: vec3(item.scale, 1),
      footprint: { x: 1, y: 1, z: 1 }, // đo lại từ GLB khi render
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
