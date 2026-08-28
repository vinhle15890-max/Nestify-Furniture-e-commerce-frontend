import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ChatWidget } from './ChatWidget'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChatWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const verifiedUser = { id: 1, name: 'Bao', email_verified_at: '2026-01-01T00:00:00Z' }

describe('ChatWidget', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    useChatStore.setState({ isOpen: false, messages: [] })
  })

  it('shows the assistant to a guest', () => {
    renderWidget()
    expect(screen.getByRole('button', { name: 'Mở trợ lý mua sắm' })).toBeInTheDocument()
  })

  it('shows the assistant to an unverified user', () => {
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Bao', email_verified_at: null } })
    renderWidget()
    expect(screen.getByRole('button', { name: 'Mở trợ lý mua sắm' })).toBeInTheDocument()
  })

  it('shows the bubble for a verified user and opens the panel on click', async () => {
    useAuthStore.setState({ token: 't', user: verifiedUser })
    renderWidget()

    const bubble = screen.getByRole('button', { name: 'Mở trợ lý mua sắm' })
    expect(bubble).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(bubble)

    expect(screen.getByRole('dialog', { name: 'Trợ lý mua sắm AI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng trợ lý mua sắm' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
