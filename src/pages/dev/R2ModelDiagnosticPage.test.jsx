import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { R2ModelDiagnosticPage } from './R2ModelDiagnosticPage'

const loadedScene = new Group()
loadedScene.add(new Mesh(new BoxGeometry(2, 3, 4), new MeshBasicMaterial()))

vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div data-testid="canvas">{children}</div> }))
vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <>{children}</>,
  OrbitControls: () => null,
  useGLTF: (url) => {
    if (url.includes('broken')) throw new Error('GLTF parse failed')
    return { scene: loadedScene, parser: { json: {} } }
  },
}))
vi.mock('../../features/admin/products/api', () => ({ uploadModel: vi.fn() }))

beforeEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/__dev/r2-model')
})

it('renders without throwing or constructing a dashed model prop', () => {
  const { container } = render(<R2ModelDiagnosticPage />)
  expect(screen.getByLabelText('R2 GLB evidence')).toBeInTheDocument()
  expect(container.querySelector('[object-model]')).toBeNull()
})

it('reports mesh count, bounds, and MODEL_RENDERED only after a valid model loads', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
  render(<R2ModelDiagnosticPage />)
  fireEvent.change(screen.getByLabelText('Public R2 GLB URL'), { target: { value: 'https://models.nestify.asia/sofa.glb' } })
  fireEvent.submit(screen.getByLabelText('Public R2 GLB URL').closest('form'))
  await waitFor(() => expect(screen.getByText('MODEL_RENDERED')).toBeInTheDocument())
  expect(screen.getByText('1')).toBeInTheDocument()
  expect(screen.getByText('2.000 × 4.000 × 3.000')).toBeInTheDocument()
  expect(screen.queryByText('FALLBACK_RENDERED')).not.toBeInTheDocument()
  expect(document.querySelector('[object-model]')).toBeNull()
})

it('keeps loader failure truthful and never reports MODEL_RENDERED', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
  render(<R2ModelDiagnosticPage />)
  fireEvent.change(screen.getByLabelText('Public R2 GLB URL'), { target: { value: 'https://models.nestify.asia/broken.glb' } })
  fireEvent.submit(screen.getByLabelText('Public R2 GLB URL').closest('form'))
  await waitFor(() => expect(screen.getByText('FETCH_OK')).toBeInTheDocument())
  expect(screen.getByText('PARSE_FAILED')).toBeInTheDocument()
  expect(screen.getByText('FALLBACK_RENDERED')).toBeInTheDocument()
  expect(screen.queryByText('MODEL_RENDERED')).not.toBeInTheDocument()
})
