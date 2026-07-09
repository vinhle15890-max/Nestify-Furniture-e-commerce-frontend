import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerToolbar } from './PlannerToolbar'

const base = {
  name: 'Phòng A', onNameChange: vi.fn(), gizmoMode: 'translate',
  onGizmoModeChange: vi.fn(), onSave: vi.fn(), saving: false, dirty: true,
  onAddToCart: vi.fn(), addingToCart: false, itemCount: 2, onExit: vi.fn(),
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
})
