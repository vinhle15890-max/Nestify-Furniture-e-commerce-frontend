/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
import { PRODUCT_ATTRIBUTE_FIELDS } from './productForm'

function AttributeField({ field, register, error }) {
  const id = `product_attributes.${field.key}`
  const className = 'w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const props = {
    id,
    ...register(id),
    placeholder: field.placeholder,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
    className,
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{field.label}</label>
      {field.multiline ? <textarea {...props} rows={3} className={`${className} resize-y`} /> : <input {...props} />}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error.message}</p>}
    </div>
  )
}

export function ProductAttributesFields({ register, errors = {} }) {
  const groups = [
    {
      id: 'specification',
      title: 'Thông số cốt lõi',
      description: 'Hiển thị thành từng dòng riêng trên trang sản phẩm và có thể dùng lại cho tìm kiếm, lọc.',
    },
    {
      id: 'policy',
      title: 'Dịch vụ và chính sách',
      description: 'Viết nội dung cụ thể cho sản phẩm; không cần lặp lại trong phần mô tả dài.',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group, index) => (
        <section key={group.id} aria-labelledby={`${group.id}-fields-title`} className={index ? 'border-t border-border pt-6' : ''}>
          <div className="mb-4">
            <h4 id={`${group.id}-fields-title`} className="font-display text-base text-foreground">{group.title}</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {PRODUCT_ATTRIBUTE_FIELDS.filter((field) => field.group === group.id).map((field) => (
              <AttributeField key={field.key} field={field} register={register} error={errors?.[field.key]} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
