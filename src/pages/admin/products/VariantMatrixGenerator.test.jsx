import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VariantMatrixGenerator } from './VariantMatrixGenerator'
import * as api from '../../../features/admin/products/api'

vi.mock('../../../features/admin/products/api')

const options = [
  { name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#f00' }] },
  { name: 'Kích thước', type: 'text', values: [{ label: 'S' }, { label: 'M' }] },
]

function renderGen(props) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <VariantMatrixGenerator productId={7} options={options} variants={[]} {...props} />
    </QueryClientProvider>,
  )
}

describe('VariantMatrixGenerator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gọi bulk với các tổ hợp còn thiếu', async () => {
    api.bulkCreateVariants.mockResolvedValue({ data: [] })
    renderGen()

    await userEvent.type(screen.getByLabelText('Giá gốc'), '1500')
    await userEvent.click(screen.getByRole('button', { name: /Tạo .* biến thể/ }))

    expect(api.bulkCreateVariants).toHaveBeenCalledWith(7, [
      { attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }, price: 1500, stock_quantity: 0 },
      { attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'M' }, price: 1500, stock_quantity: 0 },
    ])
  })
})
