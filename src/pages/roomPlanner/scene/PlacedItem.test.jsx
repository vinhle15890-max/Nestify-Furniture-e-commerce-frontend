import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { PlacedItem } from './PlacedItem'

// Mock R3F: <Canvas> children bỏ qua; primitive/mesh render như null.
vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => children }))
// FurnitureModel gọi onMeasure ngay khi mount (giả lập model đã đo xong).
vi.mock('./FurnitureModel', () => ({
  FurnitureModel: ({ onMeasure }) => {
    onMeasure?.({ x: 2, y: 1, z: 1.5 })
    return null
  },
  PlaceholderBox: () => null,
  ModelErrorBoundary: ({ children }) => children,
}))

const baseItem = {
  localId: 7,
  variant: { model_3d_url: 'sofa.glb' },
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  footprint: { x: 1, y: 1, z: 1 },
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
})
