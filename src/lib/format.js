const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

export function formatPrice(value) {
  return currencyFormatter.format(Number(value) || 0)
}
