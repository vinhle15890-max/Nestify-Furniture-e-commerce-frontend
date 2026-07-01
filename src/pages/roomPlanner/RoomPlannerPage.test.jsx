import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoomPlannerPage } from './RoomPlannerPage'
import * as roomPlannerApi from '../../features/roomPlanner/api'
import * as catalogApi from '../../features/catalog/api'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

// The 3D canvas can't run in jsdom — replace it with a marker.
vi.mock('./scene/RoomCanvas', () => ({ RoomCanvas: () => <div data-testid="room-canvas" /> }))
vi.mock('../../features/roomPlanner/api')
vi.mock('../../features/catalog/api')

function renderPage(path = '/room-planner') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/room-planner" element={<RoomPlannerPage />} />
          <Route path="/room-planner/:id" element={<RoomPlannerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RoomPlannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditorStore.getState().reset()
    catalogApi.getProducts.mockResolvedValue({
      data: [{ id: 1, name: 'Sofa', thumbnail: null, variants: [{ id: 11, sku: 'A', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 }] }],
      meta: { pagination: { has_more: false, next_cursor: null } },
    })
  })

  it('shows the setup dialog for a new room, then the canvas', async () => {
    renderPage('/room-planner')
    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    expect(await screen.findByTestId('room-canvas')).toBeInTheDocument()
  })

  it('adds a tray item then saves via create and shows the saved state', async () => {
    roomPlannerApi.createScene.mockResolvedValue({ data: { id: 55, name: 'Phòng của tôi' } })
    renderPage('/room-planner')
    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Sofa.*Đỏ/s }))
    await userEvent.click(screen.getByRole('button', { name: /lưu/i }))
    await waitFor(() => expect(roomPlannerApi.createScene).toHaveBeenCalled())
    const payload = roomPlannerApi.createScene.mock.calls[0][0]
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].variant_id).toBe(11)
  })

  it('loads an existing scene by id without the setup dialog', async () => {
    roomPlannerApi.getScene.mockResolvedValue({
      data: { id: 9, name: 'Phòng cũ', width: '4', depth: '5', height: '2.8', items: [] },
    })
    renderPage('/room-planner/9')
    expect(await screen.findByTestId('room-canvas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tạo phòng/i })).not.toBeInTheDocument()
  })
})
