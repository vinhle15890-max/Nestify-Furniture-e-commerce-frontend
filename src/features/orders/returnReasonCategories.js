export const RETURN_REASON_CATEGORIES = [
  { value: 'damaged', label: 'Sản phẩm bị hư hỏng' },
  { value: 'wrong_item', label: 'Giao sai sản phẩm' },
  { value: 'not_as_described', label: 'Không đúng mô tả' },
  { value: 'changed_mind', label: 'Thay đổi nhu cầu' },
  { value: 'other', label: 'Lý do khác' },
]

export function returnReasonCategoryLabel(value) {
  return RETURN_REASON_CATEGORIES.find((category) => category.value === value)?.label ?? null
}
