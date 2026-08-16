import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonalizationControls } from './PersonalizationControls'
import * as hooks from '../../features/personalization/hooks'

vi.mock('../../features/personalization/hooks')

describe('PersonalizationControls', () => {
  const update = { mutate: vi.fn(), isPending: false, isError: false }
  const clear = { mutate: vi.fn(), isPending: false, isError: false }

  beforeEach(() => {
    vi.clearAllMocks()
    hooks.useUpdatePersonalization.mockReturnValue(update)
    hooks.useClearPersonalizationHistory.mockReturnValue(clear)
  })

  it('lets the customer opt out', async () => {
    render(<PersonalizationControls enabled />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cho phép cá nhân hóa' }))
    expect(update.mutate).toHaveBeenCalledWith(false)
  })

  it('clears only behavioral history after explicit confirmation', async () => {
    render(<PersonalizationControls enabled />)
    await userEvent.click(screen.getByRole('button', { name: 'Xóa lịch sử sản phẩm đã xem' }))
    expect(await screen.findByText(/Phòng đã lưu, wishlist và đơn hàng vẫn được giữ nguyên/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Xóa lịch sử đã xem' }))
    expect(clear.mutate).toHaveBeenCalled()
  })
})
