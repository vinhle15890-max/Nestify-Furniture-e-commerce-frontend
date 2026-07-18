import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ScaleReference } from './ScaleReference'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => children }))
vi.mock('@react-three/drei', () => ({ TransformControls: ({ children }) => children }))

describe('ScaleReference', () => {
  it('render bóng người + cửa (>=3 mesh) không throw', () => {
    useEditorStore.getState().reset()
    const { container } = render(
      <ScaleReference room={{ width: 4, depth: 4, height: 3 }} onDragChange={() => {}} />,
    )
    expect(container.querySelectorAll('mesh').length).toBeGreaterThanOrEqual(3)
  })
})
