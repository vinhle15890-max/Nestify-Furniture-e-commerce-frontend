import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CatalogTray } from './CatalogTray'
import * as catalogApi from '../../features/catalog/api'

vi.mock('../../features/catalog/api')

function renderTray(onAdd = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CatalogTray onAdd={onAdd} />
    </QueryClientProvider>,
  )
  return onAdd
}

describe('CatalogTray', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogApi.getProducts.mockResolvedValue({
      data: [
        {
          id: 1, name: 'Sofa', thumbnail: null,
          variants: [
            { id: 11, sku: 'A', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 },
            { id: 12, sku: 'B', name: 'Xanh', model_3d_url: null, price: 120 },
          ],
        },
      ],
      meta: { pagination: { has_more: false, next_cursor: null } },
    })
  })

  it('lists only variants with a 3D model and adds on click', async () => {
    const onAdd = renderTray()
    const button = await screen.findByRole('button', { name: /Sofa.*Đỏ/s })
    expect(screen.queryByText('Xanh')).not.toBeInTheDocument()
    await userEvent.click(button)
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 11, model_3d_url: 'a.glb' }))
    expect(screen.getByRole('status')).toHaveTextContent('Đã đặt Sofa')
  })

  it('shows an empty state when no products have a 3D model', async () => {
    catalogApi.getProducts.mockResolvedValue({
      data: [{ id: 2, name: 'Bàn', variants: [{ id: 21, sku: 'C', model_3d_url: null }] }],
      meta: { pagination: { has_more: false, next_cursor: null } },
    })
    renderTray()
    expect(await screen.findByText(/^chưa có sản phẩm 3d$/i)).toBeInTheDocument()
  })

  it('marks keyboard activation as a reversible placement', async () => {
    const onAdd = vi.fn()
    renderTray(onAdd)
    const button = await screen.findByRole('button', { name: /đặt sofa/i })
    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }), { provisional: true })
  })
})
