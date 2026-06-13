import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} lastPage={1} onPageChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a button per page and marks the current page', () => {
    render(<Pagination page={2} lastPage={3} onPageChange={() => {}} />)

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
  })

  it('disables prev on the first page and not next', () => {
    render(<Pagination page={1} lastPage={3} onPageChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Trang sau' })).not.toBeDisabled()
  })

  it('calls onPageChange with the target page when a page button is clicked', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} lastPage={3} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with page + 1 when the next button is clicked', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} lastPage={3} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
