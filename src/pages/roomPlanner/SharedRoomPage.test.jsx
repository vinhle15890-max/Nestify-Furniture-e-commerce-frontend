import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SharedRoomPage } from './SharedRoomPage'
import * as roomPlannerApi from '../../features/roomPlanner/api'

vi.mock('../../features/roomPlanner/api')
// The real 3D canvas is irrelevant to this page's logic; stub it.
vi.mock('./scene/SharedSceneCanvas', () => ({ SharedSceneCanvas: () => <div data-testid="shared-canvas" /> }))

const scene = {
  data: {
    id: 7, name: 'Phòng khách', width: 4, depth: 5, height: 2.8, is_public: true,
    items: [{ id: 1, variant: { id: 1, sku: 'SOFA', model_3d_url: 'a.glb' }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }],
  },
}

function renderAt(token) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/room-planner/shared/${token}`]}>
        <Routes><Route path="/room-planner/shared/:token" element={<SharedRoomPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SharedRoomPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the shared scene name and read-only canvas (no editing chrome)', async () => {
    roomPlannerApi.getSharedScene.mockResolvedValue(scene)
    renderAt('tok123')
    expect(await screen.findByText('Phòng khách')).toBeInTheDocument()
    expect(screen.getByTestId('shared-canvas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Khám phá cửa hàng/ })).toHaveAttribute('href', '/c/all')
    // No editor affordances leak into the public viewer.
    expect(screen.queryByRole('button', { name: 'Thêm vào giỏ' })).not.toBeInTheDocument()
  })

  it('shows a friendly not-found message when the token is invalid', async () => {
    roomPlannerApi.getSharedScene.mockRejectedValue({ status: 404 })
    renderAt('bad')
    expect(await screen.findByText(/không tồn tại hoặc đã gỡ/)).toBeInTheDocument()
  })
})
