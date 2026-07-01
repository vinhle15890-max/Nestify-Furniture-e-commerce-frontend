import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomSetupDialog } from './RoomSetupDialog'

describe('RoomSetupDialog', () => {
  it('submits positive dimensions', async () => {
    const onSubmit = vi.fn()
    render(<RoomSetupDialog open onOpenChange={() => {}} initialRoom={{ width: 4, depth: 5, height: 2.8 }} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /tạo phòng/i }))
    expect(onSubmit).toHaveBeenCalledWith({ width: 4, depth: 5, height: 2.8 })
  })

  it('rejects non-positive dimensions', async () => {
    const onSubmit = vi.fn()
    render(<RoomSetupDialog open onOpenChange={() => {}} initialRoom={{ width: 0, depth: 5, height: 2.8 }} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /tạo phòng/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/lớn hơn 0/i)).toBeInTheDocument()
  })
})
