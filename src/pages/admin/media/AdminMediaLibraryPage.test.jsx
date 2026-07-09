import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminMediaLibraryPage } from './AdminMediaLibraryPage'
import { Toaster } from '../../../components/Toast'
import * as mediaApi from '../../../features/admin/media/api'

vi.mock('../../../features/admin/media/api')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminMediaLibraryPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const asset = { id: 5, url: 'https://example.com/lib/ghe.jpg', alt_text: 'Ảnh ghế gỗ', usage_count: 2 }

describe('AdminMediaLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mediaApi.listMedia.mockResolvedValue({
      data: [asset],
      meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 24 } },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the media grid with the usage badge', async () => {
    renderPage()

    expect(await screen.findByAltText('Ảnh ghế gỗ')).toBeInTheDocument()
    expect(screen.getByText('2 nơi')).toBeInTheDocument()
  })

  it('shows the blocked toast when deleting an in-use asset', async () => {
    mediaApi.deleteMedia.mockRejectedValue(
      Object.assign(new Error('Ảnh đang được sử dụng.'), {
        code: 'MEDIA_IN_USE',
        details: { usage_count: 2 },
      }),
    )
    renderPage()

    const image = await screen.findByAltText('Ảnh ghế gỗ')
    await userEvent.click(image.closest('button'))
    await userEvent.click(screen.getByRole('button', { name: 'Xoá ảnh đã chọn' }))

    expect(await screen.findByText(/đang được dùng bởi 2 nơi/)).toBeInTheDocument()
  })
})
