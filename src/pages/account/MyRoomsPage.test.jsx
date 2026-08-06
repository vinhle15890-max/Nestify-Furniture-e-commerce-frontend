import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { MyRoomsPage } from './MyRoomsPage'
import * as roomPlannerApi from '../../features/roomPlanner/api'

vi.mock('../../features/roomPlanner/api')

const page1 = {
  data: [
    {
      id: 7,
      name: 'Phòng khách',
      room_type: 'living_room',
      width: 4, depth: 5, height: 2.8,
      is_public: false,
      items: [{ id: 1, variant: { id: 1, sku: 'SOFA', model_3d_url: 'a.glb' } }],
      created_at: '2026-07-01T10:00:00Z',
    },
  ],
  meta: {
    limits: { max_rooms: 8, remaining_rooms: 7 },
    pagination: { total: 1, page: 1, last_page: 1, per_page: 10 },
  },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyRoomsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MyRoomsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    roomPlannerApi.listScenes.mockResolvedValue(page1)
  })

  it('lists saved rooms with a link to open each one', async () => {
    renderPage()
    expect(await screen.findByText('Phòng khách')).toBeInTheDocument()
    expect(screen.getByText(/4 × 5 × 2\.8 m/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mở/ })).toHaveAttribute('href', '/room-planner/7')
    expect(screen.getByText('1/8')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('card hiện ảnh preview khi có preview_url', async () => {
    roomPlannerApi.listScenes.mockResolvedValue({ ...page1, data: [{ ...page1.data[0], preview_url: 'https://cdn/room7.png' }] })
    renderPage()
    const img = await screen.findByRole('img', { name: /Ảnh phòng Phòng khách/ })
    expect(img).toHaveAttribute('src', 'https://cdn/room7.png')
  })

  it('card dùng placeholder khi chưa có preview_url', async () => {
    renderPage()
    await screen.findByText('Phòng khách')
    expect(screen.queryByRole('img', { name: /Ảnh phòng/ })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no rooms', async () => {
    roomPlannerApi.listScenes.mockResolvedValue({ data: [], meta: { limits: { max_rooms: 8, remaining_rooms: 8 }, pagination: { total: 0, page: 1, last_page: 1, per_page: 10 } } })
    renderPage()
    expect(await screen.findByText(/Căn hộ chưa có phòng nào/)).toBeInTheDocument()
    // Two entry points to the same action (header + empty-state CTA) both point at the planner.
    const createLinks = screen.getAllByRole('link', { name: /Thêm phòng/ })
    expect(createLinks.length).toBeGreaterThan(0)
    createLinks.forEach((link) => expect(link).toHaveAttribute('href', '/room-planner?new=1'))
  })

  it('prevents creating a ninth room when the home is full', async () => {
    roomPlannerApi.listScenes.mockResolvedValue({
      ...page1,
      meta: {
        limits: { max_rooms: 8, remaining_rooms: 0 },
        pagination: { total: 8, page: 1, last_page: 1, per_page: 10 },
      },
    })
    renderPage()

    expect(await screen.findByText(/Căn hộ đã đủ 8 phòng/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Thêm phòng' })).not.toBeInTheDocument()
  })

  it('deletes a room after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    roomPlannerApi.deleteScene.mockResolvedValue(null)
    renderPage()
    await screen.findByText('Phòng khách')
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
    await waitFor(() => expect(roomPlannerApi.deleteScene).toHaveBeenCalledWith(7))
  })

  it('renames a room', async () => {
    roomPlannerApi.updateScene.mockResolvedValue({ data: { id: 7, name: 'Phòng ngủ' } })
    renderPage()
    await screen.findByText('Phòng khách')
    await userEvent.click(screen.getByRole('button', { name: 'Đổi tên' }))
    const input = screen.getByRole('textbox', { name: 'Tên phòng' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Phòng ngủ{Enter}')
    await waitFor(() => expect(roomPlannerApi.updateScene).toHaveBeenCalledWith(7, { name: 'Phòng ngủ' }))
  })
})
