import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import { ProductCard } from '../../components/ProductCard'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { Reveal } from '../../components/Reveal'
import { useCategory, useCategories, useInfiniteProducts } from '../../features/catalog/hooks'
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: '-created_at', label: 'Mới nhất' },
  { value: 'base_price', label: 'Giá tăng dần' },
  { value: '-base_price', label: 'Giá giảm dần' },
]

const selectClass =
  'rounded-control border border-border-strong bg-surface px-4 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function CategoryPage() {
  const { categorySlug } = useParams()
  const isAll = categorySlug === 'all'
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('')
  const [brandOptions, setBrandOptions] = useState([])

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

  const productsQuery = useInfiniteProducts({
    category: isAll ? undefined : categorySlug,
    brand: brand || undefined,
    sort: sort || undefined,
  })

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [productsQuery.data],
  )

  useEffect(() => {
    if (brand !== '') return
    const brands = new Set()
    products.forEach((product) => {
      if (product.attributes?.brand) brands.add(product.attributes.brand)
    })
    if (brands.size > 0) setBrandOptions(Array.from(brands).sort())
  }, [brand, products])

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

      <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <p className="text-sm text-muted-foreground">
          {products.length > 0 ? `${products.length} sản phẩm` : ''}
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Thương hiệu
            <select value={brand} onChange={(event) => setBrand(event.target.value)} className={selectClass}>
              <option value="">Tất cả</option>
              {brandOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
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

      {productsQuery.isLoading ? (
        <div className="mt-20 flex justify-center">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-16 rounded-card border border-border bg-surface p-12 text-center">
          <PackageSearch size={36} className="mx-auto text-border-strong" />
          <p className="mt-4 text-muted-foreground">
            {brand ? 'Không có sản phẩm nào khớp bộ lọc.' : 'Chưa có sản phẩm nào trong danh mục này.'}
          </p>
          {brand && (
            <button
              type="button"
              onClick={() => setBrand('')}
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
