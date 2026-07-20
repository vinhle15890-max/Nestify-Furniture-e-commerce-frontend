import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useCategories, useInfiniteProducts } from '../../features/catalog/hooks'

function flattenCategories(nodes, result = []) {
  nodes.forEach((node) => {
    result.push(node)
    if (node.children?.length) flattenCategories(node.children, result)
  })
  return result
}

export function GlobalSearch({ compact = false, onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const initialQuery = location.pathname.startsWith('/c/') ? new URLSearchParams(location.search).get('search') ?? '' : ''
  const [query, setQuery] = useState(initialQuery)
  const [focused, setFocused] = useState(false)
  const trimmed = query.trim()
  const enabled = focused && trimmed.length >= 2
  const productsQuery = useInfiniteProducts({ search: trimmed, limit: 5 }, { enabled })
  const categoriesQuery = useCategories({ enabled })
  const products = productsQuery.data?.pages?.[0]?.data?.slice(0, 5) ?? []
  const categories = useMemo(
    () => flattenCategories(categoriesQuery.data?.data ?? []).filter((category) => (
      category.name.toLocaleLowerCase('vi').includes(trimmed.toLocaleLowerCase('vi'))
    )).slice(0, 4),
    [categoriesQuery.data, trimmed],
  )
  const showSuggestions = enabled && (products.length > 0 || categories.length > 0 || productsQuery.isFetching)

  const submit = (event) => {
    event.preventDefault()
    if (!trimmed) return
    setFocused(false)
    onNavigate?.()
    navigate(`/c/all?search=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className={`relative ${compact ? 'w-full' : 'w-[clamp(12rem,20vw,18rem)]'}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    }}>
      <form role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor={compact ? 'mobile-global-search' : 'desktop-global-search'}>Tìm sản phẩm hoặc danh mục</label>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={compact ? 'mobile-global-search' : 'desktop-global-search'}
          type="search"
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm sản phẩm…"
          autoComplete="off"
          className="w-full rounded-control border border-border bg-surface/90 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm" className="absolute right-2.5 top-2 rounded-control p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </form>

      {showSuggestions && (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-border bg-surface p-3 shadow-card">
          {productsQuery.isFetching && products.length === 0 ? (
            <p role="status" className="px-2 py-3 text-sm text-muted-foreground">Đang tìm…</p>
          ) : (
            <>
              {products.length > 0 && (
                <section aria-labelledby={`${compact ? 'mobile' : 'desktop'}-product-suggestions`}>
                  <h2 id={`${compact ? 'mobile' : 'desktop'}-product-suggestions`} className="px-2 text-xs font-medium text-muted-foreground">Sản phẩm</h2>
                  <ul className="mt-1">
                    {products.map((product) => <li key={product.id}><Link to={`/p/${product.slug}`} onClick={onNavigate} className="block rounded-control px-2 py-2 text-sm text-foreground hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{product.name}</Link></li>)}
                  </ul>
                </section>
              )}
              {categories.length > 0 && (
                <section aria-labelledby={`${compact ? 'mobile' : 'desktop'}-category-suggestions`} className={products.length ? 'mt-3 border-t border-border pt-3' : ''}>
                  <h2 id={`${compact ? 'mobile' : 'desktop'}-category-suggestions`} className="px-2 text-xs font-medium text-muted-foreground">Danh mục</h2>
                  <ul className="mt-1">
                    {categories.map((category) => <li key={category.id}><Link to={`/c/${category.slug}`} onClick={onNavigate} className="block rounded-control px-2 py-2 text-sm text-foreground hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{category.name}</Link></li>)}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
