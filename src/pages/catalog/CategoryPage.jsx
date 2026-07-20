import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { CatalogSkeleton } from '../../components/LoadingStates'
import { LoadErrorState } from '../../components/LoadErrorState'
import { useCategory, useCategories, useInfiniteProducts } from '../../features/catalog/hooks'
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'
import { DiscoverProductUnit } from './DiscoverProductUnit'
import { readCatalogUrlState, writeCatalogUrlState } from '../../lib/catalogUrlState'
import { CatalogFilterDrawer, CatalogFilterFields } from './CatalogFilterDrawer'
import { FeedbackState } from '../../components/FeedbackState'

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: '-created_at', label: 'Mới nhất' },
  { value: 'base_price', label: 'Giá: thấp → cao' },
  { value: '-base_price', label: 'Giá: cao → thấp' },
  { value: 'name', label: 'Tên: A → Z' },
  { value: '-name', label: 'Tên: Z → A' },
]

// Preset budgets map only to the supported BE price_min / price_max filters.
const PRICE_RANGES = [
  { value: '', label: 'Mọi mức giá', min: '', max: '' },
  { value: '0-2000000', label: 'Dưới 2 triệu', min: '', max: '2000000' },
  { value: '2000000-5000000', label: '2 – 5 triệu', min: '2000000', max: '5000000' },
  { value: '5000000-10000000', label: '5 – 10 triệu', min: '5000000', max: '10000000' },
  { value: '10000000-20000000', label: '10 – 20 triệu', min: '10000000', max: '20000000' },
  { value: '20000000-', label: 'Trên 20 triệu', min: '20000000', max: '' },
]

export function CategoryPage() {
  const { categorySlug } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAll = categorySlug === 'all'
  const { search, price: priceKey, sort } = readCatalogUrlState(searchParams)
  const [lensOpen, setLensOpen] = useState(false)
  // Remount the internally controlled search input when a constraint is cleared.

  const categoryQuery = useCategory(isAll ? undefined : categorySlug)
  const category = categoryQuery.data?.data

  const { data: categoriesData } = useCategories()
  const categoryPath = isAll ? [] : findCategoryPath(categoriesData?.data ?? [], categorySlug)
  const breadcrumbItems = [
    { label: 'Trang chủ', to: '/' },
    ...(isAll
      ? [{ label: 'Tất cả sản phẩm' }]
      : categoryPath.length > 0
        ? categoryPath.map((item, index) =>
            index === categoryPath.length - 1
              ? { label: item.name }
              : { label: item.name, to: `/c/${item.slug}` },
          )
        : [{ label: category?.name ?? 'Danh mục' }]),
  ]

  const flatCategories = useMemo(() => {
    const result = []
    const walk = (nodes, depth) =>
      nodes.forEach((node) => {
        result.push({ slug: node.slug, name: node.name, depth })
        if (node.children?.length) walk(node.children, depth + 1)
      })
    walk(categoriesData?.data ?? [], 0)
    return result
  }, [categoriesData])

  const priceRange = PRICE_RANGES.find((range) => range.value === priceKey) ?? PRICE_RANGES[0]

  const productsQuery = useInfiniteProducts({
    category: isAll ? undefined : categorySlug,
    search: search || undefined,
    priceMin: priceRange.min || undefined,
    priceMax: priceRange.max || undefined,
    sort: sort || undefined,
  })

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [productsQuery.data],
  )
  const hasProductData = Boolean(productsQuery.data)

  const updateUrlState = (updates) => setSearchParams(writeCatalogUrlState(searchParams, updates))
  const setSearch = (value) => updateUrlState({ search: value })
  const setPriceKey = (value) => updateUrlState({ price: value })
  const setSort = (value) => updateUrlState({ sort: value })

  const clearAll = () => {
    setSearchParams(writeCatalogUrlState(searchParams, { search: '', price: '', sort: '' }))
  }

  const clearSearch = () => {
    setSearch('')
  }

  const currentCategoryValue = isAll ? 'all' : categorySlug
  const handleCategoryChange = (value) => {
    const query = searchParams.toString()
    navigate(`${value === 'all' ? '/c/all' : `/c/${value}`}${query ? `?${query}` : ''}`)
  }
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label
  const hasCategoryFallback =
    !isAll && !flatCategories.some((item) => item.slug === categorySlug) && categorySlug

  const activeConstraints = [
    search
      ? { key: 'search', label: `“${search}”`, onRemove: clearSearch }
      : null,
    priceKey
      ? { key: 'price', label: priceRange.label, onRemove: () => setPriceKey('') }
      : null,
    sort
      ? { key: 'sort', label: sortLabel, onRemove: () => setSort('') }
      : null,
  ].filter(Boolean)

  const resultLabel = productsQuery.isLoading
    ? 'Đang mở các khả năng…'
    : productsQuery.isError && !hasProductData
      ? 'Chưa tải được sản phẩm'
      : productsQuery.hasNextPage ? `${products.length} sản phẩm đã tải` : `${products.length} sản phẩm`

  const pageTitle = isAll ? 'Tất cả sản phẩm' : (category?.name ?? 'Danh mục')

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-24">
        <header>
          <div className="mb-4 hidden sm:block">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <p className="text-sm font-medium text-ink/55">Khám phá</p>
          <h1 className="mt-1.5 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-ink">
            {pageTitle}
          </h1>
          {category?.description && (
            <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-ink/60 sm:block">
              {category.description}
            </p>
          )}

          {category?.children?.length > 0 && (
            <nav aria-label="Danh mục con" className="mt-4 flex gap-4 overflow-x-auto pb-1 text-sm">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  to={`/c/${child.slug}`}
                  className="shrink-0 border-b border-unbuilt pb-1 text-ink/70 transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  {child.name}
                </Link>
              ))}
            </nav>
          )}
        </header>

        {!isAll && categoryQuery.isError && !category && (
          <LoadErrorState
            title="Chưa thể tải thông tin danh mục"
            description="Tên và mô tả danh mục chưa tải được. Bộ lọc hiện tại vẫn được giữ để bạn thử lại."
            onRetry={() => categoryQuery.refetch()}
            isRetrying={categoryQuery.isFetching}
            compact
            className="mt-5"
          />
        )}

        {!isAll && categoryQuery.isError && category && (
          <LoadErrorState
            title="Chưa cập nhật được thông tin danh mục mới nhất"
            description="Đang hiển thị thông tin danh mục đã tải trước đó."
            onRetry={() => categoryQuery.refetch()}
            isRetrying={categoryQuery.isFetching}
            compact
            background
            className="mt-5"
          />
        )}

        <div className="mt-7 flex items-center justify-between gap-4 border-y border-unbuilt py-3"><p role="status" aria-live="polite" className="text-sm text-ink/65">{resultLabel}</p><CatalogFilterDrawer open={lensOpen} onOpenChange={setLensOpen} activeCount={activeConstraints.length}><CatalogFilterFields search={search} onSearchChange={setSearch} currentCategoryValue={currentCategoryValue} onCategoryChange={handleCategoryChange} categories={flatCategories} categoryFallback={hasCategoryFallback ? { slug: categorySlug, name: category?.name ?? 'Danh mục hiện tại' } : null} priceKey={priceKey} onPriceChange={setPriceKey} priceOptions={PRICE_RANGES} sort={sort} onSortChange={setSort} sortOptions={SORT_OPTIONS} /></CatalogFilterDrawer></div>

        {activeConstraints.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{activeConstraints.map((constraint) => <button key={constraint.key} type="button" aria-label={`Bỏ lọc ${constraint.label}`} onClick={constraint.onRemove} className="rounded-full border border-unbuilt px-3 py-1 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{constraint.label} <span aria-hidden="true">×</span></button>)}<button type="button" onClick={clearAll} className="text-xs text-ink/65 underline underline-offset-4">Xóa tất cả</button></div>}

        <div className="mt-6 grid items-start gap-8 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside aria-label="Lọc và sắp xếp sản phẩm" className="sticky top-28 hidden md:block"><CatalogFilterFields search={search} onSearchChange={setSearch} currentCategoryValue={currentCategoryValue} onCategoryChange={handleCategoryChange} categories={flatCategories} categoryFallback={hasCategoryFallback ? { slug: categorySlug, name: category?.name ?? 'Danh mục hiện tại' } : null} priceKey={priceKey} onPriceChange={setPriceKey} priceOptions={PRICE_RANGES} sort={sort} onSortChange={setSort} sortOptions={SORT_OPTIONS} /></aside>
          <div className="min-w-0">

        {productsQuery.isError && hasProductData && (
          <LoadErrorState
            title="Chưa cập nhật được danh sách mới nhất"
            description="Đang hiển thị các sản phẩm đã tải trước đó."
            onRetry={() => productsQuery.refetch()}
            isRetrying={productsQuery.isFetching}
            compact
            background
            className="mt-6"
          />
        )}

        {productsQuery.isLoading ? (
          <CatalogSkeleton />
        ) : productsQuery.isError && !hasProductData ? (
          <LoadErrorState
            title="Chưa thể tải sản phẩm"
            description="Có gián đoạn khi tải các lựa chọn trong danh mục này. Bộ lọc hiện tại vẫn được giữ để bạn thử lại."
            onRetry={() => productsQuery.refetch()}
            isRetrying={productsQuery.isFetching}
            className="mt-10"
          />
        ) : products.length === 0 ? (
          <FeedbackState title="Chưa tìm thấy sản phẩm phù hợp" description={activeConstraints.length > 0 ? 'Thử nới một điều kiện để xem thêm lựa chọn.' : 'Danh mục này hiện chưa có sản phẩm.'} action={activeConstraints.length > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 text-sm text-ink underline decoration-unbuilt underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                Xóa điều kiện
              </button>
            ) : (
              <Link
                to="/c/all"
                className="mt-4 inline-block text-sm text-ink underline decoration-unbuilt underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                Xem tất cả sản phẩm
              </Link>
            )} />
        ) : (
          <section
            aria-label="Trường sản phẩm"
            className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((product) => (
              <DiscoverProductUnit key={product.id} product={product} />
            ))}
          </section>
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
        </div>
      </div>
    </div>
  )
}
