import { useEffect, useRef, useState } from 'react'
import { X, Send } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useSendChatMessage } from '../../features/chat/hooks'
import { Spinner } from '../Spinner'
import { ChatMessage } from './ChatMessage'

const MAX_LENGTH = 1000

const SUGGESTIONS = [
  'Gợi ý ghế sofa cho phòng khách nhỏ',
  'Bàn ăn gỗ nào bền và đẹp?',
  'Tủ quần áo nào nhiều ngăn chứa?',
]

function errorText(error) {
  if (error?.code === 'AI_TOKEN_BUDGET_EXCEEDED') {
    return error.message ?? 'Bạn đã đạt giới hạn câu hỏi, vui lòng thử lại sau.'
  }
  return 'Trợ lý tạm thời không phản hồi được, vui lòng thử lại sau.'
}

export function ChatPanel() {
  const messages = useChatStore((state) => state.messages)
  const addMessage = useChatStore((state) => state.addMessage)
  const close = useChatStore((state) => state.close)
  const { mutateAsync, isPending } = useSendChatMessage()

  const [input, setInput] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, isPending])

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return

    addMessage({ role: 'user', text: trimmed })
    setInput('')

    try {
      const response = await mutateAsync(trimmed)
      addMessage({
        role: 'assistant',
        text: response.data.reply,
        sources: response.data.sources ?? [],
      })
    } catch (error) {
      addMessage({ role: 'error', text: errorText(error) })
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    send(input)
  }

  return (
    <section
      role="dialog"
      aria-label="Trợ lý mua sắm AI"
      className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-base text-foreground">Trợ lý mua sắm</h2>
        <button
          type="button"
          aria-label="Đóng"
          onClick={close}
          className="cursor-pointer rounded-control text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={18} />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Xin chào! Mình có thể giúp bạn tìm nội thất phù hợp. Thử hỏi:
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="cursor-pointer rounded-card border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} onNavigate={close} />
          ))
        )}

        {isPending && (
          <div className="flex justify-start">
            <div className="rounded-card bg-background px-3 py-2">
              <Spinner label="Đang trả lời..." />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <label htmlFor="chat-input" className="sr-only">
          Nhập câu hỏi
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          maxLength={MAX_LENGTH}
          autoFocus
          autoComplete="off"
          placeholder="Nhập câu hỏi của bạn..."
          onChange={(event) => setInput(event.target.value)}
          className="flex-1 rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          aria-label="Gửi"
          disabled={isPending || input.trim().length === 0}
          className="inline-flex items-center justify-center rounded-control bg-primary p-2 text-surface transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  )
}
