import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MODEL_STATE, ModelErrorBoundary, PlaceholderBox } from './FurnitureModel'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <div>{children}</div>,
  useGLTF: vi.fn(),
}))

function BrokenModel() {
  throw new Error('secret raw loader exception https://private.example/model.glb')
}

describe('runtime furniture model states', () => {
  it.each([
    [MODEL_STATE.NO_MODEL, 'Chưa có mô hình 3D'],
    [MODEL_STATE.LOADING, 'Đang tải mô hình'],
    [MODEL_STATE.LOAD_FAILED, 'Đang dùng khối thay thế'],
  ])('renders an identifiable %s fallback', (state, label) => {
    const { container } = render(<PlaceholderBox state={state} />)
    expect(container.querySelector(`[data-model-state="${state}"]`)).toBeInTheDocument()
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('observes loader failure without rendering raw exception details', () => {
    const onError = vi.fn()
    const { container } = render(
      <ModelErrorBoundary onError={onError}>
        <BrokenModel />
      </ModelErrorBoundary>,
    )
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(container.querySelector('[data-model-state="LOAD_FAILED"]')).toBeInTheDocument()
    expect(screen.queryByText(/private\.example|secret raw loader/i)).not.toBeInTheDocument()
  })
})
