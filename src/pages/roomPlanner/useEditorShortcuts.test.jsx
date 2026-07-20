import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const variant = { id: 12, sku: 'S', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 }

function Harness({ enabled = true }) {
  useEditorShortcuts(enabled)
  return <input data-testid="field" aria-label="field" />
}

function seedReadyWithItem() {
  const s = useEditorStore.getState()
  s.reset()
  s.initNew({ width: 4, depth: 4, height: 2.8 })
  s.addVariant(variant)
}

function startKeyboardPlacement() {
  useEditorStore.getState().addVariant(variant, { provisional: true })
}

describe('useEditorShortcuts', () => {
  beforeEach(() => { seedReadyWithItem() })

  it('Delete removes the selected item', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(useEditorStore.getState().items).toHaveLength(0)
  })

  it('Ctrl+Z undoes, Ctrl+Shift+Z redoes', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true }) // undo the add
    expect(useEditorStore.getState().items).toHaveLength(0)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }) // redo
    expect(useEditorStore.getState().items).toHaveLength(1)
  })

  it('Ctrl+D duplicates the selection', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    expect(useEditorStore.getState().items).toHaveLength(2)
  })

  it('digit keys switch gizmo mode', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: '2' })
    expect(useEditorStore.getState().gizmoMode).toBe('rotate')
  })

  it('moves the placed item with arrows and rotates it with bracket keys', () => {
    startKeyboardPlacement()
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true })
    fireEvent.keyDown(window, { key: ']' })

    const item = useEditorStore.getState().items[1]
    expect(item.position).toMatchObject({ x: 0.1, z: 0.5 })
    expect(item.rotation.y).toBeCloseTo(Math.PI / 12)
  })

  it('clamps keyboard movement at the same room boundary as pointer transforms', () => {
    render(<Harness />)
    expect(useEditorStore.getState().wallSnap).toBe(false)

    for (let index = 0; index < 3; index += 1) {
      fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    }
    expect(useEditorStore.getState().items[0].position.x).toBeCloseTo(1.5)

    // The next candidate center is x=2.0, which would put the item's right
    // edge at x=2.5 beyond the room wall at x=2.0. With wall snap disabled,
    // remaining at x=1.5 can only come from the shared boundary projection.
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    expect(useEditorStore.getState().items[0].position.x).toBeCloseTo(1.5)
  })

  it('applies wall snap when keyboard movement enters the pointer snap range', () => {
    useEditorStore.getState().toggleWallSnap()
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    expect(useEditorStore.getState().items[0].position.x).toBeCloseTo(0.5)

    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    expect(useEditorStore.getState().items[0].position.x).toBeCloseTo(1)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    // x=1.1 m enters the shared strict <0.5 m threshold and snaps flush.
    expect(useEditorStore.getState().items[0].position.x).toBeCloseTo(1.5)
  })

  it('Enter confirms a keyboard placement and Escape cancels one', () => {
    startKeyboardPlacement()
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(useEditorStore.getState()).toMatchObject({ pendingPlacementId: null, selectedId: null })
    expect(useEditorStore.getState().items).toHaveLength(2)

    startKeyboardPlacement()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useEditorStore.getState()).toMatchObject({ pendingPlacementId: null, selectedId: null })
    expect(useEditorStore.getState().items).toHaveLength(2)
  })

  it('key 3 no longer enables customer scaling', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: '3' })
    expect(useEditorStore.getState().gizmoMode).toBe('translate')
  })

  it('ignores shortcuts while typing in a field', () => {
    const { getByTestId } = render(<Harness />)
    fireEvent.keyDown(getByTestId('field'), { key: 'Delete' })
    expect(useEditorStore.getState().items).toHaveLength(1)
  })

  it('does not install active shortcuts when disabled', () => {
    render(<Harness enabled={false} />)
    fireEvent.keyDown(window, { key: 'Delete' })
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })

    expect(useEditorStore.getState().items).toHaveLength(1)
  })
})
