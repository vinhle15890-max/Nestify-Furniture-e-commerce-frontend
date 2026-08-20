import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReviewRoomDialog } from './ReviewRoomDialog'

describe('ReviewRoomDialog', () => {
  it('lets the customer save an out-of-stock placement to wishlist without removing it from the room', async () => {
    const onSaveForLater = vi.fn()
    render(<ReviewRoomDialog open onOpenChange={vi.fn()} items={[]} onContinue={vi.fn()} review={{
      can_continue: false,
      items: [{ placement_id: 1, variant_id: 9, product_name: 'Ghế', variant_name: 'Nâu', price: 100, available_stock: 0, purchasable: false, reason: 'out_of_stock' }],
    }} onSaveForLater={onSaveForLater} />)

    await userEvent.click(screen.getByRole('button', { name: 'Lưu Ghế vào yêu thích để chờ hàng' }))
    expect(onSaveForLater).toHaveBeenCalledWith(9)
    expect(screen.getByText('Ghế')).toBeInTheDocument()
  })

  it('removes a named unavailable placement and enables the sole cart handoff after review', async () => {
    function Harness() {
      const [review, setReview] = useState({
        can_continue: false,
        items: [{ placement_id: 1, product_name: 'Ghế', variant_name: 'Nâu', price: 100, available_stock: 0, purchasable: false, reason: 'out_of_stock' }],
      })
      return <ReviewRoomDialog open onOpenChange={vi.fn()} items={[]} onContinue={vi.fn()} review={review} onRemove={async () => setReview({ can_continue: true, items: [] })} />
    }

    render(<Harness />)
    expect(screen.getByText(/tạm hết hàng/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tiếp tục đến giỏ hàng/i })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Xóa Ghế khỏi phòng' }))

    expect(screen.getByRole('button', { name: /tiếp tục đến giỏ hàng/i })).toBeEnabled()
  })
})
