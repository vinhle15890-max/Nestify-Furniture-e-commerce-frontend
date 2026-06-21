import { Link } from 'react-router-dom'

// A single chat bubble. `onNavigate` fires when a source chip is clicked so the
// panel can close itself as the user leaves for a product page.
export function ChatMessage({ message, onNavigate }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  const bubbleClass = isUser
    ? 'bg-primary text-surface'
    : isError
      ? 'bg-destructive/10 text-destructive'
      : 'bg-background text-foreground'

  const sources = (message.sources ?? []).filter(
    (source) => source.entity_type === 'product' && source.product_slug,
  )

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-card px-3 py-2 text-sm ${bubbleClass}`}>
        <p className="whitespace-pre-wrap break-words">{message.text}</p>

        {sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sources.map((source) => (
              <Link
                key={`${source.entity_type}-${source.entity_id}`}
                to={`/p/${source.product_slug}`}
                onClick={onNavigate}
                className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {source.product_name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
