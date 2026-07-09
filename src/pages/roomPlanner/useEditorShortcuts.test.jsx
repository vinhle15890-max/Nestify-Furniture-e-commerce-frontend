import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const variant = { id: 12, sku: 'S', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 }

function Harness() {
  useEditorShortcuts()
  return <input data-testid="field" aria-label="field" />
}

function seedReadyWithItem() {
  const s = useEditorStore.getState()
  s.reset()
  s.initNew({ width: 4, depth: 4, height: 2.8 })
  s.addVariant(variant)
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

  it('digit keys switch gizmo mode; Escape deselects', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: '2' })
    expect(useEditorStore.getState().gizmoMode).toBe('rotate')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('ignores shortcuts while typing in a field', () => {
    const { getByTestId } = render(<Harness />)
    fireEvent.keyDown(getByTestId('field'), { key: 'Delete' })
    expect(useEditorStore.getState().items).toHaveLength(1)
  })
})
