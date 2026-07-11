import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmallScreenNotice } from './SmallScreenNotice'

function installClipboard(writeText) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  })
})

describe('SmallScreenNotice', () => {
  it('copies the exact continuation URL and announces success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const continueUrl = 'https://nestify.test/room-planner?product=sofa&variant=11&utm=spring'
    installClipboard(writeText)

    render(<SmallScreenNotice continueUrl={continueUrl} onExit={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Tiếp tục thiết kế trên máy tính' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))

    expect(writeText).toHaveBeenCalledWith(continueUrl)
    expect(await screen.findByRole('status')).toHaveTextContent('Đã sao chép liên kết')
  })

  it('offers a selectable manual URL when clipboard access fails', async () => {
    const continueUrl = 'https://nestify.test/room-planner/9'
    installClipboard(vi.fn().mockRejectedValue(new Error('denied')))

    render(<SmallScreenNotice continueUrl={continueUrl} onExit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('sao chép thủ công')
    expect(screen.getByLabelText('Liên kết tiếp tục')).toHaveValue(continueUrl)
    expect(screen.getByLabelText('Liên kết tiếp tục')).toHaveAttribute('readonly')
  })

  it('is honest about unsaved changes and delegates exit protection', async () => {
    const onExit = vi.fn()
    installClipboard(vi.fn().mockResolvedValue(undefined))

    render(
      <SmallScreenNotice
        continueUrl="https://nestify.test/room-planner/9"
        hasUnsavedChanges
        onExit={onExit}
      />,
    )

    expect(screen.getByText(/Liên kết không chứa những thay đổi đó/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Về cửa hàng' }))
    expect(onExit).toHaveBeenCalledOnce()
  })
})
