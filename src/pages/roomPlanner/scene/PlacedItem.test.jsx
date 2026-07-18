import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { Euler, Vector3 } from 'three'
import { PlacedItem } from './PlacedItem'

vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => children }))
let controlsProps
const fakeTcInstance = { positionStart: new Vector3() }
vi.mock('@react-three/drei', () => {
  const React = require('react')
  const MockTransformControls = React.forwardRef((props, ref) => {
    controlsProps = props
    if (ref && typeof ref === 'object') ref.current = fakeTcInstance
    return props.children
  })
  MockTransformControls.displayName = 'MockTransformControls'
  return { TransformControls: MockTransformControls }
})
// FurnitureModel gọi onMeasure ngay khi mount (giả lập model đã đo xong).
vi.mock('./FurnitureModel', () => ({
  MODEL_STATE: { NO_MODEL: 'NO_MODEL', LOADING: 'LOADING', READY: 'READY', LOAD_FAILED: 'LOAD_FAILED' },
  FurnitureModelRuntime: ({ url, onMeasure, onStateChange }) => {
    if (!url) {
      onStateChange?.('NO_MODEL')
      return <span data-model-state="NO_MODEL" />
    }
    onMeasure?.({ x: 2, y: 1, z: 1.5 })
    onStateChange?.('READY')
    return <span data-model-state="READY" />
  },
}))

beforeEach(() => {
  fakeTcInstance.positionStart.set(0, 0, 0)
})

const baseItem = {
  localId: 7,
  variant: { model_3d_url: 'sofa.glb' },
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  footprint: { x: 1, y: 1, z: 1 },
}
const baseProps = {
  selected: false,
  gizmoMode: 'translate',
  snap: false,
  wallSnap: false,
  conflict: false,
  onSelect: () => {},
  onTransform: () => {},
  onDragChange: () => {},
  onMeasure: () => {},
}

describe('PlacedItem đo footprint', () => {
  it('chuyển size từ FurnitureModel ra onMeasure', () => {
    const onMeasure = vi.fn()
    render(
      <PlacedItem
        item={baseItem}
        selected={false}
        gizmoMode="translate"
        snap={false}
        conflict={false}
        onSelect={() => {}}
        onTransform={() => {}}
        onDragChange={() => {}}
        onMeasure={onMeasure}
      />,
    )
    expect(onMeasure).toHaveBeenCalledWith({ x: 2, y: 1, z: 1.5 })
  })

  it('món placeholder (không có model_3d_url) không gọi onMeasure', () => {
    const onMeasure = vi.fn()
    render(
      <PlacedItem
        item={{ ...baseItem, variant: { model_3d_url: null } }}
        selected={false}
        gizmoMode="translate"
        snap={false}
        conflict={false}
        onSelect={() => {}}
        onTransform={() => {}}
        onDragChange={() => {}}
        onMeasure={onMeasure}
      />,
    )
    expect(onMeasure).not.toHaveBeenCalled()
  })

  it('exposes missing and successful model states explicitly', () => {
    const states = []
    const { rerender, container } = render(
      <PlacedItem {...baseProps} item={{ ...baseItem, variant: { model_3d_url: null } }} onModelStateChange={(state) => states.push(state)} />,
    )
    expect(container.querySelector('[data-model-state="NO_MODEL"]')).toBeInTheDocument()
    rerender(<PlacedItem {...baseProps} item={baseItem} onModelStateChange={(state) => states.push(state)} />)
    expect(container.querySelector('[data-model-state="READY"]')).toBeInTheDocument()
    expect(states).toEqual(expect.arrayContaining(['NO_MODEL', 'READY']))
  })
})

describe('PlacedItem live valid-position projection', () => {
  it('disables the Y handle and projects every live object change before one final commit', () => {
    const onTransform = vi.fn()
    render(
      <PlacedItem
        item={baseItem}
        room={{ width: 4, depth: 4, height: 3 }}
        selected
        gizmoMode="translate"
        snap={false}
        wallSnap={false}
        conflict={false}
        onSelect={() => {}}
        onTransform={onTransform}
        onDragChange={() => {}}
        onMeasure={() => {}}
      />,
    )
    expect(controlsProps.showY).toBe(false)
    const node = controlsProps.object.current
    node.position = new Vector3(50, 7, -50)
    node.rotation = new Euler(0, 0, 0)
    node.scale = new Vector3(1, 1, 1)
    const position = node.position
    const rotation = node.rotation
    const scale = node.scale
    act(() => controlsProps.onObjectChange())
    expect(node.position).toBe(position)
    expect(node.rotation).toBe(rotation)
    expect(node.scale).toBe(scale)
    expect(node.position).toMatchObject({ x: 1.5, y: 0, z: -1.5 })
    expect(onTransform).not.toHaveBeenCalled()
    act(() => controlsProps.onMouseUp())
    expect(onTransform).toHaveBeenCalledOnce()
    expect(onTransform.mock.calls[0][1].position).toEqual({ x: 1.5, y: 0, z: -1.5 })
    expect(onTransform.mock.calls[0][1]).not.toHaveProperty('scale')
  })

  it('normalizes a stale scale gizmo value before it reaches TransformControls', () => {
    render(
      <PlacedItem
        item={baseItem}
        room={{ width: 4, depth: 4, height: 3 }}
        selected
        gizmoMode="scale"
        snap={false}
        wallSnap={false}
        conflict={false}
        onSelect={() => {}}
        onTransform={() => {}}
        onDragChange={() => {}}
        onMeasure={() => {}}
      />,
    )

    expect(controlsProps.mode).toBe('translate')
    expect(controlsProps.scaleSnap).toBeUndefined()
  })
})

describe('PlacedItem gizmo-object desync fix (P0-1)', () => {
  it('shifts positionStart by the clamp delta so the gizmo anchor tracks the clamped position', () => {
    render(
      <PlacedItem
        item={baseItem}
        room={{ width: 4, depth: 4, height: 3 }}
        selected
        gizmoMode="translate"
        snap={false}
        wallSnap={false}
        conflict={false}
        onSelect={() => {}}
        onTransform={() => {}}
        onDragChange={() => {}}
        onMeasure={() => {}}
      />,
    )
    const node = controlsProps.object.current
    fakeTcInstance.positionStart.set(0, 0, 0)
    node.position = new Vector3(50, 7, -50)
    node.rotation = new Euler(0, 0, 0)
    node.scale = new Vector3(1, 1, 1)
    act(() => controlsProps.onObjectChange())
    expect(node.position).toMatchObject({ x: 1.5, y: 0, z: -1.5 })
    const dx = 1.5 - 50
    const dy = 0 - 7
    const dz = -1.5 - (-50)
    expect(fakeTcInstance.positionStart.x).toBeCloseTo(dx, 5)
    expect(fakeTcInstance.positionStart.y).toBeCloseTo(dy, 5)
    expect(fakeTcInstance.positionStart.z).toBeCloseTo(dz, 5)
  })

  it('does not adjust positionStart when no clamping occurs', () => {
    render(
      <PlacedItem
        item={baseItem}
        room={{ width: 4, depth: 4, height: 3 }}
        selected
        gizmoMode="translate"
        snap={false}
        wallSnap={false}
        conflict={false}
        onSelect={() => {}}
        onTransform={() => {}}
        onDragChange={() => {}}
        onMeasure={() => {}}
      />,
    )
    const node = controlsProps.object.current
    fakeTcInstance.positionStart.set(0, 0, 0)
    node.position = new Vector3(0.5, 0, -0.5)
    node.rotation = new Euler(0, 0, 0)
    node.scale = new Vector3(1, 1, 1)
    act(() => controlsProps.onObjectChange())
    expect(fakeTcInstance.positionStart.x).toBe(0)
    expect(fakeTcInstance.positionStart.y).toBe(0)
    expect(fakeTcInstance.positionStart.z).toBe(0)
  })

  it('accumulates positionStart corrections across consecutive boundary drags', () => {
    render(
      <PlacedItem
        item={baseItem}
        room={{ width: 4, depth: 4, height: 3 }}
        selected
        gizmoMode="translate"
        snap={false}
        wallSnap={false}
        conflict={false}
        onSelect={() => {}}
        onTransform={() => {}}
        onDragChange={() => {}}
        onMeasure={() => {}}
      />,
    )
    const node = controlsProps.object.current
    fakeTcInstance.positionStart.set(0, 0, 0)
    node.position = new Vector3(3, 0, -3)
    node.rotation = new Euler(0, 0, 0)
    node.scale = new Vector3(1, 1, 1)
    act(() => controlsProps.onObjectChange())
    expect(node.position).toMatchObject({ x: 1.5, y: 0, z: -1.5 })
    const firstDx = 1.5 - 3
    const firstDz = -1.5 - (-3)
    expect(fakeTcInstance.positionStart.x).toBeCloseTo(firstDx, 5)
    expect(fakeTcInstance.positionStart.z).toBeCloseTo(firstDz, 5)
    node.position = new Vector3(4, 0, -4)
    act(() => controlsProps.onObjectChange())
    expect(node.position).toMatchObject({ x: 1.5, y: 0, z: -1.5 })
    const secondDx = 1.5 - 4
    const secondDz = -1.5 - (-4)
    expect(fakeTcInstance.positionStart.x).toBeCloseTo(firstDx + secondDx, 5)
    expect(fakeTcInstance.positionStart.z).toBeCloseTo(firstDz + secondDz, 5)
  })
})
