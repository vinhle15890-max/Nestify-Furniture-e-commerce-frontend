import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoomCanvas } from './RoomCanvas'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Shallow the 3D layer: SceneStage/PlacedItem/RoomEditOverlay/ScaleReference
// all render three.js primitives that only make sense inside a real R3F
// canvas. RoomCanvas's job here is pure wiring — editMode → topDown → props —
// so stub each child as a marker that echoes the props we care about.
vi.mock('./SceneStage', () => ({
  SceneStage: ({ topDown, children }) => (
    <div data-testid="stage" data-topdown={String(topDown)}>{children}</div>
  ),
}))
vi.mock('./PlacedItem', () => ({
  PlacedItem: ({ item, interactive, onSelect }) => (
    <div data-testid={`item-${item.localId}`} data-interactive={String(interactive)} data-onselect={String(Boolean(onSelect))} />
  ),
}))
vi.mock('./RoomEditOverlay', () => ({
  RoomEditOverlay: () => <div data-testid="room-edit-overlay" />,
}))
vi.mock('./ScaleReference', () => ({
  ScaleReference: () => <div data-testid="scale-reference" />,
}))
vi.mock('../../../features/roomPlanner/canvasCapture', () => ({
  registerPlannerCanvas: vi.fn(),
  unregisterPlannerCanvas: vi.fn(),
}))

describe('RoomCanvas — chế độ "Chỉnh phòng" (topDown) gating', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
    useEditorStore.getState().initNew({ width: 4, depth: 4, height: 3, walls: { back: true, left: true, right: true } })
    useEditorStore.getState().addVariant({ id: 1, model_3d_url: 'sofa.glb' })
  })

  it('furnish mode: topDown=false, đồ tương tác được, không overlay', () => {
    useEditorStore.getState().setEditMode('furnish')
    render(<RoomCanvas />)

    expect(screen.getByTestId('stage')).toHaveAttribute('data-topdown', 'false')
    const itemId = useEditorStore.getState().items[0].localId
    expect(screen.getByTestId(`item-${itemId}`)).toHaveAttribute('data-interactive', 'true')
    expect(screen.getByTestId(`item-${itemId}`)).toHaveAttribute('data-onselect', 'true')
    expect(screen.queryByTestId('room-edit-overlay')).not.toBeInTheDocument()
  })

  it('room mode: topDown=true, đồ khoá tương tác, overlay render', () => {
    useEditorStore.getState().setEditMode('room')
    render(<RoomCanvas />)

    expect(screen.getByTestId('stage')).toHaveAttribute('data-topdown', 'true')
    const itemId = useEditorStore.getState().items[0].localId
    expect(screen.getByTestId(`item-${itemId}`)).toHaveAttribute('data-interactive', 'false')
    expect(screen.getByTestId(`item-${itemId}`)).toHaveAttribute('data-onselect', 'false')
    expect(screen.getByTestId('room-edit-overlay')).toBeInTheDocument()
  })
})
