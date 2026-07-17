import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders title, description, and children when open', () => {
    render(
      <Modal open title="Xác nhận" description="Bạn có chắc chắn không?" onOpenChange={() => {}}>
        <p>Nội dung modal</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Xác nhận')).toBeInTheDocument()
    expect(screen.getByText('Bạn có chắc chắn không?')).toBeInTheDocument()
    expect(screen.getByText('Nội dung modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal open={false} title="Xác nhận" onOpenChange={() => {}}>
        <p>Nội dung modal</p>
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onOpenChange(false) when the close button is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <Modal open title="Xác nhận" description="Kiểm tra nội dung trước khi tiếp tục." onOpenChange={onOpenChange}>
        <p>Nội dung modal</p>
      </Modal>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('supports a separately styled scroll body and persistent footer', () => {
    render(
      <Modal
        open
        title="Biến thể"
        description="Chỉnh sửa biến thể."
        onOpenChange={() => {}}
        contentClassName="max-h-[90dvh]"
        bodyClassName="overflow-y-scroll"
        footer={<button type="button">Lưu thay đổi</button>}
        footerClassName="border-t"
      >
        <p>Nội dung dài</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('max-h-[90dvh]')
    expect(screen.getByText('Nội dung dài').parentElement).toHaveClass('overflow-y-scroll')
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' }).parentElement).toHaveClass('border-t')
  })
})
