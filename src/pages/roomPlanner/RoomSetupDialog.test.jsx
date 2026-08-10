import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomSetupDialog } from './RoomSetupDialog'

describe('RoomSetupDialog', () => {
  it('cannot be dismissed while room setup is required', async () => {
    const onOpenChange = vi.fn()
    render(
      <RoomSetupDialog
        open
        required
        onOpenChange={onOpenChange}
        initialRoom={{ width: 4, depth: 5, height: 2.8 }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Kích thước phòng' })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('stacks dimension fields below the medium breakpoint and explains each axis', () => {
    render(<RoomSetupDialog open onOpenChange={vi.fn()} initialRoom={{ width: 4, depth: 5, height: 2.8 }} onSubmit={vi.fn()} />)
    expect(screen.getByTestId('room-dimension-fields')).toHaveClass('grid-cols-1', 'md:grid-cols-3')
    expect(screen.getByText('Cách đo phòng')).toBeInTheDocument()
  })
  it('submits positive dimensions', async () => {
    const onSubmit = vi.fn()
    render(<RoomSetupDialog open onOpenChange={() => {}} initialRoom={{ width: 4, depth: 5, height: 2.8 }} onSubmit={onSubmit} />)
    expect(screen.getByText('Nhập kích thước để dựng căn phòng theo đúng tỷ lệ.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /tạo phòng/i }))
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Phòng mới',
      width: 4,
      depth: 5,
      height: 2.8,
    })
    expect(screen.queryByLabelText('Loại phòng')).not.toBeInTheDocument()
  })

  it('rejects non-positive dimensions', async () => {
    const onSubmit = vi.fn()
    render(<RoomSetupDialog open onOpenChange={() => {}} initialRoom={{ width: 0, depth: 5, height: 2.8 }} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /tạo phòng/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/lớn hơn 0/i)
  })
})
