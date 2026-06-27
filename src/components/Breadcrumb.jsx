import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MoreHorizontal } from 'lucide-react'

// Breadcrumb generic: items = [{ label, to? }]; mục cuối (không `to`) = trang hiện tại.
// Gập mục giữa khi vượt maxItems; phát BreadcrumbList JSON-LD đầy đủ cho SEO.
export function Breadcrumb({ items = [], maxItems = 4 }) {
  const [expanded, setExpanded] = useState(false)

  // SEO: BreadcrumbList JSON-LD — luôn đầy đủ mọi item, không phụ thuộc việc gập hiển thị.
  useEffect(() => {
    if (items.length < 2 || typeof document === 'undefined') return undefined
    const origin = window.location?.origin ?? ''
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-nestify-breadcrumb', 'true')
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        ...(item.to ? { item: origin + item.to } : { item: window.location?.href ?? '' }),
      })),
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [items])

  if (items.length < 2) return null

  // Gập: giữ mục đầu + 2 mục cuối; phần giữa thay bằng nút "…".
  const collapsed = !expanded && items.length > maxItems
  const visible = collapsed ? [items[0], ...items.slice(-2)] : items
  const ellipsisAfterFirst = collapsed

  const renderItem = (item, isLast) => {
    if (isLast || !item.to) {
      return (
        <span aria-current="page" className="block max-w-[16rem] truncate text-foreground" title={item.label}>
          {item.label}
        </span>
      )
    }
    return (
      <Link
        to={item.to}
        title={item.label}
        className="block max-w-[16rem] truncate text-muted-foreground transition-colors hover:text-accent"
      >
        {item.label}
      </Link>
    )
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight size={14} className="shrink-0 text-border-strong" aria-hidden="true" />}
              {renderItem(item, isLast)}
              {index === 0 && ellipsisAfterFirst && (
                <>
                  <ChevronRight size={14} className="shrink-0 text-border-strong" aria-hidden="true" />
                  <button
                    type="button"
                    aria-label="Hiện đầy đủ đường dẫn"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center text-muted-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <MoreHorizontal size={16} aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
