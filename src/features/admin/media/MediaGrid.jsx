import { CheckCircle2 } from 'lucide-react'

export function MediaGrid({ items = [], selectedIds = [], onToggle, attachedAssetIds = [] }) {
  return (
    <ul className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((asset) => {
        const selected = selectedIds.includes(asset.id)
        const attached = attachedAssetIds.includes(asset.id)
        return (
          <li key={asset.id} className="min-w-0">
            <button
              type="button"
              onClick={() => !attached && onToggle(asset)}
              aria-pressed={selected}
              disabled={attached}
              className={`relative block aspect-square w-full overflow-hidden rounded-control border ${
                selected ? 'border-foreground ring-2 ring-ring' : 'border-border'
              } ${attached ? 'opacity-40' : 'hover:border-border-strong'}`}
            >
              {asset.type === 'video' ? (
                <video src={asset.url} className="h-full w-full object-cover" />
              ) : (
                <img src={asset.url} alt={asset.alt_text ?? ''} className="h-full w-full object-cover" />
              )}
              {selected && <CheckCircle2 size={18} className="absolute right-1 top-1 text-foreground" aria-hidden="true" />}
              {asset.usage_count > 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 py-0.5 text-[10px] text-surface">
                  {asset.usage_count} nơi
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
