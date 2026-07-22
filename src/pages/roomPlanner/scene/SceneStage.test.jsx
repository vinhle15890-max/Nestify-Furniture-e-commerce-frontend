import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { SceneStage } from './SceneStage'

// Camera stub shared by the useThree mock below — asserted against in the
// topDown test. Declared via vi.hoisted so it's initialized before the
// hoisted vi.mock factories run.
const { mockCamera, environmentSpy, orbitControlsSpy } = vi.hoisted(() => ({
  mockCamera: {
    position: { set: vi.fn() },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
  },
  environmentSpy: vi.fn(() => null),
  orbitControlsSpy: vi.fn(() => null),
}))

// Stub react-three-fiber's Canvas so the "supported" branch is observable in
// jsdom without booting three.js. Renders a REAL <canvas> (marker testid) and
// invokes onCreated with it, so the runtime context-loss listeners can be
// attached and fired in a test. Children now DO render (as plain DOM nodes,
// same pattern as ScaleReference.test.jsx / RoomEditOverlay.test.jsx) so the
// CameraRig + OrbitControls wiring is observable — drei/useThree are stubbed
// below so <Room>/<OrbitControls> mount without booting three.js.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ onCreated, children }) => (
    <canvas
      data-testid="r3f-canvas"
      ref={(el) => { if (el && onCreated) onCreated({ gl: { domElement: el } }) }}
    >
      {children}
    </canvas>
  ),
  useThree: () => ({ camera: mockCamera }),
}))

vi.mock('@react-three/drei', () => ({
  Environment: (props) => environmentSpy(props),
  OrbitControls: (props) => orbitControlsSpy(props),
  Grid: () => null,
}))

const realGetContext = HTMLCanvasElement.prototype.getContext

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = realGetContext
  cleanup()
})

const room = { width: 4, depth: 5, height: 2.8 }

// A stand-in WebGL context exposing the WEBGL_lose_context extension so the
// hook can release it. Returns the spies so tests can assert cleanup.
function mockContext() {
  const loseContext = vi.fn()
  const getExtension = vi.fn(() => ({ loseContext }))
  return { ctx: { getExtension }, getExtension, loseContext }
}

describe('SceneStage WebGL capability gate', () => {
  test('uses apartment image-based environment lighting', () => {
    const { ctx } = mockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)

    render(<SceneStage room={room} />)

    expect(environmentSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ preset: 'apartment' }),
    )
  })

  test('no WebGL context → renders fallback, does NOT mount <Canvas>', () => {
    // getContext returns null for BOTH webgl2 and webgl → unsupported.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null)

    render(<SceneStage room={room} />)

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

    render(<SceneStage room={room} />)

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

    render(<SceneStage room={room} />)

    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
    expect(screen.queryByText(/không hỗ trợ hiển thị 3D/i)).not.toBeInTheDocument()
    expect(getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
    expect(loseContext).toHaveBeenCalledTimes(1)
  })

  test('runtime context loss shows a recovery overlay; restore hides it', () => {
    const { ctx } = mockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)

    render(<SceneStage room={room} />)
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

describe('SceneStage top-down "Chỉnh phòng" mode', () => {
  test('topDown false (default) → OrbitControls rotation enabled', () => {
    const { ctx } = mockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)

    render(<SceneStage room={room} />)

    const props = orbitControlsSpy.mock.calls.at(-1)[0]
    expect(props.enableRotate).toBe(true)
    expect(props.minPolarAngle).toBe(0)
    expect(props.maxPolarAngle).toBe(Math.PI)
  })

  test('topDown true → OrbitControls rotation locked + camera moved overhead', () => {
    const { ctx } = mockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)

    render(<SceneStage room={room} topDown />)

    const props = orbitControlsSpy.mock.calls.at(-1)[0]
    expect(props.enableRotate).toBe(false)
    expect(props.minPolarAngle).toBe(0)
    expect(props.maxPolarAngle).toBe(0.0001)
    expect(mockCamera.position.set).toHaveBeenCalledWith(0, expect.any(Number), 0.001)
  })

  test('keeps OrbitControls angle props defined when leaving room edit mode', () => {
    const { ctx } = mockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)

    const { rerender } = render(<SceneStage room={room} topDown />)
    rerender(<SceneStage room={{ ...room, width: 3, depth: 4 }} topDown />)
    rerender(<SceneStage room={{ ...room, width: 3, depth: 4 }} topDown={false} />)

    const props = orbitControlsSpy.mock.calls.at(-1)[0]
    expect(props).toMatchObject({
      enableRotate: true,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
    })
  })
})
