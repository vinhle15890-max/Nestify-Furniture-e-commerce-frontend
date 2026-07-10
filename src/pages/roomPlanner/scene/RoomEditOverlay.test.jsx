import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { RoomEditOverlay, snapHalf } from './RoomEditOverlay'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Mock TransformControls giống các test scene khác (passthrough children).
vi.mock('@react-three/drei', () => ({
  TransformControls: ({ children }) => children ?? null,
  Grid: () => null,
}))

describe('snapHalf', () => {
  it('làm tròn về bội 0.5', () => {
    expect(snapHalf(4.24)).toBe(4)
    expect(snapHalf(4.26)).toBe(4.5)
  })
})

describe('RoomEditOverlay', () => {
  beforeEach(() => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 3, walls: { back: true, left: true, right: true } })
    useEditorStore.getState().setEditMode('room')
  })

  it('render không lỗi với 4 núm + 3 cạnh tường', () => {
    const { container } = render(<RoomEditOverlay room={useEditorStore.getState().room} onDragChange={() => {}} />)
    expect(container).toBeTruthy()
  })
})
