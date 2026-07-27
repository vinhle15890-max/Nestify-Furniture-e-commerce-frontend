import { describe, expect, it } from 'vitest'
import { productAttributeDefaults, toProductPayload } from './productForm'

const values = {
  name: 'Sofa Vòm Mây',
  slug: 'sofa-vom-may',
  category_id: '12',
  description: '',
  meta_title: '',
  meta_description: '',
  focus_keyword: '',
  status: 'active',
  product_attributes: {
    dimensions: '210 × 88 × 78 cm',
    material: 'Khung gỗ cao su và vải dệt',
    style: '',
    origin: '',
    delivery: '3–5 ngày',
    returns: '',
    care: '',
    assembly: '',
    warranty: '24 tháng',
  },
}

describe('productForm structured attributes', () => {
  it('chuyển module thông số thành attributes chuẩn và bỏ giá trị trống', () => {
    expect(toProductPayload(values).attributes).toEqual({
      dimensions: '210 × 88 × 78 cm',
      material: 'Khung gỗ cao su và vải dệt',
      delivery: '3–5 ngày',
      warranty: '24 tháng',
    })
  })

  it('giữ thuộc tính mở rộng không do form quản lý khi sửa sản phẩm', () => {
    expect(toProductPayload(values, { brand: 'Nestify', dimensions: 'cũ' }).attributes).toEqual(
      expect.objectContaining({ brand: 'Nestify', dimensions: '210 × 88 × 78 cm' }),
    )
  })

  it('đưa attributes hiện có trở lại đúng input', () => {
    expect(productAttributeDefaults({ material: 'Gỗ cao su' })).toEqual(
      expect.objectContaining({ material: 'Gỗ cao su', dimensions: '', warranty: '' }),
    )
  })
})
