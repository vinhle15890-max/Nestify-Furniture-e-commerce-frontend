import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VariantModelScaleFlow } from './VariantModelScaleFlow'
import { putPresignedModel } from '../../../features/admin/products/api'

const presignAsync = vi.fn()
const measureAsync = vi.fn()
const confirmAsync = vi.fn()

vi.mock('../../../features/admin/products/api', () => ({ putPresignedModel: vi.fn() }))
vi.mock('../../../features/admin/products/hooks', () => ({
  usePresignVariantModel: () => ({ mutateAsync: presignAsync, isPending: false }),
  useMeasureVariantModel: () => ({ mutateAsync: measureAsync, isPending: false }),
  useConfirmVariantModel: () => ({ mutateAsync: confirmAsync, isPending: false }),
}))
vi.mock('./VariantModelPreview', () => ({
  VariantModelPreview: ({ activeAxis }) => (
    <div aria-label="Xem trước mô hình 3D và các trục X Y Z" data-active-axis={activeAxis ?? ''} />
  ),
}))

describe('VariantModelScaleFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:model')
    URL.revokeObjectURL = vi.fn()
    presignAsync.mockResolvedValue({
      data: { presigned_url: 'https://r2.test/signed', headers: {}, staging_token: 'stage-token' },
    })
    putPresignedModel.mockImplementation(async ({ onProgress }) => onProgress(100))
    measureAsync.mockResolvedValue({ data: { bounds: { x: 0.5, y: 0.25, z: 1 } } })
    confirmAsync.mockImplementation(async (payload) => payload.confirmed
      ? { data: { variant: { id: 12, model_scaled_at: '2026-07-16T12:00:00Z', width_cm: 250 } } }
      : { data: { scale_factor: 2.5, width_cm: 250, height_cm: 62.5, depth_cm: 125, warnings: ['Kiểm tra chiều sâu.'] } })
  })

  it('uploads directly, measures, previews and confirms one uniform scale', async () => {
    const onConfirmed = vi.fn()
    render(<VariantModelScaleFlow variant={{ id: 12 }} onConfirmed={onConfirmed} />)

    const file = new File(['glb'], 'sofa.glb', { type: 'model/gltf-binary' })
    await userEvent.upload(screen.getByLabelText('Tải lên mô hình 3D'), file)

    expect(await screen.findByText('1.0000 units')).toBeInTheDocument()
    expect(presignAsync).toHaveBeenCalledWith(12)
    expect(putPresignedModel).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://r2.test/signed',
      file,
    }))
    expect(measureAsync).toHaveBeenCalledWith({ variantId: 12, stagingToken: 'stage-token' })

    const widthAxis = screen.getByLabelText('Trục cho Chiều rộng')
    expect(widthAxis).toHaveValue('z')
    expect(screen.getByText('Xoay để xem rõ hướng trục trước khi chọn.')).toBeInTheDocument()

    await userEvent.click(widthAxis)
    expect(screen.getByLabelText('Xem trước mô hình 3D và các trục X Y Z')).toHaveAttribute('data-active-axis', 'z')

    await userEvent.selectOptions(widthAxis, 'z')
    await userEvent.selectOptions(screen.getByLabelText('Trục cho Chiều cao'), 'y')
    await userEvent.selectOptions(screen.getByLabelText('Trục cho Chiều sâu'), 'x')
    await userEvent.clear(screen.getByLabelText('Số đo thật (cm)'))
    await userEvent.type(screen.getByLabelText('Số đo thật (cm)'), '250')
    await userEvent.click(screen.getByRole('button', { name: 'Tính toán' }))

    expect(await screen.findByText('Rộng 250.00 × Sâu 125.00 × Cao 62.50 cm')).toBeInTheDocument()
    expect(screen.getByText('Kiểm tra chiều sâu.')).toBeInTheDocument()
    expect(confirmAsync).toHaveBeenCalledWith(expect.objectContaining({
      axis_map: { width: 'z', height: 'y', depth: 'x' },
      reference_value_cm: 250,
      confirmed: false,
    }))

    await userEvent.click(screen.getByLabelText('Tôi đã kiểm tra hướng trục và kích thước sau khi quy đổi'))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận và bake mô hình' }))

    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ id: 12, width_cm: 250 })))
    expect(confirmAsync).toHaveBeenLastCalledWith(expect.objectContaining({ confirmed: true }))
  })
})
