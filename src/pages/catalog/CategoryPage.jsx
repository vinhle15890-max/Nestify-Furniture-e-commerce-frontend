import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { useCategory, useCategories, useInfiniteProducts } from '../../features/catalog/hooks'
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'
import { DiscoveryLens } from './DiscoveryLens'
import { DiscoverProductUnit } from './DiscoverProductUnit'

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
  const [searchParams] = useSearchParams()
  const isAll = categorySlug === 'all'

  const [search, setSearch] = useState(() => searchParams.get('search')?.trim() ?? '')
  const [priceKey, setPriceKey] = useState('')
  const [sort, setSort] = useState('')
  const [lensOpen, setLensOpen] = useState(false)
  // Remount the internally controlled search input when a constraint is cleared.
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

  useEffect(() => {
    setSearch(searchParams.get('search')?.trim() ?? '')
    setPriceKey('')
    setSort('')
    setLensOpen(false)
    setResetKey((key) => key + 1)
  }, [categorySlug, searchParams])

  const clearAll = () => {
    setSearch('')
    setPriceKey('')
    setSort('')
    setResetKey((key) => key + 1)
  }

  const clearSearch = () => {
    setSearch('')
    setResetKey((key) => key + 1)
  }

  const currentCategoryValue = isAll ? 'all' : categorySlug
  const handleCategoryChange = (value) => navigate(value === 'all' ? '/c/all' : `/c/${value}`)
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
      : `${products.length}${productsQuery.hasNextPage ? '+' : ''} sản phẩm`

  const pageTitle = isAll ? 'Tất cả sản phẩm' : (category?.name ?? 'Danh mục')

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-24">
        <header>
          <div className="mb-4 hidden sm:block">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink/55">Khám phá</p>
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

        <DiscoveryLens
          open={lensOpen}
          onToggle={() => setLensOpen((current) => !current)}
          resultLabel={resultLabel}
          activeConstraints={activeConstraints}
          onClearAll={clearAll}
          resetKey={resetKey}
          onSearchChange={setSearch}
          currentCategoryValue={currentCategoryValue}
          onCategoryChange={handleCategoryChange}
          categories={flatCategories}
          categoryFallback={
            hasCategoryFallback ? { slug: categorySlug, name: category?.name ?? 'Danh mục hiện tại' } : null
          }
          priceKey={priceKey}
          onPriceChange={setPriceKey}
          priceOptions={PRICE_RANGES}
          sort={sort}
          onSortChange={setSort}
          sortOptions={SORT_OPTIONS}
        />

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
          <div className="mt-16 flex justify-center">
            <Spinner />
          </div>
        ) : productsQuery.isError && !hasProductData ? (
          <LoadErrorState
            title="Chưa thể tải sản phẩm"
            description="Có gián đoạn khi tải các lựa chọn trong danh mục này. Bộ lọc hiện tại vẫn được giữ để bạn thử lại."
            onRetry={() => productsQuery.refetch()}
            isRetrying={productsQuery.isFetching}
            className="mt-10"
          />
        ) : products.length === 0 ? (
          <section className="mt-10 max-w-md border-l-2 border-unbuilt pl-5">
            <h2 className="font-display text-xl text-ink">Chưa có khả năng nào trong trường nhìn này.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              {activeConstraints.length > 0
                ? 'Thử nới một điều kiện để mở lại trường sản phẩm.'
                : 'Danh mục này hiện chưa có sản phẩm để khám phá.'}
            </p>
            {activeConstraints.length > 0 ? (
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
            )}
          </section>
        ) : (
          <section
            aria-label="Trường sản phẩm"
            className="mt-5 grid grid-cols-2 gap-x-2 gap-y-9 sm:mt-6 sm:gap-x-3 sm:gap-y-12 md:grid-cols-3"
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
  )
}
