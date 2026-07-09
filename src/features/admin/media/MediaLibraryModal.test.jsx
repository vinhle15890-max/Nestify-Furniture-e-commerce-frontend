import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
