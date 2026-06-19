import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ChatPanel } from './ChatPanel'
import { useChatStore } from '../../store/chatStore'
import * as chatApi from '../../features/chat/api'

vi.mock('../../features/chat/api')

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({ isOpen: true, messages: [] })
  })

  it('shows the welcome state with suggestions when empty', () => {
    renderPanel()
    expect(screen.getByText(/Mình có thể giúp bạn tìm nội thất/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gợi ý ghế sofa cho phòng khách nhỏ' })).toBeInTheDocument()
  })

  it('sends a message and renders the reply with a linked product source', async () => {
    chatApi.sendChatMessage.mockResolvedValue({
      data: {
        reply: 'Ghế X rất phù hợp với phòng nhỏ.',
        sources: [
          { entity_type: 'product', entity_id: 5, product_name: 'Ghế X', product_slug: 'ghe-x' },
        ],
      },
    })

    renderPanel()
    await userEvent.type(screen.getByLabelText('Nhập câu hỏi'), 'Ghế nào cho phòng nhỏ?')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    expect(await screen.findByText('Ghế X rất phù hợp với phòng nhỏ.')).toBeInTheDocument()
    expect(screen.getByText('Ghế nào cho phòng nhỏ?')).toBeInTheDocument()

    const sourceLink = screen.getByRole('link', { name: 'Ghế X' })
    expect(sourceLink).toHaveAttribute('href', '/p/ghe-x')
    expect(chatApi.sendChatMessage).toHaveBeenCalledWith('Ghế nào cho phòng nhỏ?')
  })

  it('shows a budget message when the daily limit is exceeded', async () => {
    chatApi.sendChatMessage.mockRejectedValue({
      code: 'AI_TOKEN_BUDGET_EXCEEDED',
      message: 'Bạn đã đạt giới hạn câu hỏi hôm nay.',
    })

    renderPanel()
    await userEvent.type(screen.getByLabelText('Nhập câu hỏi'), 'Hỏi nhiều quá')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    expect(await screen.findByText('Bạn đã đạt giới hạn câu hỏi hôm nay.')).toBeInTheDocument()
  })

  it('does not send an empty message', async () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Gửi' })).toBeDisabled()
  })
})
