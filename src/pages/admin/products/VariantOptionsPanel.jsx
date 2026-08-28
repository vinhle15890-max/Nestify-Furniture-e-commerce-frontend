import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { MediaLibraryModal } from '../../../features/admin/media/MediaLibraryModal'

// Editor controlled cho products.variant_options.
// value: [{ name, type:'text'|'color'|'surface', values:[{label, hex?, image_url?, material_kind?}] }]
export function VariantOptionsPanel({ value, onChange }) {
  const options = value ?? []
  const [pickerTarget, setPickerTarget] = useState(null)

  const update = (next) => onChange(next)
  const patchOption = (i, patch) => update(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))

  const addOption = () => update([...options, { name: '', type: 'text', values: [] }])
  const removeOption = (i) => update(options.filter((_, idx) => idx !== i))
  const changeType = (i, type) => patchOption(i, {
    type,
    values: options[i].values.map(({ label }) => type === 'color'
      ? { label, hex: '#000000' }
      : type === 'surface'
        ? { label, material_kind: 'wood', image_url: '' }
        : { label }),
  })

  const addValue = (i) => {
    const next = options[i].type === 'color'
      ? { label: '', hex: '#000000' }
      : options[i].type === 'surface'
        ? { label: '', material_kind: 'wood', image_url: '' }
        : { label: '' }
    patchOption(i, { values: [...options[i].values, next] })
  }
  const patchValue = (i, j, patch) =>
    patchOption(i, { values: options[i].values.map((v, idx) => (idx === j ? { ...v, ...patch } : v)) })
  const removeValue = (i, j) => patchOption(i, { values: options[i].values.filter((_, idx) => idx !== j) })

  return (
    <div className="flex flex-col gap-5">
      {options.map((option, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Thuộc tính {i + 1}</p>
            <button
              type="button"
              aria-label={`Xóa thuộc tính ${i + 1}`}
              onClick={() => removeOption(i)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-control text-muted-foreground hover:bg-surface-alt hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
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
                onChange={(e) => changeType(i, e.target.value)}
                className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="text">Chữ</option>
                <option value="color">Màu sắc</option>
                <option value="surface">Bề mặt có vân</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {option.values.map((v, j) => (
              <div key={j} className="flex flex-col gap-2 rounded-control border border-border/70 p-3 sm:flex-row sm:items-center">
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
                {option.type === 'surface' && (
                  <>
                    <select
                      aria-label={`Loại vật liệu ${j + 1}`}
                      value={v.material_kind ?? 'wood'}
                      onChange={(e) => patchValue(i, j, { material_kind: e.target.value })}
                      className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="wood">Vân gỗ</option><option value="stone">Vân đá</option>
                      <option value="fabric">Vải</option><option value="leather">Da</option>
                      <option value="metal">Kim loại</option><option value="other">Khác</option>
                    </select>
                    <input
                      type="url"
                      aria-label={`Ảnh bề mặt ${j + 1}`}
                      value={v.image_url ?? ''}
                      onChange={(e) => patchValue(i, j, { image_url: e.target.value })}
                      placeholder="https://…/swatch.jpg"
                      className="min-w-0 flex-[1.4] rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button type="button" variant="secondary" onClick={() => setPickerTarget({ optionIndex: i, valueIndex: j })}>
                      Chọn ảnh
                    </Button>
                    {v.image_url && <img src={v.image_url} alt="" className="size-11 rounded-control border border-border object-cover" />}
                  </>
                )}
                <button
                  type="button"
                  aria-label={`Xóa giá trị ${j + 1}`}
                  onClick={() => removeValue(i, j)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-control text-muted-foreground hover:bg-surface-alt hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
                >
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
      {pickerTarget && (
        <MediaLibraryModal
          open
          multiple={false}
          onClose={() => setPickerTarget(null)}
          onSelect={(assets) => {
            const asset = assets[0]
            if (asset) patchValue(pickerTarget.optionIndex, pickerTarget.valueIndex, { image_url: asset.url })
            setPickerTarget(null)
          }}
        />
      )}
    </div>
  )
}
