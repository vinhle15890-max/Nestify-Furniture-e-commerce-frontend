import { variantSignature } from '../../lib/variantOptions'

function variantSignatures(variants, options) {
  const all = new Set()
  const inStock = new Set()
  for (const v of variants ?? []) {
    if (v.is_active === false) continue
    const signature = variantSignature(v.attributes ?? {}, options)
    all.add(signature)
    if ((v.available_stock ?? 0) > 0) inStock.add(signature)
  }
  return { all, inStock }
}

export function ProductOptions({ options, variants, selected, onSelect }) {
  const signatures = variantSignatures(variants, options)

  const hasMatchingVariant = (signatureSet, optionName, label) => {
    const probe = { ...selected, [optionName]: label }
    for (const sig of signatureSet) {
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
              const exists = hasMatchingVariant(signatures.all, option.name, v.label)
              const inStock = hasMatchingVariant(signatures.inStock, option.name, v.label)
              const accessibleLabel = `${v.label}${exists && !inStock ? ' (Tạm hết hàng)' : ''}`
              return option.type === 'color' ? (
                <button
                  key={v.label}
                  type="button"
                  aria-label={accessibleLabel}
                  aria-pressed={active}
                  disabled={!exists}
                  onClick={() => onSelect(option.name, v.label)}
                  className={`h-11 w-11 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 ${
                    active ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-border'
                  }`}
                  style={{ backgroundColor: v.hex }}
                />
              ) : option.type === 'surface' ? (
                <button
                  key={v.label}
                  type="button"
                  aria-label={accessibleLabel}
                  aria-pressed={active}
                  disabled={!exists}
                  onClick={() => onSelect(option.name, v.label)}
                  className={`flex min-w-28 items-center gap-2 rounded-control border p-1.5 pr-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 ${active ? 'border-ink bg-unbuilt/35' : 'border-border hover:border-border-strong'}`}
                >
                  <img src={v.image_url} alt="" className="size-11 shrink-0 rounded-control object-cover" />
                  <span>{v.label}{exists && !inStock ? <span className="block text-xs text-muted-foreground">Hết hàng</span> : null}</span>
                </button>
              ) : (
                <button
                  key={v.label}
                  type="button"
                  aria-label={accessibleLabel}
                  aria-pressed={active}
                  disabled={!exists}
                  onClick={() => onSelect(option.name, v.label)}
                  className={`rounded-control border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-30 ${
                    active ? 'border-foreground bg-surface-alt' : 'border-border hover:border-border-strong'
                  }`}
                >
                  {v.label}{exists && !inStock ? <span className="ml-2 text-muted-foreground">Hết hàng</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
