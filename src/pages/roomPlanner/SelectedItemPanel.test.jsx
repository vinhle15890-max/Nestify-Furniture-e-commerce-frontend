import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectedItemPanel } from './SelectedItemPanel'

describe('SelectedItemPanel', () => {
  it('renders nothing without a selected item', () => {
    const { container } = render(<SelectedItemPanel item={null} onDelete={vi.fn()} onResetTransform={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('deletes and resets the selected item', async () => {
    const onDelete = vi.fn()
    const onResetTransform = vi.fn()
    const item = { localId: 1, variant: { name: 'Ghế Sofa' } }
    render(<SelectedItemPanel item={item} onDelete={onDelete} onResetTransform={onResetTransform} />)
    expect(screen.getByText('Ghế Sofa')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /đặt lại vị trí/i }))
    await userEvent.click(screen.getByRole('button', { name: /xoá/i }))
    expect(onResetTransform).toHaveBeenCalled()
    expect(onDelete).toHaveBeenCalled()
  })
})
