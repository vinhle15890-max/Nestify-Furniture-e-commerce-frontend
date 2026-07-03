import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PackageSearch, X } from 'lucide-react'
import { ProductCard } from '../../components/ProductCard'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { Reveal } from '../../components/Reveal'
import { SearchInput } from '../../components/SearchInput'
import { useCategory, useCategories, useInfiniteProducts } from '../../features/catalog/hooks'
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: '-created_at', label: 'Mới nhất' },
  { value: 'base_price', label: 'Giá: thấp → cao' },
  { value: '-base_price', label: 'Giá: cao → thấp' },
  { value: 'name', label: 'Tên: A → Z' },
  { value: '-name', label: 'Tên: Z → A' },
]

// Preset budgets → BE filter[price_min]/filter[price_max] (VND).
const PRICE_RANGES = [
  { value: '', label: 'Mọi mức giá', min: '', max: '' },
  { value: '0-2000000', label: 'Dưới 2 triệu', min: '', max: '2000000' },
  { value: '2000000-5000000', label: '2 – 5 triệu', min: '2000000', max: '5000000' },
  { value: '5000000-10000000', label: '5 – 10 triệu', min: '5000000', max: '10000000' },
  { value: '10000000-20000000', label: '10 – 20 triệu', min: '10000000', max: '20000000' },
  { value: '20000000-', label: 'Trên 20 triệu', min: '20000000', max: '' },
]

const selectClass =
  'rounded-control border border-border-strong bg-surface px-4 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface py-1 pl-3 pr-1.5 text-xs text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ lọc ${label}`}
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
      >
        <X size={13} />
      </button>
    </span>
  )
}

export function CategoryPage() {
  const { categorySlug } = useParams()
  const navigate = useNavigate()
  const isAll = categorySlug === 'all'

  const [search, setSearch] = useState('')
  const [woodType, setWoodType] = useState('')
  const [priceKey, setPriceKey] = useState('')
  const [sort, setSort] = useState('')
  const [woodOptions, setWoodOptions] = useState([])
  // Bumped to remount the (uncontrolled) search box when filters are cleared.
  const [resetKey, setResetKey] = useState(0)

  const categoryQuery = useCategory(isAll ? undefined : categorySlug)
  const category = categoryQuery.data?.data

  const { data: categoriesData } = useCategories()
  const categoryPath = isAll ? [] : findCategoryPath(categoriesData?.data ?? [], categorySlug)
  const breadcrumbItems = [
    { label: 'Trang chủ', to: '/' },
    ...(isAll
      ? [{ label: 'Tất cả sản phẩm' }]
      : categoryPath.length > 0
        ? categoryPath.map((c, i) =>
            i === categoryPath.length - 1 ? { label: c.name } : { label: c.name, to: `/c/${c.slug}` },
          )
        : [{ label: category?.name ?? 'Danh mục' }]),
  ]

  // Flatten the category tree (with depth for indentation) for the picker.
  const flatCategories = useMemo(() => {
    const out = []
    const walk = (nodes, depth) =>
      nodes.forEach((node) => {
        out.push({ slug: node.slug, name: node.name, depth })
        if (node.children?.length) walk(node.children, depth + 1)
      })
    walk(categoriesData?.data ?? [], 0)
    return out
  }, [categoriesData])

  const priceRange = PRICE_RANGES.find((r) => r.value === priceKey) ?? PRICE_RANGES[0]

  const productsQuery = useInfiniteProducts({
    category: isAll ? undefined : categorySlug,
    search: search || undefined,
    woodType: woodType || undefined,
    priceMin: priceRange.min || undefined,
    priceMax: priceRange.max || undefined,
    sort: sort || undefined,
  })

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [productsQuery.data],
  )

  // Reset attribute filters and derived option lists whenever the category changes.
  useEffect(() => {
    setSearch('')
    setWoodType('')
    setPriceKey('')
    setSort('')
    setWoodOptions([])
    setResetKey((k) => k + 1)
  }, [categorySlug])

  // Accumulate wood-type options from loaded products (only grow, so options
  // never vanish once the result set is narrowed by a filter).
  useEffect(() => {
    if (products.length === 0) return
    setWoodOptions((prev) => {
      const set = new Set(prev)
      products.forEach((p) => p.attributes?.wood_type && set.add(p.attributes.wood_type))
      return set.size === prev.length ? prev : Array.from(set).sort()
    })
  }, [products])

  const hasActiveFilters = Boolean(search || woodType || priceKey || sort)

  const clearAll = () => {
    setSearch('')
    setWoodType('')
    setPriceKey('')
    setSort('')
    setResetKey((k) => k + 1)
  }

  const clearSearch = () => {
    setSearch('')
    setResetKey((k) => k + 1)
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label
  const currentCategoryValue = isAll ? 'all' : categorySlug
  const handleCategoryChange = (value) => navigate(value === 'all' ? '/all' : `/c/${value}`)

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <Reveal>
        <p className="eyebrow">Bộ sưu tập</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight text-foreground">
          {isAll ? 'Tất cả sản phẩm' : (category?.name ?? 'Danh mục')}
        </h1>
        {category?.description && (
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{category.description}</p>
        )}
      </Reveal>

      {category?.children?.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              to={`/c/${child.slug}`}
              className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      {/* Search + filter + sort toolbar */}
      <div className="mt-10 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SearchInput
            key={`search-${resetKey}`}
            placeholder="Tìm sản phẩm trong danh mục..."
            onDebouncedChange={setSearch}
            className="w-full lg:max-w-sm"
          />

          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Danh mục
              <select
                value={currentCategoryValue}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className={selectClass}
              >
                <option value="all">Tất cả sản phẩm</option>
                {!isAll && !flatCategories.some((c) => c.slug === categorySlug) && (
                  <option value={categorySlug}>{category?.name ?? 'Danh mục hiện tại'}</option>
                )}
                {flatCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {`${'— '.repeat(c.depth)}${c.name}`}
                  </option>
                ))}
              </select>
            </label>

            {woodOptions.length > 0 && (
              <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Chất liệu gỗ
                <select value={woodType} onChange={(event) => setWoodType(event.target.value)} className={selectClass}>
                  <option value="">Tất cả</option>
                  {woodOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Khoảng giá
              <select value={priceKey} onChange={(event) => setPriceKey(event.target.value)} className={selectClass}>
                {PRICE_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Sắp xếp
              <select value={sort} onChange={(event) => setSort(event.target.value)} className={selectClass}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Result count + active filter chips */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">
            {productsQuery.isLoading
              ? 'Đang tải...'
              : `${products.length}${productsQuery.hasNextPage ? '+' : ''} sản phẩm`}
          </span>
          {search && <FilterChip label={`“${search}”`} onRemove={clearSearch} />}
          {woodType && <FilterChip label={woodType} onRemove={() => setWoodType('')} />}
          {priceKey && <FilterChip label={priceRange.label} onRemove={() => setPriceKey('')} />}
          {sort && <FilterChip label={sortLabel} onRemove={() => setSort('')} />}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 text-xs font-medium text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="mt-20 flex justify-center">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-16 rounded-card border border-border bg-surface p-12 text-center">
          <PackageSearch size={36} className="mx-auto text-border-strong" />
          <p className="mt-4 text-muted-foreground">
            {hasActiveFilters
              ? 'Không có sản phẩm nào khớp bộ lọc.'
              : 'Chưa có sản phẩm nào trong danh mục này.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="mt-4 text-sm text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={(index % 4) * 70}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      )}

      {productsQuery.hasNextPage && (
        <div className="mt-16 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => productsQuery.fetchNextPage()}
            disabled={productsQuery.isFetchingNextPage}
          >
            {productsQuery.isFetchingNextPage ? 'Đang tải...' : 'Tải thêm'}
          </Button>
        </div>
      )}
    </div>
  )
}
