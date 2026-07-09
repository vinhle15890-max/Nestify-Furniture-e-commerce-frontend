import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerToolbar } from './PlannerToolbar'

const base = {
  name: 'Phòng A', onNameChange: vi.fn(), gizmoMode: 'translate',
  onGizmoModeChange: vi.fn(), onSave: vi.fn(), saving: false, dirty: true,
  onAddToCart: vi.fn(), addingToCart: false, onOrder: vi.fn(), ordering: false,
  onUndo: vi.fn(), onRedo: vi.fn(), canUndo: true, canRedo: true,
  snap: false, onToggleSnap: vi.fn(),
  itemCount: 2, onExit: vi.fn(),
}

describe('PlannerToolbar', () => {
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

  it('disables save when not dirty', () => {
    render(<PlannerToolbar {...base} dirty={false} />)
    expect(screen.getByRole('button', { name: /lưu/i })).toBeDisabled()
  })

  it('calls onAddToCart when Thêm vào giỏ is clicked', async () => {
    const onAddToCart = vi.fn()
    render(<PlannerToolbar {...base} onAddToCart={onAddToCart} />)
    await userEvent.click(screen.getByRole('button', { name: /thêm vào giỏ/i }))
    expect(onAddToCart).toHaveBeenCalled()
  })

  it('disables add-to-cart when the room is empty', () => {
    render(<PlannerToolbar {...base} itemCount={0} />)
    expect(screen.getByRole('button', { name: /thêm vào giỏ/i })).toBeDisabled()
  })

  it('calls onOrder when "Đặt cả phòng" is clicked', async () => {
    const onOrder = vi.fn()
    render(<PlannerToolbar {...base} onOrder={onOrder} />)
    await userEvent.click(screen.getByRole('button', { name: /đặt cả phòng/i }))
    expect(onOrder).toHaveBeenCalled()
  })

  it('disables "Đặt cả phòng" when the room is empty', () => {
    render(<PlannerToolbar {...base} itemCount={0} />)
    expect(screen.getByRole('button', { name: /đặt cả phòng/i })).toBeDisabled()
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
    const btn = screen.getByRole('button', { name: /snap/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(onToggleSnap).toHaveBeenCalled()
  })
})
