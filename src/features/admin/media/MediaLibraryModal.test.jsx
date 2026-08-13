import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MediaLibraryModal } from './MediaLibraryModal'
import * as mediaApi from './api'

vi.mock('./api')

function renderModal(props = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MediaLibraryModal
        open
        multiple
        onClose={props.onClose ?? (() => {})}
        onSelect={props.onSelect ?? (() => {})}
      />
    </QueryClientProvider>,
  )
}

describe('MediaLibraryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mediaApi.listMedia.mockResolvedValue({
      data: [{ id: 1, url: 'a.jpg', alt_text: 'Sofa', usage_count: 0 }],
      meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 24 } },
    })
  })

  it('selects an asset and fires onSelect with it', async () => {
    const onSelect = vi.fn()
    renderModal({ onSelect })

    const image = await screen.findByAltText('Sofa')
    const tile = image.closest('button')
    await userEvent.click(tile)
    await userEvent.click(screen.getByRole('button', { name: /chọn/i }))

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ id: 1 })])
  })

  it('remains on page N after the debounce duration when search did not change', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mediaApi.listMedia.mockImplementation(({ page }) => Promise.resolve({
      data: [{ id: page, url: `${page}.jpg`, alt_text: `Ảnh ${page}`, usage_count: 0 }],
      meta: { pagination: { total: 72, page, last_page: 3, per_page: 24 } },
    }))
    renderModal()

    await screen.findByAltText('Ảnh 1')
    // Let SearchInput's intentional initial debounce settle before paginating.
    await act(() => vi.advanceTimersByTimeAsync(300))
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    await screen.findByAltText('Ảnh 2')
    await act(() => vi.advanceTimersByTimeAsync(300))

    expect(mediaApi.listMedia).not.toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
    expect(screen.getByAltText('Ảnh 2')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('provides a visible full-width search field inside a viewport-safe modal', () => {
    renderModal()

    expect(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mô tả ảnh' }))
      .toHaveClass('w-full')
    expect(screen.getByRole('dialog')).toHaveClass('!max-w-3xl')
  })
})
