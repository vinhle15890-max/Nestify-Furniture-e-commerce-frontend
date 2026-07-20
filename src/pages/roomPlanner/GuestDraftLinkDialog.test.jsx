import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuestDraftLinkDialog } from './GuestDraftLinkDialog'

describe('GuestDraftLinkDialog', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('shows and copies the fragment-based continuation link', async () => {
    const url = `https://nestify.test/room-planner#draft=${'A'.repeat(64)}`
    render(<GuestDraftLinkDialog open onOpenChange={vi.fn()} url={url} />)

    expect(screen.getByLabelText('Liên kết tiếp tục')).toHaveValue(url)
    await userEvent.click(screen.getByRole('button', { name: 'Sao chép' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url)
  })
})
