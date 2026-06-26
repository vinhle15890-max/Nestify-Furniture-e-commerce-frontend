import * as yup from 'yup'

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
  status: yup.string().oneOf(['active', 'archived']),
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
export function toProductPayload(values) {
  return {
    name: values.name,
    slug: values.slug,
    category_id: Number(values.category_id),
    description: values.description || null,
    meta_title: values.meta_title || null,
    meta_description: values.meta_description || null,
    focus_keyword: values.focus_keyword || null,
    status: values.status,
  }
}
