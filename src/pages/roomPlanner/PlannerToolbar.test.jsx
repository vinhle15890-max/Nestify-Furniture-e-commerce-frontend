import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerToolbar } from './PlannerToolbar'
import { PlannerCompletionArea, PlannerContextControls, PlannerViewMenu } from './PlannerWorkspaceControls'

const base = {
  name: 'Phòng A', onNameChange: vi.fn(), gizmoMode: 'translate',
  onGizmoModeChange: vi.fn(), onSave: vi.fn(), saving: false, dirty: true,
  onReview: vi.fn(), reviewing: false,
  onUndo: vi.fn(), onRedo: vi.fn(), canUndo: true, canRedo: true,
  viewMode: 'perspective', onViewModeChange: vi.fn(),
  showScaleRef: false, onToggleScaleRef: vi.fn(),
  itemCount: 2, onExit: vi.fn(),
  onEnterRoomEdit: vi.fn(),
}

describe('PlannerToolbar', () => {
  it('exposes a name and visible keyboard focus style for every toolbar control', () => {
    render(<><PlannerToolbar {...base} /><PlannerViewMenu {...base} /><PlannerContextControls {...base} /><PlannerCompletionArea {...base} /></>)
    const controls = [
      { role: 'button', name: 'Thoát Room Planner', focusClass: 'focus-visible:ring-2' },
      { role: 'textbox', name: 'Tên phòng', focusClass: 'focus-visible:border-border-strong' },
      { role: 'button', name: 'Hoàn tác', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Làm lại', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Di chuyển. Phím tắt 1', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Xoay. Phím tắt 2', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Góc nhìn 3D', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Nhìn từ trên', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Hiện mốc tỉ lệ người và cửa', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Chỉnh kích thước phòng', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Chia sẻ', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Lưu', focusClass: 'focus-visible:ring-2' },
      { role: 'button', name: 'Xem lại phòng', focusClass: 'focus-visible:ring-2' },
    ]

    for (const { role, name, focusClass } of controls) {
      const control = screen.getByRole(role, { name })
      expect(control).toHaveClass(focusClass)
      expect(control).not.toHaveAttribute('title')
    }
    expect(screen.getAllByRole('button')).toHaveLength(12)
  })

  it('calls onSave when Lưu is clicked', async () => {
    const onSave = vi.fn()
    render(<PlannerToolbar {...base} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /lưu/i }))
    expect(onSave).toHaveBeenCalled()
  })

  it('switches gizmo mode', async () => {
    const onGizmoModeChange = vi.fn()
    render(<PlannerContextControls {...base} onGizmoModeChange={onGizmoModeChange} />)
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
    render(<PlannerCompletionArea {...base} onReview={onReview} />)
    await userEvent.click(screen.getByRole('button', { name: /xem lại phòng/i }))
    expect(onReview).toHaveBeenCalled()
  })

  it('disables add-to-cart when the room is empty', () => {
    render(<PlannerCompletionArea {...base} itemCount={0} />)
    expect(screen.getByRole('button', { name: /xem lại phòng/i })).toBeDisabled()
  })

  it('calls onUndo / onRedo and disables them per history', async () => {
    const onUndo = vi.fn(); const onRedo = vi.fn()
    render(<PlannerToolbar {...base} onUndo={onUndo} onRedo={onRedo} canUndo canRedo={false} />)
    await userEvent.click(screen.getByRole('button', { name: /hoàn tác/i }))
    expect(onUndo).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /làm lại/i })).toBeDisabled()
  })

  it('switches between perspective and top views', async () => {
    const onViewModeChange = vi.fn()
    render(<PlannerViewMenu {...base} onViewModeChange={onViewModeChange} />)
    expect(screen.getByRole('button', { name: 'Góc nhìn 3D' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Nhìn từ trên' }))
    expect(onViewModeChange).toHaveBeenCalledWith('top')
    await userEvent.click(screen.getByRole('button', { name: 'Góc nhìn 3D' }))
    expect(onViewModeChange).toHaveBeenCalledWith('perspective')
    expect(screen.queryByRole('button', { name: /^snap$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /bắt tường/i })).not.toBeInTheDocument()
  })

  it('toggles scale reference', async () => {
    const onToggleScaleRef = vi.fn()
    render(<PlannerViewMenu {...base} onToggleScaleRef={onToggleScaleRef} showScaleRef={false} />)
    const btn = screen.getByRole('button', { name: /tỉ lệ/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(onToggleScaleRef).toHaveBeenCalled()
  })

  it('opens room dimensions', async () => {
    const onEnterRoomEdit = vi.fn()
    render(<PlannerViewMenu {...base} onEnterRoomEdit={onEnterRoomEdit} />)
    await userEvent.click(screen.getByRole('button', { name: /chỉnh kích thước phòng/i }))
    expect(onEnterRoomEdit).toHaveBeenCalled()
  })
})
