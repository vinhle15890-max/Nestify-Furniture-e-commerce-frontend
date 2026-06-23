import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BackLink } from './BackLink'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderBackLink(props) {
  return render(
    <MemoryRouter>
      <BackLink {...props}>Quay lại danh sách đơn hàng</BackLink>
    </MemoryRouter>,
  )
}

describe('BackLink', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  afterEach(() => {
    // Reset the history state our component inspects.
    window.history.replaceState(null, '')
  })

  it('renders an accessible button with the given label', () => {
    renderBackLink({ to: '/orders' })
    expect(
      screen.getByRole('button', { name: /quay lại danh sách đơn hàng/i }),
    ).toBeInTheDocument()
  })

  it('goes back in real history when in-app history exists (idx > 0)', async () => {
    // React Router records its position in window.history.state.idx.
    window.history.replaceState({ idx: 2 }, '')
    renderBackLink({ to: '/orders' })

    await userEvent.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('falls back to `to` on a direct load (idx 0)', async () => {
    window.history.replaceState({ idx: 0 }, '')
    renderBackLink({ to: '/orders' })

    await userEvent.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/orders')
  })

  it('falls back to `to` when history state is missing entirely', async () => {
    window.history.replaceState(null, '')
    renderBackLink({ to: '/orders' })

    await userEvent.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/orders')
  })
})
