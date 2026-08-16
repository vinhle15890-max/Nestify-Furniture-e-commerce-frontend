/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
import { useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { ConfirmActionDialog } from '../../../components/ConfirmActionDialog'
import { useToastStore } from '../../../store/toastStore'
import { useBulkCreateVariants } from '../../../features/admin/products/hooks'
import { missingCombinations } from '../../../lib/variantOptions'

/* Hallmark · component: variant matrix workflow · genre: modern-minimal · theme: existing Nestify admin
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: inherited from verified semantic tokens
 */

// Sinh các tổ hợp biến thể còn thiếu từ variant_options rồi gọi bulk tạo.
export function VariantMatrixGenerator({ productId, options, variants, onCreated, onBeforeGenerate }) {
  const addToast = useToastStore((s) => s.addToast)
  const bulkCreate = useBulkCreateVariants()
  const [basePrice, setBasePrice] = useState('')
  const [baseStock, setBaseStock] = useState('0')
  const [rows, setRows] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const missing = useMemo(() => missingCombinations(options ?? [], variants ?? []), [options, variants])
  const optionNames = (options ?? []).map((o) => o.name)
  const missingKey = JSON.stringify(missing)

  const ready = (options ?? []).length > 0 && (options ?? []).every((o) => o.name && o.values.length > 0)

  useEffect(() => {
    setRows((current) =>
      missing.map((attributes) => {
        const signature = JSON.stringify(attributes)
        const existing = current.find((row) => row.signature === signature)
        return existing ?? { signature, attributes, price: '', stock_quantity: '0' }
      }),
    )
  }, [missingKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const patchRow = (signature, patch) => {
    setRows((current) => current.map((row) => (row.signature === signature ? { ...row, ...patch } : row)))
  }

  const applyDefaults = () => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        price: basePrice,
        stock_quantity: baseStock,
      })),
    )
  }

  const handleGenerate = async (confirmed = false) => {
    if (missing.length > 50 && !confirmed) {
      setConfirmOpen(true)
      return
    }
    try {
      const canContinue = await onBeforeGenerate?.()
      if (canContinue === false) return
      const res = await bulkCreate.mutateAsync({
        productId,
        variants: rows.map(({ attributes, price, stock_quantity }) => ({
          attributes,
          price: Number(price) || 0,
          stock_quantity: Math.max(0, Number(stock_quantity) || 0),
        })),
      })
      addToast({ title: `Đã tạo ${missing.length} biến thể.`, variant: 'success' })
      setConfirmOpen(false)
      onCreated?.(res.data)
    } catch (error) {
      addToast({ title: 'Không thể tạo biến thể.', description: error.message, variant: 'error' })
    }
  }

  if (!ready) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt/40 px-4 py-5 text-sm text-muted-foreground">
        Thêm ít nhất một thuộc tính và một giá trị. Các tổ hợp sẽ xuất hiện ở đây để bạn nhập giá và tồn kho.
      </div>
    )
  }

  if (missing.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-card bg-success/10 px-4 py-3 text-sm text-foreground">
        <Check size={16} aria-hidden="true" /> Mọi tổ hợp đã được tạo.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-card bg-surface-alt/60 p-4">
        <div className="min-w-[10rem] flex-1">
          <Input
            label="Giá áp dụng chung"
            id="variant-matrix-base-price"
            type="number"
            min="0"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
          />
        </div>
        <div className="min-w-[9rem] flex-1">
          <Input
            label="Tồn kho áp dụng chung"
            id="variant-matrix-base-stock"
            type="number"
            min="0"
            value={baseStock}
            onChange={(e) => setBaseStock(e.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" onClick={applyDefaults}>
          <Copy size={16} aria-hidden="true" /> Áp dụng cho tất cả
        </Button>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Nhập giá và tồn kho cho các tổ hợp biến thể chưa được tạo</caption>
          <thead className="bg-surface-alt text-left text-muted-foreground">
            <tr>
              {optionNames.map((n) => <th key={n} className="px-3 py-2 font-medium">{n}</th>)}
              <th className="min-w-[10rem] px-3 py-2 font-medium">Giá bán</th>
              <th className="min-w-[8rem] px-3 py-2 font-medium">Tồn kho</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.signature} className="border-t border-border">
                {optionNames.map((n) => <td key={n} className="px-3 py-3 font-medium text-foreground">{row.attributes[n]}</td>)}
                <td className="px-3 py-2">
                  <input
                    aria-label={`Giá bán ${optionNames.map((name) => row.attributes[name]).join(' / ')}`}
                    type="number"
                    min="0"
                    value={row.price}
                    onChange={(event) => patchRow(row.signature, { price: event.target.value })}
                    className="h-11 w-full rounded-control border border-border bg-surface px-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    aria-label={`Tồn kho ${optionNames.map((name) => row.attributes[name]).join(' / ')}`}
                    type="number"
                    min="0"
                    value={row.stock_quantity}
                    onChange={(event) => patchRow(row.signature, { stock_quantity: event.target.value })}
                    className="h-11 w-full rounded-control border border-border bg-surface px-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Cấu hình thuộc tính sẽ được lưu tự động trước khi tạo.
        </p>
        <Button type="button" onClick={handleGenerate} disabled={bulkCreate.isPending || rows.length === 0}>
          {bulkCreate.isPending ? 'Đang tạo…' : `Lưu và tạo ${missing.length} biến thể`}
        </Button>
      </div>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Tạo số lượng lớn biến thể?"
        consequence={`Hệ thống sẽ tạo ${missing.length} biến thể còn thiếu với giá và tồn kho đang hiển thị. Hãy kiểm tra các giá trị trước khi tiếp tục.`}
        confirmLabel={`Tạo ${missing.length} biến thể`}
        onConfirm={() => handleGenerate(true)}
        pending={bulkCreate.isPending}
      />
    </div>
  )
}
