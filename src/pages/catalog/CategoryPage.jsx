import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ProductCard } from '../../components/ProductCard'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { useCategory, useInfiniteProducts } from '../../features/catalog/hooks'

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: '-created_at', label: 'Mới nhất' },
  { value: 'base_price', label: 'Giá tăng dần' },
  { value: '-base_price', label: 'Giá giảm dần' },
]

export function CategoryPage() {
  const { categorySlug } = useParams()
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState('')
  const [brandOptions, setBrandOptions] = useState([])

  const categoryQuery = useCategory(categorySlug)
  const category = categoryQuery.data?.data

  const productsQuery = useInfiniteProducts({
    category: categorySlug,
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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">{category?.name ?? 'Danh mục'}</h1>

      {category?.children?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              to={`/c/${child.slug}`}
              className="rounded-full border border-border px-3 py-1 text-sm text-foreground hover:border-primary hover:text-primary"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Thương hiệu
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            {brandOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          Sắp xếp
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {productsQuery.isLoading ? (
        <div className="mt-12 flex justify-center">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <p className="mt-12 text-muted-foreground">Không có sản phẩm nào.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {productsQuery.hasNextPage && (
        <div className="mt-8 flex justify-center">
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
