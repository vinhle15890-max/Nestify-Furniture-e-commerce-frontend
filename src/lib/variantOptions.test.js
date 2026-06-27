import { describe, it, expect } from 'vitest'
import { cartesianVariants, variantSignature, missingCombinations, resolveVariant } from './variantOptions'

const options = [
  { name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#f00' }, { label: 'Xanh', hex: '#00f' }] },
  { name: 'Kích thước', type: 'text', values: [{ label: 'S' }, { label: 'M' }] },
]

describe('variantOptions', () => {
  it('cartesianVariants sinh đủ tổ hợp', () => {
    expect(cartesianVariants(options)).toHaveLength(4)
    expect(cartesianVariants(options)[0]).toEqual({ 'Màu sắc': 'Đỏ', 'Kích thước': 'S' })
  })

  it('signature không phụ thuộc thứ tự key đầu vào', () => {
    const a = variantSignature({ 'Kích thước': 'S', 'Màu sắc': 'Đỏ' }, options)
    const b = variantSignature({ 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }, options)
    expect(a).toBe(b)
  })

  it('missingCombinations loại tổ hợp đã có', () => {
    const variants = [{ attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' } }]
    const missing = missingCombinations(options, variants)
    expect(missing).toHaveLength(3)
  })

  it('resolveVariant tìm đúng biến thể', () => {
    const variants = [
      { id: 1, attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' } },
      { id: 2, attributes: { 'Màu sắc': 'Xanh', 'Kích thước': 'M' } },
    ]
    expect(resolveVariant({ 'Màu sắc': 'Xanh', 'Kích thước': 'M' }, variants, options)?.id).toBe(2)
    expect(resolveVariant({ 'Màu sắc': 'Xanh', 'Kích thước': 'S' }, variants, options)).toBeNull()
  })

  it('signature joins labels with the U+0001 separator', () => {
    expect(variantSignature({ 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }, options)).toBe('Đỏ\x01S')
  })
})
