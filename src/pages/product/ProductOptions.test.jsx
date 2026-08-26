import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductOptions } from './ProductOptions'

const options = [
  { name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#C0392B' }, { label: 'Xanh', hex: '#2E5FCC' }] },
  { name: 'Kích thước', type: 'text', values: [{ label: 'S' }, { label: 'M' }] },
]
const variants = [
  { id: 1, attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }, available_stock: 3 },
  { id: 2, attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'M' }, available_stock: 0 },
]

describe('ProductOptions', () => {
  it('chọn swatch màu gọi onSelect', async () => {
    const onSelect = vi.fn()
    render(<ProductOptions options={options} variants={variants} selected={{}} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Đỏ' }))
    expect(onSelect).toHaveBeenCalledWith('Màu sắc', 'Đỏ')
  })

  it('cho phép chọn tổ hợp hết hàng để người dùng vẫn có thể lưu vào yêu thích', async () => {
    const onSelect = vi.fn()
    render(<ProductOptions options={options} variants={variants} selected={{ 'Màu sắc': 'Đỏ' }} onSelect={onSelect} />)
    const outOfStockOption = screen.getAllByRole('button', { name: 'M (Tạm hết hàng)' }).at(-1)
    expect(outOfStockOption).toBeEnabled()
    await userEvent.click(outOfStockOption)
    expect(onSelect).toHaveBeenCalledWith('Kích thước', 'M')
  })

  it('vô hiệu hóa option không thuộc bất kỳ tổ hợp variant nào', () => {
    render(<ProductOptions options={options} variants={variants} selected={{}} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Xanh' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đỏ' })).toBeEnabled()
  })

  it('hiển thị ảnh vân vật liệu thay vì giả lập bằng một màu phẳng', async () => {
    const onSelect = vi.fn()
    const surfaceOptions = [{ name: 'Bề mặt', type: 'surface', values: [{ label: 'Đá Carrara', material_kind: 'stone', image_url: 'https://images.example.com/carrara.jpg' }] }]
    const surfaceVariants = [{ id: 3, attributes: { 'Bề mặt': 'Đá Carrara' }, available_stock: 2 }]
    render(<ProductOptions options={surfaceOptions} variants={surfaceVariants} selected={{}} onSelect={onSelect} />)
    const swatch = screen.getByRole('button', { name: 'Đá Carrara' })
    expect(swatch.querySelector('img')).toHaveAttribute('src', 'https://images.example.com/carrara.jpg')
    await userEvent.click(swatch)
    expect(onSelect).toHaveBeenCalledWith('Bề mặt', 'Đá Carrara')
  })
})
