import { Link } from 'react-router-dom'
import { useCategories } from '../../features/catalog/hooks'

export function CategoryNav() {
  const { data } = useCategories()
  const categories = data?.data ?? []

  if (categories.length === 0) return null

  return (
    <nav aria-label="Danh mục sản phẩm" className="border-t border-border bg-surface">
      <ul className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-2 text-sm">
        {categories.map((category) => (
          <li key={category.id} className="group relative shrink-0">
            <Link
              to={`/c/${category.slug}`}
              className="rounded text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {category.name}
            </Link>
            {category.children?.length > 0 && (
              <div className="invisible absolute left-0 top-full z-10 min-w-48 rounded-card border border-border bg-surface p-3 opacity-0 shadow-soft transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <ul className="flex flex-col gap-2">
                  {category.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={`/c/${child.slug}`}
                        className="block rounded text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
