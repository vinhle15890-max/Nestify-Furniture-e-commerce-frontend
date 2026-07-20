import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerToolbar } from './PlannerToolbar'

const base = {
  name: 'Phòng A', onNameChange: vi.fn(), gizmoMode: 'translate',
  onGizmoModeChange: vi.fn(), onSave: vi.fn(), saving: false, dirty: true,
  onReview: vi.fn(), reviewing: false,
  onUndo: vi.fn(), onRedo: vi.fn(), canUndo: true, canRedo: true,
  snap: false, onToggleSnap: vi.fn(),
  wallSnap: false, onToggleWallSnap: vi.fn(),
  showScaleRef: false, onToggleScaleRef: vi.fn(),
  itemCount: 2, onExit: vi.fn(),
  onEnterRoomEdit: vi.fn(),
}

describe('PlannerToolbar', () => {
  it('gives every icon-only control an accessible name and visible keyboard focus style', () => {
    render(<PlannerToolbar {...base} />)
    for (const name of ['Thoát Room Planner', 'Hoàn tác', 'Làm lại']) {
      const control = screen.getByRole('button', { name })
      expect(control).toHaveClass('focus-visible:ring-2')
      expect(control).not.toHaveAttribute('title')
    }
  })

  it('calls onSave when Lưu is clicked', async () => {
    const onSave = vi.fn()
    render(<PlannerToolbar {...base} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /lưu/i }))
    expect(onSave).toHaveBeenCalled()
  })

  it('switches gizmo mode', async () => {
    const onGizmoModeChange = vi.fn()
    render(<PlannerToolbar {...base} onGizmoModeChange={onGizmoModeChange} />)
    await userEvent.click(screen.getByRole('button', { name: /xoay/i }))
    expect(onGizmoModeChange).toHaveBeenCalledWith('rotate')
  })

  it('does not expose a customer scale mode', () => {
    render(<PlannerToolbar {...base} />)
    expect(screen.queryByRole('button', { name: /phóng to/i })).not.toBeInTheDocument()
  })

  it('disables save when not dirty', () => {
    render(<PlannerToolbar {...base} dirty={false} />)
    expect(screen.getByRole('button', { name: /lưu/i })).toBeDisabled()
  })

  it('opens review from the single commerce action', async () => {
    const onReview = vi.fn()
    render(<PlannerToolbar {...base} onReview={onReview} />)
    await userEvent.click(screen.getByRole('button', { name: /xem lại phòng/i }))
    expect(onReview).toHaveBeenCalled()
  })

  it('disables add-to-cart when the room is empty', () => {
    render(<PlannerToolbar {...base} itemCount={0} />)
    expect(screen.getByRole('button', { name: /xem lại phòng/i })).toBeDisabled()
  })

  it('calls onUndo / onRedo and disables them per history', async () => {
    const onUndo = vi.fn(); const onRedo = vi.fn()
    render(<PlannerToolbar {...base} onUndo={onUndo} onRedo={onRedo} canUndo canRedo={false} />)
    await userEvent.click(screen.getByRole('button', { name: /hoàn tác/i }))
    expect(onUndo).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /làm lại/i })).toBeDisabled()
  })

  it('toggles snap', async () => {
    const onToggleSnap = vi.fn()
    render(<PlannerToolbar {...base} onToggleSnap={onToggleSnap} snap={false} />)
    const btn = screen.getByRole('button', { name: /^snap$/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(onToggleSnap).toHaveBeenCalled()
  })

  it('toggles wall-snap', async () => {
    const onToggleWallSnap = vi.fn()
    render(<PlannerToolbar {...base} onToggleWallSnap={onToggleWallSnap} wallSnap={false} />)
    const btn = screen.getByRole('button', { name: /bắt tường/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(onToggleWallSnap).toHaveBeenCalled()
  })

  it('toggles scale reference', async () => {
    const onToggleScaleRef = vi.fn()
    render(<PlannerToolbar {...base} onToggleScaleRef={onToggleScaleRef} showScaleRef={false} />)
    const btn = screen.getByRole('button', { name: /tỉ lệ/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(onToggleScaleRef).toHaveBeenCalled()
  })

  it('calls onEnterRoomEdit when "Chỉnh phòng" is clicked', async () => {
    const onEnterRoomEdit = vi.fn()
    render(<PlannerToolbar {...base} onEnterRoomEdit={onEnterRoomEdit} />)
    await userEvent.click(screen.getByRole('button', { name: /chỉnh phòng/i }))
    expect(onEnterRoomEdit).toHaveBeenCalled()
  })
})
