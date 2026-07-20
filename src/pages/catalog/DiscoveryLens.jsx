import { SlidersHorizontal, X } from 'lucide-react'
import { SearchInput } from '../../components/SearchInput'

const selectClass =
  'w-full rounded-control border border-unbuilt bg-canvas px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

function ActiveConstraint({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-unbuilt bg-canvas py-1 pl-3 pr-1.5 text-xs text-ink/75">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ lọc ${label}`}
        className="rounded-full p-1 text-ink/55 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  )
}

export function DiscoveryLens({
  open,
  onToggle,
  resultLabel,
  activeConstraints,
  onClearAll,
  resetKey,
  onSearchChange,
  currentCategoryValue,
  onCategoryChange,
  categories,
  categoryFallback,
  priceKey,
  onPriceChange,
  priceOptions,
  sort,
  onSortChange,
  sortOptions,
}) {
  const activeCount = activeConstraints.length
  const panelId = 'product-discovery-lens-controls'

  return (
    <section aria-label="Ống kính khám phá" className="mt-5 border-b border-unbuilt pb-4 sm:mt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-ink/65"
          >
            {resultLabel}
          </span>
          {activeConstraints.map((constraint) => (
            <ActiveConstraint
              key={constraint.key}
              label={constraint.label}
              onRemove={constraint.onRemove}
            />
          ))}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-ink/65 underline decoration-unbuilt underline-offset-4 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Đóng tìm kiếm, lọc và sắp xếp' : 'Mở tìm kiếm, lọc và sắp xếp'}
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-ink/25 px-3.5 py-2 text-sm text-ink transition-colors hover:border-ink/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>Điều chỉnh</span>
          {activeCount > 0 && (
            <span className="min-w-5 text-center text-xs tabular-nums text-ink/60" aria-hidden="true">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div id={panelId} className="mt-4 border-t border-unbuilt pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.3fr)_repeat(3,minmax(10rem,0.8fr))] lg:items-end">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink/55">
                Tìm kiếm
              </span>
              <SearchInput
                key={`search-${resetKey}`}
                placeholder="Tìm sản phẩm trong danh mục..."
                onDebouncedChange={onSearchChange}
                className="w-full"
              />
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/55">
              Danh mục
              <select
                value={currentCategoryValue}
                onChange={(event) => onCategoryChange(event.target.value)}
                className={selectClass}
              >
                <option value="all">Tất cả sản phẩm</option>
                {categoryFallback && (
                  <option value={categoryFallback.slug}>{categoryFallback.name}</option>
                )}
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {`${'— '.repeat(category.depth)}${category.name}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/55">
              Khoảng giá
              <select value={priceKey} onChange={(event) => onPriceChange(event.target.value)} className={selectClass}>
                {priceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/55">
              Sắp xếp
              <select value={sort} onChange={(event) => onSortChange(event.target.value)} className={selectClass}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </section>
  )
}
