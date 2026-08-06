import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomEditPanel } from './RoomEditPanel'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

describe('RoomEditPanel', () => {
  beforeEach(() => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 3, walls: { back: true, left: true, right: true } })
    useEditorStore.getState().setEditMode('room')
  })

  it('hiện đầy đủ kích thước hiện tại trong form', () => {
    render(<RoomEditPanel />)
    expect(screen.getByLabelText('Chiều rộng (m)')).toHaveValue(4)
    expect(screen.getByLabelText('Chiều sâu (m)')).toHaveValue(5)
    expect(screen.getByLabelText('Chiều cao (m)')).toHaveValue(3)
  })

  it('chỉ đổi kích thước sau khi áp dụng', () => {
    render(<RoomEditPanel />)
    fireEvent.change(screen.getByLabelText('Chiều rộng (m)'), { target: { value: '6.5' } })
    fireEvent.change(screen.getByLabelText('Chiều cao (m)'), { target: { value: '3.2' } })
    expect(useEditorStore.getState().room.width).toBe(4)
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(useEditorStore.getState().room.width).toBe(6.5)
    expect(useEditorStore.getState().room.height).toBe(3.2)
    expect(useEditorStore.getState().editMode).toBe('furnish')
  })

  it('chặn kích thước ngoài giới hạn', () => {
    render(<RoomEditPanel />)
    fireEvent.change(screen.getByLabelText('Chiều cao (m)'), { target: { value: '9' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Chỉnh kích thước phòng' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Chiều cao phải nằm trong khoảng 2–5 m.')
    expect(useEditorStore.getState().room.height).toBe(3)
    expect(useEditorStore.getState().editMode).toBe('room')
  })

  it('huỷ bỏ thay đổi nháp và trở về furnish', () => {
    render(<RoomEditPanel />)
    fireEvent.change(screen.getByLabelText('Chiều sâu (m)'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(useEditorStore.getState().room.depth).toBe(5)
    expect(useEditorStore.getState().editMode).toBe('furnish')
  })

  it('thêm, chỉnh và xoá vùng cản', () => {
    render(<RoomEditPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Cửa mở' }))
    expect(useEditorStore.getState().obstacles[0].type).toBe('door_swing')
    expect(screen.getByText(/Chấm đậm là bản lề/)).toBeInTheDocument()
    expect(screen.getByLabelText('Rộng cánh cửa (m)')).toHaveValue(0.9)
    expect(useEditorStore.getState().selectedObstacleId).toBe(useEditorStore.getState().obstacles[0].id)
    fireEvent.change(screen.getByLabelText('X (m)'), { target: { value: '0.8' } })
    expect(useEditorStore.getState().obstacles[0].x).toBe(0.8)
    fireEvent.click(screen.getByRole('button', { name: 'Xoay' }))
    expect(useEditorStore.getState().obstacleGizmoMode).toBe('rotate')
    fireEvent.click(screen.getByRole('button', { name: 'Xoá vùng 1' }))
    expect(useEditorStore.getState().obstacles).toEqual([])
  })
})
