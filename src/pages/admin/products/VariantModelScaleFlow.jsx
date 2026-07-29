import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Box, Upload } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { putPresignedModel } from '../../../features/admin/products/api'
import {
  useConfirmVariantModel,
  useMeasureVariantModel,
  usePresignVariantModel,
} from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'
import { VariantModelPreview } from './VariantModelPreview'

const AXES = ['x', 'y', 'z']
const DIMENSIONS = [
  ['width', 'Chiều rộng'],
  ['height', 'Chiều cao'],
  ['depth', 'Chiều sâu'],
]
const DEFAULT_AXIS_MAP = { width: 'z', height: 'y', depth: 'x' }

function remapAxis(current, dimension, nextAxis) {
  const previousAxis = current[dimension]
  const swappedDimension = Object.keys(current).find((key) => key !== dimension && current[key] === nextAxis)
  return {
    ...current,
    [dimension]: nextAxis,
    ...(swappedDimension ? { [swappedDimension]: previousAxis } : {}),
  }
}

export function VariantModelScaleFlow({ variant, onConfirmed }) {
  const presign = usePresignVariantModel()
  const measure = useMeasureVariantModel()
  const confirm = useConfirmVariantModel()
  const addToast = useToastStore((state) => state.addToast)
  const [progress, setProgress] = useState(0)
  const [stagingToken, setStagingToken] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [bounds, setBounds] = useState(null)
  const [axisMap, setAxisMap] = useState(DEFAULT_AXIS_MAP)
  const [showAxisMapping, setShowAxisMapping] = useState(false)
  const [referenceDimension, setReferenceDimension] = useState('width')
  const [referenceValueCm, setReferenceValueCm] = useState('')
  const [calculation, setCalculation] = useState(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [activeDimension, setActiveDimension] = useState(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const busy = presign.isPending || measure.isPending || confirm.isPending || (progress > 0 && progress < 100)
  const axisValid = useMemo(() => new Set(Object.values(axisMap)).size === 3, [axisMap])

  const uploadFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.glb')) {
      addToast({ title: 'Chỉ chấp nhận tệp GLB.', variant: 'error' })
      return
    }

    setBounds(null)
    setAxisMap(DEFAULT_AXIS_MAP)
    setShowAxisMapping(false)
    setActiveDimension(null)
    setCalculation(null)
    setAcknowledged(false)
    setProgress(1)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    try {
      const signed = await presign.mutateAsync(variant.id)
      const data = signed.data
      await putPresignedModel({
        url: data.presigned_url,
        headers: data.headers,
        file,
        onProgress: setProgress,
      })
      setProgress(100)
      setStagingToken(data.staging_token)
      const measured = await measure.mutateAsync({ variantId: variant.id, stagingToken: data.staging_token })
      const measuredBounds = measured.data.bounds
      setBounds(measuredBounds)
    } catch (error) {
      setProgress(0)
      addToast({ title: 'Không thể tải hoặc đo mô hình.', description: error.message, variant: 'error' })
    }
  }

  const payload = (confirmed) => ({
    variantId: variant.id,
    staging_token: stagingToken,
    axis_map: axisMap,
    reference_dimension: referenceDimension,
    reference_value_cm: Number(referenceValueCm),
    confirmed,
  })

  const calculate = async () => {
    try {
      const response = await confirm.mutateAsync(payload(false))
      setCalculation(response.data)
      setAcknowledged(false)
    } catch (error) {
      addToast({ title: 'Không thể tính kích thước.', description: error.message, variant: 'error' })
    }
  }

  const save = async () => {
    try {
      const response = await confirm.mutateAsync(payload(true))
      onConfirmed?.(response.data.variant)
      addToast({ title: 'Đã xác nhận kích thước thật và bake mô hình.', variant: 'success' })
      setStagingToken(null)
      setBounds(null)
      setCalculation(null)
    } catch (error) {
      addToast({ title: 'Không thể xác nhận mô hình.', description: error.message, variant: 'error' })
    }
  }

  const invalidateCalculation = () => {
    setCalculation(null)
    setAcknowledged(false)
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-4" aria-label="Kích thước thật của mô hình 3D">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground"><Box size={16} /> Mô hình 3D</h3>
        <p className="mt-1 text-xs text-muted-foreground">Tải GLB lên R2 rồi nhập một số đo thật bằng centimet.</p>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-border-strong px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-alt">
        <Upload size={16} aria-hidden="true" /> Tải lên mô hình 3D
        <input type="file" accept=".glb,model/gltf-binary" className="sr-only" onChange={uploadFile} disabled={busy} />
      </label>
      {progress > 0 && <progress aria-label="Tiến trình tải mô hình" value={progress} max="100" className="w-full" />}

      {bounds && previewUrl && (
        <>
          <VariantModelPreview
            url={previewUrl}
            activeAxis={activeDimension ? axisMap[activeDimension] : null}
          />
          <p className="text-xs text-muted-foreground">Quy ước mặc định: Z là rộng, Y là cao, X là sâu.</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {AXES.map((axis) => (
              <div key={axis} className="rounded-control border border-border bg-surface-alt p-2 text-center">
                <span className="font-medium uppercase text-foreground">{axis}</span>
                <span className="block text-muted-foreground">{Number(bounds[axis]).toFixed(4)} units</span>
              </div>
            ))}
          </div>

          <div>
            <button
              type="button"
              aria-expanded={showAxisMapping}
              aria-controls="variant-model-axis-mapping"
              onClick={() => {
                setShowAxisMapping((visible) => !visible)
                setActiveDimension(null)
              }}
              className="text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Đổi hướng trục
            </button>
            {showAxisMapping && (
              <div id="variant-model-axis-mapping" className="mt-3 grid gap-3 sm:grid-cols-3">
                {DIMENSIONS.map(([dimension, label]) => (
                  <label
                    key={dimension}
                    className="flex flex-col gap-1 text-sm font-medium text-foreground"
                    onMouseEnter={() => setActiveDimension(dimension)}
                    onMouseLeave={() => setActiveDimension(null)}
                    onFocus={() => setActiveDimension(dimension)}
                    onBlur={() => setActiveDimension(null)}
                  >
                    {label}
                    <select
                      aria-label={`Trục cho ${label}`}
                      value={axisMap[dimension]}
                      onChange={(event) => {
                        setAxisMap((current) => remapAxis(current, dimension, event.target.value))
                        invalidateCalculation()
                      }}
                      className="rounded-control border border-border bg-surface px-3 py-2"
                    >
                      {AXES.map((axis) => (
                        <option key={axis} value={axis}>
                          Trục {axis.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Chiều dùng làm số đo tham chiếu
              <select
                aria-label="Chiều tham chiếu"
                value={referenceDimension}
                onChange={(event) => { setReferenceDimension(event.target.value); invalidateCalculation() }}
                className="rounded-control border border-border bg-surface px-3 py-2"
              >
                {DIMENSIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <Input
              id="model-reference-cm"
              label="Số đo thật (cm)"
              type="number"
              min="0.01"
              step="0.01"
              value={referenceValueCm}
              onChange={(event) => { setReferenceValueCm(event.target.value); invalidateCalculation() }}
            />
          </div>

          <Button type="button" variant="secondary" onClick={calculate} disabled={!axisValid || Number(referenceValueCm) <= 0 || confirm.isPending}>
            Tính toán
          </Button>
        </>
      )}

      {calculation && (
        <div className="flex flex-col gap-3 rounded-card border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            Rộng {Number(calculation.width_cm).toFixed(2)} × Sâu {Number(calculation.depth_cm).toFixed(2)} × Cao {Number(calculation.height_cm).toFixed(2)} cm
          </p>
          <p className="text-xs text-muted-foreground">Hệ số đồng nhất: {Number(calculation.scale_factor).toFixed(8)}</p>
          {calculation.warnings?.length > 0 && (
            <div className="rounded-control border border-imagined bg-imagined/10 p-3 text-sm text-foreground">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle size={16} /> Cần kiểm tra lại</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {calculation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          )}
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            Tôi đã kiểm tra hướng trục và kích thước sau khi quy đổi
          </label>
          <Button type="button" onClick={save} disabled={!acknowledged || confirm.isPending}>Xác nhận và bake mô hình</Button>
        </div>
      )}
    </section>
  )
}
