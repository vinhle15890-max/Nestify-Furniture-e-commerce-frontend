import { Link } from 'react-router-dom'
import { ArrowUpRight, Image as ImageIcon } from 'lucide-react'
import { formatPrice } from '../../lib/format'

// A single chat bubble. `onNavigate` fires when a source chip is clicked so the
// panel can close itself as the user leaves for a product page.
export function ChatMessage({ message, onNavigate }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  const bubbleClass = isUser
    ? 'bg-primary text-primary-foreground'
    : isError
      ? 'bg-destructive/10 text-destructive'
      : 'text-foreground'

  const sources = (message.sources ?? []).filter(
    (source) => source.entity_type === 'product' && source.product_slug,
  )

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${isUser ? 'max-w-[85%] rounded-card px-3 py-2' : 'w-full py-1'} text-sm ${bubbleClass}`}>
        <p className="whitespace-pre-wrap break-words leading-6">{message.text}</p>

        {sources.length > 0 && (
          <div className="mt-3 grid gap-2" aria-label="Sản phẩm được nhắc đến">
            {sources.slice(0, 3).map((source) => (
              <Link
                key={`${source.entity_type}-${source.entity_id}`}
                to={`/p/${source.product_slug}`}
                onClick={onNavigate}
                className="group grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-control border border-border bg-surface p-2 text-foreground transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-16 items-center justify-center overflow-hidden rounded-control bg-surface-alt">
                  {source.product_thumbnail ? (
                    <img
                      src={source.product_thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <ImageIcon size={20} className="text-muted-foreground" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{source.product_name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {source.product_price != null ? `Từ ${formatPrice(source.product_price)}` : 'Xem thông tin sản phẩm'}
                  </span>
                </span>
                <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
