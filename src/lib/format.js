const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const decimalFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const integerFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

export const numericClassName = 'tabular-nums'

export function formatPrice(value) {
  return currencyFormatter.format(Number(value) || 0)
}

export function formatDimension(value, unit = 'cm') {
  const number = Number(value)
  return Number.isFinite(number) ? `${decimalFormatter.format(number)} ${unit}` : ''
}

export function formatQuantity(value, unit = 'sản phẩm') {
  const number = Number(value)
  return Number.isFinite(number) ? `${integerFormatter.format(number)} ${unit}` : ''
}

export function formatStock(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return number > 0 ? `Còn ${integerFormatter.format(number)}` : 'Hết hàng'
}

export function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return dateFormatter.format(date)
}
