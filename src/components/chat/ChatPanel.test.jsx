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
    expect(screen.getByText(/tính kích thước, bố trí, phối màu/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bố trí phòng khách 4 × 4 m thế nào cho thoáng?' })).toBeInTheDocument()
  })

  it('sends a message and renders the reply with a linked product source', async () => {
    chatApi.sendChatMessage.mockResolvedValue({
      data: {
        reply: 'Ghế X rất phù hợp với phòng nhỏ.',
        sources: [
          {
            entity_type: 'product',
            entity_id: 5,
            product_name: 'Ghế X',
            product_slug: 'ghe-x',
            product_price: 2500000,
            product_thumbnail: 'https://cdn.example/ghe-x.jpg',
          },
        ],
      },
    })

    renderPanel()
    await userEvent.type(screen.getByLabelText('Nhập câu hỏi'), 'Ghế nào cho phòng nhỏ?')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    expect(await screen.findByText('Ghế X rất phù hợp với phòng nhỏ.')).toBeInTheDocument()
    expect(screen.getByText('Ghế nào cho phòng nhỏ?')).toBeInTheDocument()

    const sourceLink = screen.getByRole('link', { name: /Ghế X/ })
    expect(sourceLink).toHaveAttribute('href', '/p/ghe-x')
    expect(screen.getByText(/2.500.000/)).toBeInTheDocument()
    expect(sourceLink.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/ghe-x.jpg')
    expect(chatApi.sendChatMessage).toHaveBeenCalledWith({
      message: 'Ghế nào cho phòng nhỏ?',
      history: [],
    })
  })

  it('sends recent conversation so follow-up questions keep their subject', async () => {
    useChatStore.setState({
      isOpen: true,
      messages: [
        { id: '1', role: 'user', text: 'Sofa Vòm Mây hợp phòng 4 × 4 m không?' },
        { id: '2', role: 'assistant', text: 'Có thể phù hợp nếu còn đủ lối đi.' },
      ],
    })
    chatApi.sendChatMessage.mockResolvedValue({ data: { reply: 'Mình sẽ kiểm tra kích thước sofa.', sources: [] } })

    renderPanel()
    await userEvent.type(screen.getByLabelText('Nhập câu hỏi'), 'Kích thước của nó là bao nhiêu?')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    expect(chatApi.sendChatMessage).toHaveBeenCalledWith({
      message: 'Kích thước của nó là bao nhiêu?',
      history: [
        { role: 'user', text: 'Sofa Vòm Mây hợp phòng 4 × 4 m không?' },
        { role: 'assistant', text: 'Có thể phù hợp nếu còn đủ lối đi.' },
      ],
    })
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

  it('shows a meaningful, branded thinking state while waiting', async () => {
    chatApi.sendChatMessage.mockImplementation(() => new Promise(() => {}))
    renderPanel()

    await userEvent.type(screen.getByLabelText('Nhập câu hỏi'), 'Tư vấn giúp mình')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    expect(screen.getByRole('status')).toHaveTextContent('Đang cân nhắc cho không gian của bạn')
    expect(screen.getByText('Đối chiếu dữ liệu trước khi trả lời…')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })
})
