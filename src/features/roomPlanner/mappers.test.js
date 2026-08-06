import { describe, it, expect } from 'vitest'
import { sceneToEditorState, editorStateToPayload } from './mappers'

const resource = {
  id: 7,
  name: 'Phòng khách',
  description: 'Bản nháp',
  width: '4.00',
  depth: '5.00',
  height: '2.80',
  items: [
    {
      id: 1,
      variant: { id: 12, sku: 'SOFA-RED', model_3d_url: 'https://x/m.glb' },
      position: { x: '1.0000', y: '0.0000', z: '2.0000' },
      rotation: { x: '0', y: '1.57', z: '0' },
      scale: { x: '1', y: '1', z: '1' },
    },
  ],
}

describe('roomPlanner/mappers', () => {
  it('sceneToEditorState parses numbers and falls back name to sku', () => {
    const state = sceneToEditorState(resource)
    expect(state.id).toBe(7)
    expect(state.room).toEqual({ width: 4, depth: 5, height: 2.8, walls: { back: true, left: true, right: true } })
    expect(state.items).toHaveLength(1)
    const item = state.items[0]
    expect(item.variant).toMatchObject({ id: 12, sku: 'SOFA-RED', name: 'SOFA-RED', model_3d_url: 'https://x/m.glb' })
    expect(item.position).toEqual({ x: 1, y: 0, z: 2 })
    expect(item.rotation).toEqual({ x: 0, y: 1.57, z: 0 })
    expect(typeof item.localId).toBe('number')
  })

  it('editorStateToPayload emits the BE item shape', () => {
    const state = sceneToEditorState(resource)
    const payload = editorStateToPayload(state)
    expect(payload).toEqual({
      name: 'Phòng khách',
      description: 'Bản nháp',
      room_type: 'other',
      width: 4,
      depth: 5,
      height: 2.8,
      wall_back: true,
      wall_left: true,
      wall_right: true,
      obstacles: [],
      items: [
        {
          variant_id: 12,
          position: { x: 1, y: 0, z: 2 },
          rotation: { x: 0, y: 1.57, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      ],
    })
  })

  it('sceneToEditorState tolerates a null/empty resource', () => {
    const state = sceneToEditorState(null)
    expect(state.id).toBeNull()
    expect(state.items).toEqual([])
  })

  it('tolerates an item with a missing variant', () => {
    const state = sceneToEditorState({ id: 1, width: '3', depth: '3', height: '2.5', items: [{ id: 9, variant: null, position: { x: '0', y: '0', z: '0' } }] })
    expect(state.items).toHaveLength(1)
    expect(state.items[0].variant.id).toBeNull()
  })

  it('giữ product_slug/product_name của variant', () => {
    const state = sceneToEditorState({
      id: 1, width: '4', depth: '4', height: '3',
      items: [{ variant: { id: 9, sku: 'S', name: 'Đỏ', product_slug: 'ghe-sofa', product_name: 'Ghế Sofa' }, position: {}, rotation: {}, scale: {} }],
    })
    expect(state.items[0].variant.product_slug).toBe('ghe-sofa')
    expect(state.items[0].variant.product_name).toBe('Ghế Sofa')
  })

  it('fallback null khi thiếu slug/name', () => {
    const state = sceneToEditorState({ id: 1, width: '4', depth: '4', height: '3', items: [{ variant: { id: 9 }, position: {}, rotation: {}, scale: {} }] })
    expect(state.items[0].variant.product_slug).toBeNull()
    expect(state.items[0].variant.product_name).toBeNull()
  })

  it('sceneToEditorState đọc walls, fallback true khi thiếu', () => {
    const a = sceneToEditorState({ width: 4, depth: 5, height: 3, wall_left: false })
    expect(a.room.walls).toEqual({ back: true, left: false, right: true })
    const b = sceneToEditorState({ width: 4, depth: 5, height: 3 }) // scene cũ trước migration
    expect(b.room.walls).toEqual({ back: true, left: true, right: true })
  })

  it('editorStateToPayload gửi wall_back/left/right', () => {
    const payload = editorStateToPayload({
      name: 'P', description: '',
      room: { width: 4, depth: 5, height: 3, walls: { back: true, left: false, right: true } },
      items: [],
    })
    expect(payload.wall_back).toBe(true)
    expect(payload.wall_left).toBe(false)
    expect(payload.wall_right).toBe(true)
  })

  it('round-trip danh sách vùng cản', () => {
    const obstacle = { id: 'door-1', type: 'door_swing', x: 1, z: -1, width: 0.9, depth: 0.9, rotation: 1.57 }
    const state = sceneToEditorState({ width: 4, depth: 5, height: 3, obstacles: [obstacle] })
    expect(state.obstacles).toEqual([obstacle])
    expect(editorStateToPayload({ name: 'P', room: state.room, obstacles: state.obstacles, items: [] }).obstacles).toEqual([obstacle])
  })
})
