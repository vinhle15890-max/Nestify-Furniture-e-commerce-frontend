import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({ page, lastPage, onPageChange }) {
  if (lastPage <= 1) return null

  const candidates = new Set([1, lastPage])
  for (let p = Math.max(1, page - 1); p <= Math.min(lastPage, page + 1); p += 1) candidates.add(p)
  const pages = [...candidates].sort((a, b) => a - b)
  const items = []
  pages.forEach((p, index) => {
    if (index > 0 && p - pages[index - 1] > 1) items.push(`ellipsis-${p}`)
    items.push(p)
  })

  return (
    <nav aria-label="Phân trang" className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:gap-2">
      <Button
        variant="ghost"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="min-h-10 min-w-10 px-3 py-2"
      >
        <ChevronLeft size={18} />
      </Button>

      {items.map((item) => typeof item === 'string' ? (
        <span key={item} aria-hidden="true" className="px-1 text-muted-foreground">…</span>
      ) : (
        <Button
          key={item}
          variant={item === page ? 'primary' : 'ghost'}
          aria-current={item === page ? 'page' : undefined}
          onClick={() => onPageChange(item)}
          className="min-h-10 min-w-10 px-3 py-2"
        >
          {item}
        </Button>
      ))}

      <Button
        variant="ghost"
        aria-label="Trang sau"
        disabled={page >= lastPage}
        onClick={() => onPageChange(page + 1)}
        className="min-h-10 min-w-10 px-3 py-2"
      >
        <ChevronRight size={18} />
      </Button>
    </nav>
  )
}
