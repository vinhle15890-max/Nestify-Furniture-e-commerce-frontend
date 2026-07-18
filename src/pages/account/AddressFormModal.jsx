import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { BecomingModal } from '../../components/BecomingModal'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useCreateAddress, useUpdateAddress } from '../../features/addresses/hooks'
import { useToastStore } from '../../store/toastStore'
import { applyServerErrors, focusFirstError, formLevelMessage } from '../../lib/formErrors'

// Vietnam's administrative units were reorganised by Nghị quyết 202/2025/QH15:
// 34 provinces/cities and a TWO-tier model (province → ward/commune), with the
// district (Quận/Huyện) level removed. We map this onto the existing columns:
//   province     → Tỉnh/Thành phố
//   city         → Phường/Xã/Thị trấn (the ward/commune)
//   address_line1→ Số nhà, tên đường
//   address_line2→ unused (sent empty)
//   postal_code  → unused (sent empty)

const schema = yup.object({
  recipient_name: yup.string().required('Vui lòng nhập tên người nhận.').max(100, 'Tối đa 100 ký tự.'),
  phone: yup.string().required('Vui lòng nhập số điện thoại.').max(20, 'Tối đa 20 ký tự.'),
  address_line1: yup.string().required('Vui lòng nhập số nhà, tên đường.').max(255, 'Tối đa 255 ký tự.'),
})

const selectClass =
  'rounded-control border border-border-strong bg-surface px-4 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50'

/** Build options for a select, keeping a legacy value that isn't in the dataset. */
function withCurrent(options, current) {
  if (current && !options.includes(current)) return [current, ...options]
  return options
}

function AddressSelect({ id, label, value, onChange, options, disabled, error }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={selectClass}
      >
        <option value="">-- Chọn --</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${id}-error`} role="alert" className="text-sm font-normal text-destructive">
          {error}
        </span>
      )}
    </label>
  )
}

export function AddressFormModal({ open, onOpenChange, address }) {
  const isEditing = !!address
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const addToast = useToastStore((state) => state.addToast)

  const [units, setUnits] = useState(null)
  const [province, setProvince] = useState('')
  const [ward, setWard] = useState('')
  const [regionError, setRegionError] = useState({})
  const [formError, setFormError] = useState(null)
  const formRef = useRef(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { recipient_name: '', phone: '', address_line1: '' },
  })

  // Lazy-load the (bundled) VN administrative dataset the first time the modal opens.
  useEffect(() => {
    if (open && !units) {
      import('../../data/vn-units.json').then((module) => setUnits(module.default))
    }
  }, [open, units])

  // Reset the form + region selects whenever the modal (re)opens.
  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset({
      recipient_name: address?.recipient_name ?? '',
      phone: address?.phone ?? '',
      address_line1: address?.address_line1 ?? '',
    })
    setProvince(address?.province ?? '')
    setWard(address?.city ?? '')
    setRegionError({})
  }, [open, address, reset])

  const provinceOptions = useMemo(() => (units ? units.map((p) => p.name) : []), [units])
  const wardOptions = useMemo(
    () => units?.find((p) => p.name === province)?.wards ?? [],
    [units, province],
  )

  function handleProvinceChange(value) {
    setProvince(value)
    setWard('')
    if (regionError.province) setRegionError((prev) => ({ ...prev, province: undefined }))
  }

  function handleWardChange(value) {
    setWard(value)
    if (regionError.ward) setRegionError((prev) => ({ ...prev, ward: undefined }))
  }

  const onSubmit = async (values) => {
    setFormError(null)
    const nextRegionError = {}
    if (!province) nextRegionError.province = 'Vui lòng chọn Tỉnh/Thành phố.'
    if (!ward) nextRegionError.ward = 'Vui lòng chọn Phường/Xã.'
    setRegionError(nextRegionError)
    if (Object.keys(nextRegionError).length > 0) {
      focusFirstError(formRef.current)
      return
    }

    const payload = {
      recipient_name: values.recipient_name,
      phone: values.phone,
      address_line1: values.address_line1,
      address_line2: '',
      city: ward,
      province,
      postal_code: '',
    }

    try {
      if (isEditing) {
        await updateAddress.mutateAsync({ id: address.id, ...payload })
        addToast({ title: 'Đã cập nhật địa chỉ.', variant: 'success' })
      } else {
        await createAddress.mutateAsync(payload)
        addToast({ title: 'Đã thêm địa chỉ mới.', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      if (applyServerErrors(error, setError)) {
        focusFirstError(formRef.current)
        return
      }
      setFormError(formLevelMessage(error))
      focusFirstError(formRef.current)
    }
  }

  return (
    <BecomingModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
      description="Nhập thông tin địa chỉ giao hàng tại Việt Nam."
    >
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        {formError && (
          <p role="alert" tabIndex="-1" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Input
          label="Tên người nhận"
          id="recipient_name"
          error={errors.recipient_name?.message}
          {...register('recipient_name')}
        />
        <Input label="Số điện thoại" id="phone" error={errors.phone?.message} {...register('phone')} />

        <AddressSelect
          id="province"
          label="Tỉnh/Thành phố"
          value={province}
          onChange={handleProvinceChange}
          options={withCurrent(provinceOptions, province)}
          disabled={!units}
          error={regionError.province}
        />
        <AddressSelect
          id="ward"
          label="Phường/Xã/Thị trấn"
          value={ward}
          onChange={handleWardChange}
          options={withCurrent(wardOptions, ward)}
          disabled={!province}
          error={regionError.ward}
        />

        <Input
          label="Số nhà, tên đường"
          id="address_line1"
          error={errors.address_line1?.message}
          {...register('address_line1')}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? 'Đang lưu…' : 'Đang thêm…') : isEditing ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
        </Button>
      </form>
    </BecomingModal>
  )
}
