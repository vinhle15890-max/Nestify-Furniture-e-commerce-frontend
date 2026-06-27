import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VariantOptionsPanel } from './VariantOptionsPanel'

describe('VariantOptionsPanel', () => {
  it('thêm một thuộc tính mới qua onChange', async () => {
    const onChange = vi.fn()
    render(<VariantOptionsPanel value={[]} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm thuộc tính' }))

    expect(onChange).toHaveBeenCalledWith([
      { name: '', type: 'text', values: [] },
    ])
  })

  it('hiển thị color picker khi type=color', () => {
    render(
      <VariantOptionsPanel
        value={[{ name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#C0392B' }] }]}
        onChange={() => {}}
      />,
    )
    const swatch = screen.getByLabelText('Màu giá trị 1')
    expect(swatch).toHaveAttribute('type', 'color')
    expect(swatch.value.toLowerCase()).toBe('#c0392b')
  })
})
