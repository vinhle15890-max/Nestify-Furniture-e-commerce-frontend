import { useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { ChatPanel } from './ChatPanel'

// Floating, non-modal AI assistant. The public endpoint applies IP/user budgets,
// so guests can explore furniture before deciding whether to create an account.
export function ChatWidget() {
  const isOpen = useChatStore((state) => state.isOpen)
  const toggle = useChatStore((state) => state.toggle)
  const close = useChatStore((state) => state.close)

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {isOpen && <ChatPanel />}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Đóng trợ lý mua sắm' : 'Mở trợ lý mua sắm'}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  )
}
