import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReviewRoomDialog } from './ReviewRoomDialog'

describe('ReviewRoomDialog', () => {
  it('blocks the sole cart handoff when any real placement is unavailable', () => {
    render(<ReviewRoomDialog open onOpenChange={vi.fn()} items={[]} onContinue={vi.fn()} review={{ can_continue: false, items: [{ placement_id: 1, product_name: 'Ghế', variant_name: 'Nâu', price: 100, available_stock: 0, purchasable: false, reason: 'out_of_stock' }] }} />)
    expect(screen.getByText(/tạm hết hàng/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tiếp tục đến giỏ hàng/i })).toBeDisabled()
  })
})
