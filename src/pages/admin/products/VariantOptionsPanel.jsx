import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'

// Editor controlled cho products.variant_options.
// value: [{ name, type:'text'|'color', values:[{label, hex?}] }]
export function VariantOptionsPanel({ value, onChange }) {
  const options = value ?? []

  const update = (next) => onChange(next)
  const patchOption = (i, patch) => update(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))

  const addOption = () => update([...options, { name: '', type: 'text', values: [] }])
  const removeOption = (i) => update(options.filter((_, idx) => idx !== i))

  const addValue = (i) =>
    patchOption(i, { values: [...options[i].values, options[i].type === 'color' ? { label: '', hex: '#000000' } : { label: '' }] })
  const patchValue = (i, j, patch) =>
    patchOption(i, { values: options[i].values.map((v, idx) => (idx === j ? { ...v, ...patch } : v)) })
  const removeValue = (i, j) => patchOption(i, { values: options[i].values.filter((_, idx) => idx !== j) })

  return (
    <div className="flex flex-col gap-5">
      {options.map((option, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Tên thuộc tính"
                value={option.name}
                onChange={(e) => patchOption(i, { name: e.target.value })}
                placeholder="vd: Màu sắc"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Loại</label>
              <select
                aria-label={`Loại thuộc tính ${i + 1}`}
                value={option.type}
                onChange={(e) => patchOption(i, { type: e.target.value })}
                className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="text">Chữ</option>
                <option value="color">Màu sắc</option>
              </select>
            </div>
            <Button type="button" variant="secondary" aria-label="Xóa thuộc tính" onClick={() => removeOption(i)}>
              <Trash2 size={16} />
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {option.values.map((v, j) => (
              <div key={j} className="flex items-center gap-2">
                {option.type === 'color' && (
                  <input
                    type="color"
                    aria-label={`Màu giá trị ${j + 1}`}
                    value={v.hex ?? '#000000'}
                    onChange={(e) => patchValue(i, j, { hex: e.target.value })}
                    className="h-9 w-12 rounded-control border border-border"
                  />
                )}
                <input
                  aria-label={`Giá trị ${j + 1}`}
                  value={v.label}
                  onChange={(e) => patchValue(i, j, { label: e.target.value })}
                  placeholder="vd: Đỏ"
                  className="flex-1 rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="button" aria-label="Xóa giá trị" onClick={() => removeValue(i, j)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addValue(i)}
              className="inline-flex w-fit items-center gap-1.5 text-sm text-foreground hover:text-accent"
            >
              <Plus size={15} /> Thêm giá trị
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addOption} className="w-fit">
        <Plus size={16} /> Thêm thuộc tính
      </Button>
    </div>
  )
}
