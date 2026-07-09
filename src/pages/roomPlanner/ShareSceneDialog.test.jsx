import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareSceneDialog } from './ShareSceneDialog'

describe('ShareSceneDialog', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } })
  })

  it('shows the public share URL and copies it', async () => {
    render(<ShareSceneDialog open token="tok123" onOpenChange={() => {}} />)
    const url = `${window.location.origin}/room-planner/shared/tok123`
    expect(screen.getByDisplayValue(url)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Sao chép/ }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url)
  })
})
