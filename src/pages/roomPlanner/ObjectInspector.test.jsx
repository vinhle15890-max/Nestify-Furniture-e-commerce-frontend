import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ObjectInspector } from './ObjectInspector'

const item = { localId: 7, variant: { name: 'Ghế Nâu' }, footprint: { x: 1.2, y: 0.8, z: 0.7 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }

describe('ObjectInspector', () => {
  it('routes position and rotation edits through the shared transform action', () => {
    const onTransform = vi.fn()
    render(<ObjectInspector item={item} onTransform={onTransform} onDelete={vi.fn()} onResetTransform={vi.fn()} onDuplicate={vi.fn()} />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Vị trí ngang X' }), { target: { value: '1.4' } })
    expect(onTransform).toHaveBeenLastCalledWith(7, { position: { x: 1.4, y: 0, z: 0 } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Góc xoay' }), { target: { value: '90' } })
    expect(onTransform).toHaveBeenLastCalledWith(7, { rotation: { x: 0, y: Math.PI / 2, z: 0 } })
  })

  it('offers quick floor-rotation steps and cardinal presets', async () => {
    const onTransform = vi.fn()
    render(<ObjectInspector item={item} onTransform={onTransform} onDelete={vi.fn()} onResetTransform={vi.fn()} onDuplicate={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Xoay trái 15 độ' }))
    expect(onTransform).toHaveBeenLastCalledWith(7, { rotation: { x: 0, y: -Math.PI / 12, z: 0 } })

    await userEvent.click(screen.getByRole('button', { name: 'Xoay đến 90 độ' }))
    expect(onTransform).toHaveBeenLastCalledWith(7, { rotation: { x: 0, y: Math.PI / 2, z: 0 } })

    expect(screen.getByText('Chỉ xoay trên mặt sàn')).toBeInTheDocument()
  })

  it('offers directional position nudges without requiring coordinate input', async () => {
    const onTransform = vi.fn()
    render(<ObjectInspector item={item} onTransform={onTransform} onDelete={vi.fn()} onResetTransform={vi.fn()} onDuplicate={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dịch sang phải 10 cm' }))
    expect(onTransform).toHaveBeenLastCalledWith(7, { position: { x: 0.1, y: 0, z: 0 } })

    await userEvent.click(screen.getByRole('button', { name: 'Dịch ra sau 50 cm' }))
    expect(onTransform).toHaveBeenLastCalledWith(7, { position: { x: 0, y: 0, z: 0.5 } })
  })
})
