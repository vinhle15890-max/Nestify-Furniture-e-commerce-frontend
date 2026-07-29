import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Check, ChevronDown } from 'lucide-react'
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

/** Build options for a select, keeping a legacy value that isn't in the dataset. */
function withCurrent(options, current) {
  if (current && !options.includes(current)) return [current, ...options]
  return options
}

function normalizeSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
}

function searchablePlaceName(value) {
  return normalizeSearch(value).replace(/^(tinh|thanh pho|phuong|xa|thi tran|dac khu)\s+/, '')
}

function AddressCombobox({ id, label, value, onChange, options, disabled, error, searchPlaceholder }) {
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const skipNextValueSync = useRef(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [activeIndex, setActiveIndex] = useState(0)
  const listboxId = `${id}-options`
  const normalizedQuery = normalizeSearch(query.trim())
  const filteredOptions = useMemo(() => {
    if (normalizedQuery.length < 2) return []
    return options
      .map((option) => {
        const placeName = searchablePlaceName(option)
        const words = placeName.split(/\s+/)
        const score = placeName.startsWith(normalizedQuery)
          ? 0
          : words.some((word) => word.startsWith(normalizedQuery))
            ? 1
            : placeName.includes(normalizedQuery)
              ? 2
              : null
        return { option, score }
      })
      .filter((result) => result.score !== null)
      .sort((a, b) => a.score - b.score || a.option.localeCompare(b.option, 'vi'))
      .map((result) => result.option)
  }, [normalizedQuery, options])

  useEffect(() => {
    if (skipNextValueSync.current) {
      skipNextValueSync.current = false
      return
    }
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsidePress = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        setQuery(value)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [open, value])

  const selectOption = (option) => {
    onChange(option)
    setQuery(option)
    setOpen(false)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(value)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        const last = filteredOptions.length - 1
        if (last < 0) return 0
        return Math.min(last, Math.max(0, current + direction))
      })
      return
    }
    if (event.key === 'Enter' && open && filteredOptions[activeIndex]) {
      event.preventDefault()
      selectOption(filteredOptions[activeIndex])
    }
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5 text-sm font-medium text-foreground">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          type="text"
          value={query}
          placeholder={disabled ? 'Chọn Tỉnh/Thành phố trước' : searchPlaceholder}
          autoComplete="off"
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && filteredOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onFocus={(event) => {
            setOpen(true)
            setActiveIndex(0)
            event.currentTarget.select()
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(0)
            if (value) {
              skipNextValueSync.current = true
              onChange('')
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-control border border-border-strong bg-surface px-4 py-3 pr-11 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
        />
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`Kết quả ${label}`}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-control border border-border-strong bg-surface p-1 shadow-soft"
        >
          {normalizedQuery.length < 2 ? (
            <p className="px-3 py-2 text-sm font-normal text-muted-foreground">
              Nhập ít nhất 2 ký tự của tên địa phương.
            </p>
          ) : filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <button
              key={option}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option)}
              className={`flex w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left text-sm font-normal ${
                index === activeIndex ? 'bg-surface-alt text-foreground' : 'text-foreground hover:bg-surface-alt'
              }`}
            >
              <span>{option}</span>
              {option === value && <Check size={16} aria-hidden="true" className="shrink-0" />}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm font-normal text-muted-foreground">Không tìm thấy địa điểm phù hợp.</p>
          )}
        </div>
      )}
      {error && (
        <span id={`${id}-error`} role="alert" className="text-sm font-normal text-destructive">
          {error}
        </span>
      )}
    </div>
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

        <AddressCombobox
          id="province"
          label="Tỉnh/Thành phố"
          value={province}
          onChange={handleProvinceChange}
          options={withCurrent(provinceOptions, province)}
          disabled={!units}
          error={regionError.province}
          searchPlaceholder="Nhập tên, ví dụ: Hà Nội"
        />
        <AddressCombobox
          id="ward"
          label="Phường/Xã/Thị trấn"
          value={ward}
          onChange={handleWardChange}
          options={withCurrent(wardOptions, ward)}
          disabled={!province}
          error={regionError.ward}
          searchPlaceholder="Nhập tên, ví dụ: Ba Đình"
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
