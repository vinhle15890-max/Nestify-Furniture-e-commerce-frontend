import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from './editorStore'

const variant = { id: 12, sku: 'SOFA-RED', name: 'Đỏ', model_3d_url: 'a.glb', price: 100, thumbnail: null }

describe('roomPlanner/editorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
  })

  it('initNew sets the room and becomes ready', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    const s = useEditorStore.getState()
    expect(s.room).toEqual({ width: 4, depth: 5, height: 2.8 })
    expect(s.status).toBe('ready')
    expect(s.dirty).toBe(false)
  })

  it('addVariant appends, selects, and marks dirty', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const s = useEditorStore.getState()
    expect(s.items).toHaveLength(1)
    expect(s.items[0].position).toEqual({ x: 0, y: 0, z: 0 })
    expect(s.selectedId).toBe(s.items[0].localId)
    expect(s.dirty).toBe(true)
  })

  it('updateTransform clamps position into the room', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    useEditorStore.getState().updateTransform(id, { position: { x: 99, y: 0.5, z: -99 } })
    expect(useEditorStore.getState().items[0].position).toEqual({ x: 2, y: 0.5, z: -2 })
  })

  it('deleteSelected removes the selected item', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    useEditorStore.getState().deleteSelected()
    expect(useEditorStore.getState().items).toHaveLength(0)
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('resetSelectedTransform restores identity transform', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    useEditorStore.getState().updateTransform(id, { rotation: { x: 0, y: 1, z: 0 } })
    useEditorStore.getState().resetSelectedTransform()
    expect(useEditorStore.getState().items[0].rotation).toEqual({ x: 0, y: 0, z: 0 })
    expect(useEditorStore.getState().items[0].position).toEqual({ x: 0, y: 0, z: 0 })
    expect(useEditorStore.getState().items[0].scale).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('selectItem(null) clears the selection', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    useEditorStore.getState().selectItem(null)
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('setGizmoMode, setName, setRoom update state and dirty', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().setGizmoMode('rotate')
    expect(useEditorStore.getState().gizmoMode).toBe('rotate')
    useEditorStore.getState().setName('Phòng mới')
    expect(useEditorStore.getState().name).toBe('Phòng mới')
    expect(useEditorStore.getState().dirty).toBe(true)
    useEditorStore.getState().setRoom({ width: 3, depth: 3, height: 2.5 })
    expect(useEditorStore.getState().room).toEqual({ width: 3, depth: 3, height: 2.5 })
  })

  it('markSaved sets id and clears dirty', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    useEditorStore.getState().markSaved(42)
    expect(useEditorStore.getState().id).toBe(42)
    expect(useEditorStore.getState().dirty).toBe(false)
  })

  it('loadScene hydrates from a BE resource', () => {
    useEditorStore.getState().loadScene({
      id: 9, name: 'P', width: '3', depth: '3', height: '2.5',
      items: [{ id: 1, variant: { id: 5, sku: 'X', model_3d_url: 'x.glb' }, position: { x: '1', y: '0', z: '0' } }],
    })
    const s = useEditorStore.getState()
    expect(s.id).toBe(9)
    expect(s.items).toHaveLength(1)
    expect(s.dirty).toBe(false)
    expect(s.status).toBe('ready')
  })
})
