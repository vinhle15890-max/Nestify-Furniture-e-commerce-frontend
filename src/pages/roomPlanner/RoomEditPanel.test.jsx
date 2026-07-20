import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomEditPanel } from './RoomEditPanel'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

describe('RoomEditPanel', () => {
  it('names icon-only height controls and gives them visible keyboard focus styles', () => {
    render(<RoomEditPanel />)
    for (const name of ['Giảm chiều cao', 'Tăng chiều cao']) {
      const control = screen.getByRole('button', { name })
      expect(control).toHaveClass('focus-visible:ring-2')
      expect(control).not.toHaveAttribute('title')
    }
  })

  beforeEach(() => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 3, walls: { back: true, left: true, right: true } })
    useEditorStore.getState().setEditMode('room')
  })

  it('hiện kích thước phòng live', () => {
    render(<RoomEditPanel />)
    expect(screen.getByText(/4 × 5 × 3 m/)).toBeInTheDocument()
  })

  it('stepper + tăng chiều cao gọi resizeRoom', () => {
    render(<RoomEditPanel />)
    fireEvent.click(screen.getByLabelText('Tăng chiều cao'))
    expect(useEditorStore.getState().room.height).toBeCloseTo(3.1, 5)
  })

  it('toggle tường trái', () => {
    render(<RoomEditPanel />)
    fireEvent.click(screen.getByLabelText('Bật/tắt tường trái'))
    expect(useEditorStore.getState().room.walls.left).toBe(false)
  })

  it('nút Xong về furnish', () => {
    render(<RoomEditPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }))
    expect(useEditorStore.getState().editMode).toBe('furnish')
  })
})
