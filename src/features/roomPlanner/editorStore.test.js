import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEditorStore } from './editorStore'

const variant = { id: 12, sku: 'SOFA-RED', name: 'Đỏ', model_3d_url: 'a.glb', price: 100, thumbnail: null }

describe('roomPlanner/editorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
  })

  it('initNew sets the room and becomes ready', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    const s = useEditorStore.getState()
    expect(s.room).toEqual({ width: 4, depth: 5, height: 2.8, walls: { back: true, left: true, right: true } })
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
    expect(s.items[0].scale).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('removes a placement through the same reversible history as canvas deletion', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const localId = useEditorStore.getState().items[0].localId

    useEditorStore.getState().removeItem(localId)
    expect(useEditorStore.getState().items).toHaveLength(0)
    expect(useEditorStore.getState().dirty).toBe(true)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().items).toHaveLength(1)
  })

  it('rejects scale gizmo mode and ignores scale transform patches', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId

    useEditorStore.getState().setGizmoMode('scale')
    useEditorStore.getState().updateTransform(id, { scale: { x: 2, y: 2, z: 2 } })

    expect(useEditorStore.getState().gizmoMode).toBe('translate')
    expect(useEditorStore.getState().items[0].scale).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('updateTransform kẹp position theo kích thước — cạnh món không xuyên tường', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    // footprint mặc định 1×1 → nửa 0.5 → tâm bị kẹp ở ±(2 - 0.5) = ±1.5
    useEditorStore.getState().updateTransform(id, { position: { x: 99, y: 0.5, z: -99 } })
    expect(useEditorStore.getState().items[0].position).toEqual({ x: 1.5, y: 0, z: -1.5 })
  })

  it('addVariant khởi tạo footprint mặc định {1,1,1}', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    expect(useEditorStore.getState().items[0].footprint).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('reportFootprint cập nhật footprint mà KHÔNG đụng history/dirty', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    const pastBefore = useEditorStore.getState().past.length
    useEditorStore.setState({ dirty: false })
    useEditorStore.getState().reportFootprint(id, { x: 2, y: 0.8, z: 1.5 })
    const s = useEditorStore.getState()
    expect(s.items[0].footprint).toEqual({ x: 2, y: 0.8, z: 1.5 })
    expect(s.past.length).toBe(pastBefore)
    expect(s.dirty).toBe(false)
  })

  it('reportFootprint no-op khi size không đổi (không tạo mảng mới)', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    const itemsRef = useEditorStore.getState().items
    useEditorStore.getState().reportFootprint(id, { x: 1, y: 1, z: 1 })
    expect(useEditorStore.getState().items).toBe(itemsRef)
  })

  it('reportFootprint notifies subscribers only for the first genuine size change', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    const subscriber = vi.fn()
    const unsubscribe = useEditorStore.subscribe(subscriber)

    try {
      useEditorStore.getState().reportFootprint(id, { x: 2, y: 0.8, z: 1.5 })
      useEditorStore.getState().reportFootprint(id, { x: 2, y: 0.8, z: 1.5 })
      expect(subscriber).toHaveBeenCalledOnce()
    } finally {
      unsubscribe()
    }
  })

  it('kẹp size-aware — sofa rộng 2m không xuyên tường phòng 4m', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    useEditorStore.getState().reportFootprint(id, { x: 2, y: 1, z: 1 }) // nửa 1m
    useEditorStore.getState().updateTransform(id, { position: { x: 10, y: 0, z: 0 } })
    expect(useEditorStore.getState().items[0].position.x).toBeCloseTo(1) // 2 - 1
  })

  it('rotation-only patch near a wall re-clamps with the rotated footprint', () => {
    const g = () => useEditorStore.getState()
    g().initNew({ width: 4, depth: 4, height: 2.8 })
    g().addVariant(variant)
    const id = g().selectedId
    g().reportFootprint(id, { x: 1, y: 1, z: 3 })
    g().updateTransform(id, { position: { x: 1.4, y: 0, z: 0 } })
    g().updateTransform(id, { rotation: { x: 0, y: Math.PI / 2, z: 0 } })
    expect(g().items[0].position.x).toBeCloseTo(0.5)
    expect(g().items[0].position.y).toBe(0)
  })

  it('one committed gesture creates one history entry and undo restores the prior valid transform', () => {
    const g = () => useEditorStore.getState()
    g().initNew({ width: 4, depth: 4, height: 2.8 })
    g().addVariant(variant)
    const id = g().selectedId
    const before = g().past.length
    g().updateTransform(id, { position: { x: 99, y: 6, z: 0 } })
    expect(g().past.length).toBe(before + 1)
    expect(g().items[0].position).toEqual({ x: 1.5, y: 0, z: 0 })
    g().undo()
    expect(g().items[0].position).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('toggleWallSnap / toggleScaleRef lật cờ', () => {
    const g = () => useEditorStore.getState()
    g().initNew({ width: 4, depth: 4, height: 2.8 })
    expect(g().wallSnap).toBe(true)
    g().toggleWallSnap()
    expect(g().wallSnap).toBe(false)
    expect(g().showScaleRef).toBe(false)
    g().toggleScaleRef()
    expect(g().showScaleRef).toBe(true)
  })

  it('setScaleRefPos kẹp trong phòng, không đụng history/dirty', () => {
    const g = () => useEditorStore.getState()
    g().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.setState({ dirty: false })
    const pastBefore = g().past.length
    g().setScaleRefPos({ x: 99, z: -99 })
    expect(g().scaleRefPos).toEqual({ x: 2, z: -2 })
    expect(g().past.length).toBe(pastBefore)
    expect(g().dirty).toBe(false)
  })

  it('updateTransform hút tường khi wallSnap bật', () => {
    const g = () => useEditorStore.getState()
    g().initNew({ width: 4, depth: 4, height: 2.8 })
    g().addVariant({ id: 1, model_3d_url: null }) // footprint 1×1 → nửa 0.5, flush ±1.5
    const id = g().items[0].localId
    g().updateTransform(id, { position: { x: 1.42, y: 0, z: 0 } }) // cách flush 0.08 < 0.2
    expect(g().items[0].position.x).toBeCloseTo(1.5)
  })

  it('updateTransform KHÔNG hút khi wallSnap tắt', () => {
    const g = () => useEditorStore.getState()
    g().initNew({ width: 4, depth: 4, height: 2.8 })
    g().addVariant({ id: 1, model_3d_url: null })
    const id = g().items[0].localId
    g().toggleWallSnap()
    g().updateTransform(id, { position: { x: 1.42, y: 0, z: 0 } })
    expect(g().items[0].position.x).toBeCloseTo(1.42)
  })

  it('resetSelectedTransform KHÔNG xoá footprint đã đo', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().addVariant(variant)
    const id = useEditorStore.getState().items[0].localId
    useEditorStore.getState().reportFootprint(id, { x: 2, y: 0.8, z: 1.5 })
    useEditorStore.getState().updateTransform(id, { scale: { x: 3, y: 3, z: 3 } })
    useEditorStore.getState().resetSelectedTransform()
    const item = useEditorStore.getState().items[0]
    expect(item.scale).toEqual({ x: 1, y: 1, z: 1 }) // transform reset
    expect(item.footprint).toEqual({ x: 2, y: 0.8, z: 1.5 }) // footprint giữ nguyên
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

  it('undo/redo step through add and transform', () => {
    const store = () => useEditorStore.getState()
    store().initNew({ width: 4, depth: 4, height: 2.8 })
    store().addVariant(variant)
    const id = store().items[0].localId
    store().updateTransform(id, { position: { x: 1, y: 0, z: 1 } })
    expect(store().items[0].position).toEqual({ x: 1, y: 0, z: 1 })

    store().undo() // undo the transform
    expect(store().items[0].position).toEqual({ x: 0, y: 0, z: 0 })
    store().undo() // undo the add
    expect(store().items).toHaveLength(0)

    store().redo() // redo the add
    expect(store().items).toHaveLength(1)
    store().redo() // redo the transform
    expect(store().items[0].position).toEqual({ x: 1, y: 0, z: 1 })
  })

  it('undo/redo are no-ops at the ends of history', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    expect(() => { useEditorStore.getState().undo(); useEditorStore.getState().redo() }).not.toThrow()
    expect(useEditorStore.getState().items).toHaveLength(0)
  })

  it('duplicateSelected clones with an offset, clamps, and selects the clone', () => {
    const store = () => useEditorStore.getState()
    store().initNew({ width: 4, depth: 4, height: 2.8 })
    store().addVariant(variant) // at origin
    store().duplicateSelected()
    const s = store()
    expect(s.items).toHaveLength(2)
    expect(s.items[1].position).toEqual({ x: 0.3, y: 0, z: 0.3 })
    expect(s.selectedId).toBe(s.items[1].localId)
    expect(s.items[1].variant.id).toBe(variant.id)
  })

  it('duplicateSelected is a no-op when nothing is selected', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    useEditorStore.getState().selectItem(null)
    useEditorStore.getState().duplicateSelected()
    expect(useEditorStore.getState().items).toHaveLength(0)
  })

  it('loadScene and reset clear undo history', () => {
    const store = () => useEditorStore.getState()
    store().initNew({ width: 4, depth: 4, height: 2.8 })
    store().addVariant(variant)
    expect(store().past.length).toBeGreaterThan(0)
    store().loadScene({ id: 1, name: 'P', width: '3', depth: '3', height: '2.5', items: [] })
    expect(store().past).toEqual([])
    expect(store().future).toEqual([])
  })

  it('toggleSnap flips the snap flag without touching history', () => {
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 2.8 })
    expect(useEditorStore.getState().snap).toBe(true)
    useEditorStore.getState().toggleSnap()
    expect(useEditorStore.getState().snap).toBe(false)
    expect(useEditorStore.getState().past).toEqual([])
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

describe('vỏ phòng: resizeRoom / toggleWall / editMode', () => {
  const baseRoom = { width: 4, depth: 5, height: 3, walls: { back: true, left: true, right: true } }

  it('resizeRoom kẹp width/depth [2,30] và height [2,5]', () => {
    useEditorStore.getState().initNew(baseRoom)
    useEditorStore.getState().resizeRoom({ width: 100, depth: 0.5, height: 99 })
    const r = useEditorStore.getState().room
    expect(r.width).toBe(30)
    expect(r.depth).toBe(2)
    expect(r.height).toBe(5)
    expect(useEditorStore.getState().dirty).toBe(true)
  })

  it('resizeRoom re-clamp item ra ngoài khi thu nhỏ phòng', () => {
    useEditorStore.getState().initNew({ ...baseRoom, width: 20, depth: 20 })
    useEditorStore.getState().addVariant({ id: 1, sku: 'A' })
    const id = useEditorStore.getState().selectedId
    // đẩy item ra mép phòng lớn
    useEditorStore.getState().updateTransform(id, { position: { x: 9, y: 0, z: 0 } })
    // thu nhỏ phòng → item phải bị kéo vào trong nửa-rộng mới (2/2 - halfExtent)
    useEditorStore.getState().resizeRoom({ width: 4, depth: 4 })
    const item = useEditorStore.getState().items[0]
    expect(Math.abs(item.position.x)).toBeLessThanOrEqual(2) // trong nửa rộng 4/2
  })

  it('toggleWall lật đúng side + dirty', () => {
    useEditorStore.getState().initNew(baseRoom)
    useEditorStore.getState().toggleWall('left')
    expect(useEditorStore.getState().room.walls.left).toBe(false)
    expect(useEditorStore.getState().dirty).toBe(true)
    useEditorStore.getState().toggleWall('left')
    expect(useEditorStore.getState().room.walls.left).toBe(true)
  })

  it('setEditMode đổi mode, KHÔNG set dirty', () => {
    useEditorStore.getState().initNew(baseRoom)
    useEditorStore.getState().setEditMode('room')
    expect(useEditorStore.getState().editMode).toBe('room')
    expect(useEditorStore.getState().dirty).toBe(false)
  })

  it('resizeRoom KHÔNG đẩy history — undo sau đó là no-op, room giữ nguyên kích thước mới', () => {
    useEditorStore.getState().initNew(baseRoom)
    const pastBefore = useEditorStore.getState().past.length
    useEditorStore.getState().resizeRoom({ width: 8 })
    expect(useEditorStore.getState().past.length).toBe(pastBefore) // no phantom snapshot
    useEditorStore.getState().undo() // no-op: no history was pushed by resizeRoom
    expect(useEditorStore.getState().room.width).toBe(8) // resize is NOT undoable
  })

  it('toggleWall KHÔNG đẩy history và KHÔNG xoá redo future đang có', () => {
    const store = () => useEditorStore.getState()
    store().initNew(baseRoom)
    store().addVariant({ id: 1, sku: 'A' })
    const id = store().selectedId
    store().updateTransform(id, { position: { x: 1, y: 0, z: 0 } })
    store().undo() // creates a redo future
    expect(store().future.length).toBeGreaterThan(0)
    const pastBefore = store().past.length

    store().toggleWall('left')

    expect(store().past.length).toBe(pastBefore) // no phantom snapshot
    expect(store().future.length).toBeGreaterThan(0) // redo history preserved, not cleared
    expect(store().room.walls.left).toBe(false)
  })
})
