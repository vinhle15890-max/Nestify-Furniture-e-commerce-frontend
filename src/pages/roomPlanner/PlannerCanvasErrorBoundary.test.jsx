import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlannerCanvasErrorBoundary } from './PlannerCanvasErrorBoundary'

function BrokenCanvas() {
  throw new Error('three runtime detail must not reach the customer')
}

describe('PlannerCanvasErrorBoundary', () => {
  it('contains canvas errors and offers a safe way out of room edit', () => {
    const onLeaveRoomEdit = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PlannerCanvasErrorBoundary sceneKey="new" onLeaveRoomEdit={onLeaveRoomEdit}>
        <BrokenCanvas />
      </PlannerCanvasErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể hiển thị phòng lúc này')
    expect(screen.queryByText(/three runtime detail/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Về chế độ sắp xếp' }))
    expect(onLeaveRoomEdit).toHaveBeenCalledOnce()

    consoleSpy.mockRestore()
  })
})
