import { render, screen } from '@testing-library/react'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { useGLTF } from '@react-three/drei'
import { FurnitureModelRuntime, MODEL_STATE, ModelErrorBoundary, PlaceholderBox } from './FurnitureModel'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <div>{children}</div>,
  useGLTF: vi.fn(),
}))

function BrokenModel() {
  throw new Error('secret raw loader exception https://private.example/model.glb')
}

describe('runtime furniture model states', () => {
  it('measures and reports ready once across rerenders with stable callbacks', () => {
    const scene = new Group()
    scene.add(new Mesh(new BoxGeometry(2, 1, 1), new MeshBasicMaterial()))
    useGLTF.mockReturnValue({ scene })

    const onMeasure = vi.fn()
    const onReady = vi.fn()
    const onStateChange = vi.fn((state) => {
      if (state === MODEL_STATE.READY) onReady()
    })
    const props = {
      url: 'https://models.nestify.asia/sofa.glb',
      onMeasure,
      onStateChange,
    }

    const { rerender } = render(<FurnitureModelRuntime {...props} />)
    expect(onMeasure).toHaveBeenCalledOnce()
    expect(onReady).toHaveBeenCalledOnce()

    rerender(<FurnitureModelRuntime {...props} />)
    rerender(<FurnitureModelRuntime {...props} />)
    rerender(<FurnitureModelRuntime {...props} />)

    expect(onMeasure).toHaveBeenCalledOnce()
    expect(onReady).toHaveBeenCalledOnce()
  })

  it.each([
    [MODEL_STATE.NO_MODEL, 'Chưa thể hiển thị món đồ'],
    [MODEL_STATE.LOADING, 'Đang chuẩn bị món đồ'],
    [MODEL_STATE.LOAD_FAILED, 'Không thể tải chi tiết món đồ'],
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
