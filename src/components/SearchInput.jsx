import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

// Controlled-ish search box that debounces upward to avoid a request per keystroke.
// `onDebouncedChange` fires `delay` ms after typing stops.
export function SearchInput({ placeholder = 'Tìm kiếm...', onDebouncedChange, delay = 300, className = '' }) {
  const [value, setValue] = useState('')
  const callbackRef = useRef(onDebouncedChange)

  useEffect(() => {
    callbackRef.current = onDebouncedChange
  }, [onDebouncedChange])

  useEffect(() => {
    const id = setTimeout(() => callbackRef.current(value.trim()), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-control border border-border bg-surface py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Xóa tìm kiếm"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
