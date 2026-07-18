import { describe, it, expect, vi } from 'vitest'
import { addRoomToCart } from './addRoomToCart'

describe('addRoomToCart', () => {
  it('best-effort: đếm added/skipped, không chặn khi 1 món lỗi', async () => {
    const addItemAsync = vi.fn(({ variant_id }) =>
      variant_id === 2 ? Promise.reject(new Error('hết hàng')) : Promise.resolve(),
    )
    const lines = [
      { variantId: 1, qty: 2 },
      { variantId: 2, qty: 1 },
      { variantId: 3, qty: 1 },
    ]
    const res = await addRoomToCart(lines, addItemAsync)
    expect(res).toEqual({ added: 2, skipped: 1 })
    expect(addItemAsync).toHaveBeenCalledTimes(3)
    expect(addItemAsync).toHaveBeenCalledWith({ variant_id: 1, quantity: 2 })
  })

  it('bỏ line thiếu variantId', async () => {
    const addItemAsync = vi.fn(() => Promise.resolve())
    const res = await addRoomToCart([{ variantId: null, qty: 1 }, { variantId: 5, qty: 1 }], addItemAsync)
    expect(res).toEqual({ added: 1, skipped: 0 })
    expect(addItemAsync).toHaveBeenCalledTimes(1)
  })
})
