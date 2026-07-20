import { variantSignature } from '../../lib/variantOptions'

// Tập signature của các biến thể CÒN HÀNG.
function inStockSignatures(variants, options) {
  const set = new Set()
  for (const v of variants ?? []) {
    if ((v.available_stock ?? 0) > 0) set.add(variantSignature(v.attributes ?? {}, options))
  }
  return set
}

export function ProductOptions({ options, variants, selected, onSelect }) {
  const stock = inStockSignatures(variants, options)

  // 1 value có khả dụng không: tồn tại ÍT NHẤT 1 biến thể còn hàng khớp lựa chọn hiện tại + value này.
  const isAvailable = (optionName, label) => {
    const probe = { ...selected, [optionName]: label }
    for (const sig of stock) {
      const parts = sig.split('\x01')
      const ok = options.every((o, idx) => {
        const want = probe[o.name]
        return want == null || parts[idx] === want
      })
      if (ok) return true
    }
    return false
  }

  return (
    <div className="flex flex-col gap-5">
      {options.map((option) => (
        <div key={option.name}>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{option.name}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((v) => {
              const active = selected[option.name] === v.label
              const available = isAvailable(option.name, v.label)
              return option.type === 'color' ? (
                <button
                  key={v.label}
                  type="button"
                  aria-label={v.label}
                  aria-pressed={active}
                  disabled={!available}
                  onClick={() => onSelect(option.name, v.label)}
                  className={`h-11 w-11 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 ${
                    active ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-border'
                  }`}
                  style={{ backgroundColor: v.hex }}
                />
              ) : (
                <button
                  key={v.label}
                  type="button"
                  aria-pressed={active}
                  disabled={!available}
                  onClick={() => onSelect(option.name, v.label)}
                  className={`rounded-control border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-30 ${
                    active ? 'border-foreground bg-surface-alt' : 'border-border hover:border-border-strong'
                  }`}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
