import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../features/admin/collections/api'
import { AdminCollectionsPage } from './AdminCollectionsPage'

vi.mock('../../../features/admin/collections/api')

describe('AdminCollectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollections.mockResolvedValue({ data: [] })
    api.getCollectionProductOptions.mockResolvedValue({ data: [{ id: 7, name: 'Ghế mây', slug: 'ghe-may', status: 'active' }] })
    api.createCollection.mockResolvedValue({ data: { id: 1 } })
  })

  it('creates an ordered public collection', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter><AdminCollectionsPage /></MemoryRouter></QueryClientProvider>)
    fireEvent.change(await screen.findByLabelText('Tên'), { target: { value: 'Góc thư giãn' } })
    fireEvent.click(screen.getByLabelText('Ghế mây'))
    fireEvent.click(screen.getByLabelText('Công khai bộ sưu tập'))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bộ sưu tập' }))

    await waitFor(() => expect(api.createCollection).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Góc thư giãn', slug: 'goc-thu-gian', is_active: true,
      products: [{ id: 7, position: 1 }],
    })))
  })
})
