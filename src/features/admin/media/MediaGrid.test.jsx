import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MediaGrid } from './MediaGrid'

describe('MediaGrid', () => {
  it('toggles selection and marks attached items disabled', async () => {
    const onToggle = vi.fn()
    render(<MediaGrid
      items={[{ id: 1, url: 'a.jpg', alt_text: 'A', usage_count: 2 }, { id: 2, url: 'b.jpg', usage_count: 0 }]}
      selectedIds={[2]} attachedAssetIds={[1]} onToggle={onToggle} />)

    expect(screen.getByText('2 nơi')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()            // attached
    await userEvent.click(buttons[1])
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })
})
