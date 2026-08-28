import * as Dialog from '@radix-ui/react-dialog'
import { SlidersHorizontal, X } from 'lucide-react'
import { SearchInput } from '../../components/SearchInput'

const selectClass = 'w-full rounded-control border border-unbuilt bg-canvas px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function CatalogFilterFields({ search, onSearchChange, currentCategoryValue, onCategoryChange, categories, categoryFallback, priceKey, onPriceChange, priceOptions, sort, onSortChange, sortOptions, journeyOrderActive = false, onUseDefaultOrder }) {
  return (
    <div className="space-y-5">
      <div><span className="mb-1.5 block text-sm font-medium text-ink">Tìm trong danh mục</span><SearchInput initialValue={search} placeholder="Tên sản phẩm…" onDebouncedChange={onSearchChange} /></div>
      <label className="block text-sm font-medium text-ink">Danh mục<select value={currentCategoryValue} onChange={(event) => onCategoryChange(event.target.value)} className={`mt-1.5 ${selectClass}`}><option value="all">Tất cả sản phẩm</option>{categoryFallback && <option value={categoryFallback.slug}>{categoryFallback.name}</option>}{categories.map((category) => <option key={category.slug} value={category.slug}>{`${'— '.repeat(category.depth)}${category.name}`}</option>)}</select></label>
      <label className="block text-sm font-medium text-ink">Khoảng giá<select value={priceKey} onChange={(event) => onPriceChange(event.target.value)} className={`mt-1.5 ${selectClass}`}>{priceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="block text-sm font-medium text-ink">Sắp xếp<select value={sort} onChange={(event) => onSortChange(event.target.value)} className={`mt-1.5 ${selectClass}`}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      {journeyOrderActive && <div role="status" className="border-l-2 border-emerging pl-3 text-xs leading-relaxed text-ink/65"><p>Một số lựa chọn liên quan đến hành trình của bạn được đưa lên trước.</p><button type="button" onClick={onUseDefaultOrder} className="mt-2 min-h-11 text-ink/65 underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Dùng thứ tự mặc định</button></div>}
    </div>
  )
}

export function CatalogFilterDrawer({ open, onOpenChange, activeCount, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild><button type="button" aria-label={open ? 'Đóng tìm kiếm, lọc và sắp xếp' : 'Mở tìm kiếm, lọc và sắp xếp'} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-ink px-4 py-2 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"><SlidersHorizontal size={17} aria-hidden="true" /><span aria-hidden="true">Lọc và sắp xếp{activeCount > 0 ? ` (${activeCount})` : ''}</span></button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-[min(90vw,24rem)] overflow-y-auto bg-canvas px-5 pb-8 pt-5 shadow-card focus:outline-none">
          <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-medium text-ink">Lọc sản phẩm</Dialog.Title><Dialog.Description className="mt-1 text-sm text-ink/60">Thu hẹp lựa chọn theo nhu cầu của bạn.</Dialog.Description></div><Dialog.Close className="rounded-control p-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Đóng bộ lọc"><X size={20} aria-hidden="true" /></Dialog.Close></div>
          <div className="mt-7">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
