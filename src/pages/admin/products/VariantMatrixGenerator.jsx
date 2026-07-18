import { useMemo, useState } from 'react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { useToastStore } from '../../../store/toastStore'
import { useBulkCreateVariants } from '../../../features/admin/products/hooks'
import { missingCombinations } from '../../../lib/variantOptions'

// Sinh các tổ hợp biến thể còn thiếu từ variant_options rồi gọi bulk tạo.
export function VariantMatrixGenerator({ productId, options, variants, onCreated }) {
  const addToast = useToastStore((s) => s.addToast)
  const bulkCreate = useBulkCreateVariants()
  const [basePrice, setBasePrice] = useState('')

  const missing = useMemo(() => missingCombinations(options ?? [], variants ?? []), [options, variants])
  const optionNames = (options ?? []).map((o) => o.name)

  const ready = (options ?? []).length > 0 && (options ?? []).every((o) => o.name && o.values.length > 0)

  const handleGenerate = async () => {
    if (missing.length > 50 && !window.confirm(`Sẽ tạo ${missing.length} biến thể. Tiếp tục?`)) return
    const price = Number(basePrice) || 0
    try {
      const res = await bulkCreate.mutateAsync({
        productId,
        variants: missing.map((attributes) => ({ attributes, price, stock_quantity: 0 })),
      })
      addToast({ title: `Đã tạo ${missing.length} biến thể.`, variant: 'success' })
      onCreated?.(res.data)
    } catch (error) {
      addToast({ title: 'Không thể tạo biến thể.', description: error.message, variant: 'error' })
    }
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Thêm thuộc tính và giá trị để sinh biến thể.</p>
  }

  if (missing.length === 0) {
    return <p className="text-sm text-muted-foreground">Mọi tổ hợp đã có biến thể.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Các tổ hợp biến thể chưa được tạo</caption>
          <thead className="bg-surface-alt text-left text-muted-foreground">
            <tr>{optionNames.map((n) => <th key={n} className="px-3 py-2">{n}</th>)}</tr>
          </thead>
          <tbody>
            {missing.map((combo, idx) => (
              <tr key={idx} className="border-t border-border">
                {optionNames.map((n) => <td key={n} className="px-3 py-2 text-foreground">{combo[n]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-end gap-3">
        <div className="w-40">
          <Input label="Giá gốc" id="variant-matrix-base-price" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </div>
        <Button type="button" onClick={handleGenerate} disabled={bulkCreate.isPending}>
          Tạo {missing.length} biến thể
        </Button>
      </div>
    </div>
  )
}
