import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as catalogApi from '../../features/catalog/api'
import { CollectionPage } from './CollectionPage'

vi.mock('../../features/catalog/api')

describe('CollectionPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders collection copy and products in API order', async () => {
    catalogApi.getCollection.mockResolvedValue({ data: { name: 'Góc đọc yên', slug: 'goc-doc-yen', description: 'Một nơi để chậm lại.', products: [
      { id: 1, name: 'Ghế đọc', slug: 'ghe-doc', base_price: 1200000, variants: [] },
      { id: 2, name: 'Đèn sàn', slug: 'den-san', base_price: 800000, variants: [] },
    ] } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/collections/goc-doc-yen']}><Routes><Route path="/collections/:collectionSlug" element={<CollectionPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'Góc đọc yên' })).toBeInTheDocument()
    expect(screen.getByText('Một nơi để chậm lại.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)).toEqual(['Ghế đọc', 'Đèn sàn'])
    expect(catalogApi.getCollection).toHaveBeenCalledWith('goc-doc-yen')
  })
})
