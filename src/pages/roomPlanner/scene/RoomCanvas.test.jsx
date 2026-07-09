import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { RoomCanvas } from './RoomCanvas'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Stub react-three-fiber's Canvas so the "supported" branch is observable in
// jsdom without booting three.js. Renders a REAL <canvas> (marker testid) and
// invokes onCreated with it, so the runtime context-loss listeners can be
// attached and fired in a test.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ onCreated }) => (
    <canvas
      data-testid="r3f-canvas"
      ref={(el) => { if (el && onCreated) onCreated({ gl: { domElement: el } }) }}
    />
  ),
}))

const realGetContext = HTMLCanvasElement.prototype.getContext

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = realGetContext
  cleanup()
})

function seedRoom() {
  useEditorStore.setState({ room: { width: 4, depth: 5, height: 2.8 }, items: [], selectedId: null })
}

// A stand-in WebGL context exposing the WEBGL_lose_context extension so the
// hook can release it. Returns the spies so tests can assert cleanup.
function mockContext() {
  const loseContext = vi.fn()
  const getExtension = vi.fn(() => ({ loseContext }))
  return { ctx: { getExtension }, getExtension, loseContext }
}

describe('RoomCanvas WebGL capability gate', () => {
  test('no WebGL context → renders fallback, does NOT mount <Canvas>', () => {
    // getContext returns null for BOTH webgl2 and webgl → unsupported.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
    seedRoom()

    render(<RoomCanvas />)

    // Crash-prevention assertion: react-three-fiber Canvas must not be mounted.
    expect(screen.queryByTestId('r3f-canvas')).not.toBeInTheDocument()
    expect(screen.getByText(/không hỗ trợ hiển thị 3D/i)).toBeInTheDocument()
    // Entered dimensions echoed as plain text.
    expect(screen.getByText(/4 × 5 × 2\.8 m/)).toBeInTheDocument()
  })

  test('webgl2 unavailable but webgl available → mounts <Canvas> and releases the context', () => {
    // First call (webgl2) → null; second call (webgl) → a context. Proves the
    // fallback attempt is actually made, not just webgl2.
    const { ctx, getExtension, loseContext } = mockContext()
    const getContext = vi
      .fn()
      .mockImplementationOnce(() => null) // webgl2
      .mockImplementationOnce(() => ctx) // webgl
    HTMLCanvasElement.prototype.getContext = getContext
    seedRoom()

    render(<RoomCanvas />)

    // Mount decision unchanged: supported → Canvas mounts, no fallback.
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
    expect(screen.queryByText(/không hỗ trợ hiển thị 3D/i)).not.toBeInTheDocument()
    expect(getContext).toHaveBeenNthCalledWith(1, 'webgl2')
    expect(getContext).toHaveBeenNthCalledWith(2, 'webgl')
    // Resource cleanup: the throwaway context was explicitly released.
    expect(getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
    expect(loseContext).toHaveBeenCalledTimes(1)
  })

  test('WebGL available (webgl2) → mounts <Canvas> and releases the context', () => {
    const { ctx, getExtension, loseContext } = mockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)
    seedRoom()

    render(<RoomCanvas />)

    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
    expect(screen.queryByText(/không hỗ trợ hiển thị 3D/i)).not.toBeInTheDocument()
    // Resource cleanup on the webgl2-supported path.
    expect(getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
    expect(loseContext).toHaveBeenCalledTimes(1)
  })

  test('runtime context loss shows a recovery overlay; restore hides it', () => {
    const { ctx } = mockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)
    seedRoom()

    render(<RoomCanvas />)
    const canvas = screen.getByTestId('r3f-canvas')

    // GPU context lost after mount → overlay appears, canvas stays mounted.
    fireEvent(canvas, new Event('webglcontextlost', { cancelable: true }))
    expect(screen.getByText(/Mất kết nối đồ hoạ tạm thời/i)).toBeInTheDocument()
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()

    // Context restored → overlay clears.
    fireEvent(canvas, new Event('webglcontextrestored'))
    expect(screen.queryByText(/Mất kết nối đồ hoạ tạm thời/i)).not.toBeInTheDocument()
  })
})
