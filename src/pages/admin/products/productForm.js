import * as yup from 'yup'

export const PRODUCT_ATTRIBUTE_FIELDS = [
  { key: 'dimensions', label: 'Kích thước tổng thể', placeholder: 'Ví dụ: 210 × 88 × 78 cm', group: 'specification' },
  { key: 'material', label: 'Vật liệu', placeholder: 'Ví dụ: Khung gỗ cao su, vải dệt, đệm mút', group: 'specification' },
  { key: 'style', label: 'Phong cách', placeholder: 'Ví dụ: Hiện đại tối giản', group: 'specification' },
  { key: 'origin', label: 'Xuất xứ', placeholder: 'Ví dụ: Việt Nam', group: 'specification' },
  { key: 'delivery', label: 'Giao hàng', placeholder: 'Ví dụ: 3–5 ngày tại TP.HCM', group: 'policy', multiline: true },
  { key: 'returns', label: 'Hủy đơn và hỗ trợ sau bán', placeholder: 'Điều kiện và cách liên hệ hỗ trợ áp dụng', group: 'policy', multiline: true },
  { key: 'care', label: 'Chăm sóc', placeholder: 'Cách vệ sinh và bảo quản sản phẩm', group: 'policy', multiline: true },
  { key: 'assembly', label: 'Lắp ráp', placeholder: 'Sản phẩm giao nguyên kiện hay cần lắp ráp', group: 'policy', multiline: true },
  { key: 'warranty', label: 'Bảo hành', placeholder: 'Ví dụ: 24 tháng cho khung sản phẩm', group: 'policy', multiline: true },
]

export const emptyProductAttributes = Object.fromEntries(PRODUCT_ATTRIBUTE_FIELDS.map(({ key }) => [key, '']))

export function productAttributeDefaults(attributes = {}) {
  return Object.fromEntries(
    PRODUCT_ATTRIBUTE_FIELDS.map(({ key }) => [key, attributes?.[key] == null ? '' : String(attributes[key])]),
  )
}

// Shared validation for the product create + edit forms (same fields).
export const productSchema = yup.object({
  name: yup.string().required('Vui lòng nhập tên sản phẩm.').max(255, 'Tối đa 255 ký tự.'),
  slug: yup
    .string()
    .required('Vui lòng nhập slug.')
    .max(255, 'Tối đa 255 ký tự.')
    .matches(/^[a-z0-9_-]+$/i, 'Slug chỉ gồm chữ, số, gạch ngang và gạch dưới.'),
  category_id: yup.string().required('Vui lòng chọn danh mục.'),
  description: yup.string(),
  meta_title: yup.string().max(70, 'Tối đa 70 ký tự.'),
  meta_description: yup.string().max(300, 'Tối đa 300 ký tự.'),
  focus_keyword: yup.string().max(100, 'Tối đa 100 ký tự.'),
  product_attributes: yup.object(
    Object.fromEntries(PRODUCT_ATTRIBUTE_FIELDS.map(({ key }) => [key, yup.string().max(1000, 'Tối đa 1000 ký tự.')])),
  ),
  status: yup.string().oneOf(['active', 'archived']),
  is_featured: yup.boolean(),
  featured_position: yup.number().nullable().transform((value, original) => original === '' ? null : value).integer('Thứ tự phải là số nguyên.').min(1, 'Thứ tự bắt đầu từ 1.').max(9999, 'Thứ tự tối đa là 9999.'),
})

// Flatten the category tree into a list of {id, name, depth} for a <select>.
export function flattenCategories(tree) {
  const result = []

  function walk(nodes, depth) {
    for (const node of nodes) {
      result.push({ id: node.id, name: node.name, depth })
      if (node.children?.length) walk(node.children, depth + 1)
    }
  }

  walk(tree, 0)
  return result
}

// Builds the PATCH/POST payload from validated form values.
export function toProductPayload(values, existingAttributes = {}) {
  const attributes = { ...existingAttributes }
  for (const { key } of PRODUCT_ATTRIBUTE_FIELDS) {
    const value = values.product_attributes?.[key]?.trim()
    if (value) attributes[key] = value
    else delete attributes[key]
  }

  return {
    name: values.name,
    slug: values.slug,
    category_id: Number(values.category_id),
    description: values.description || null,
    meta_title: values.meta_title || null,
    meta_description: values.meta_description || null,
    focus_keyword: values.focus_keyword || null,
    attributes,
    status: values.status,
    is_featured: Boolean(values.is_featured),
    featured_position: values.is_featured && values.featured_position !== '' ? Number(values.featured_position) : null,
  }
}
