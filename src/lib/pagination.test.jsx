import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useCursorQuery, useOffsetQuery } from './pagination'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return Wrapper
}

describe('useCursorQuery', () => {
  it('fetches the first page and follows next_cursor via fetchNextPage', async () => {
    const queryFn = (cursor) => {
      if (!cursor) {
        return Promise.resolve({
          data: [{ id: 1 }, { id: 2 }],
          meta: { pagination: { next_cursor: 'cursor-2', has_more: true, limit: 2 } },
        })
      }
      return Promise.resolve({
        data: [{ id: 3 }],
        meta: { pagination: { next_cursor: null, has_more: false, limit: 2 } },
      })
    }

    const { result } = renderHook(
      () => useCursorQuery({ queryKey: ['products'], queryFn }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.pages[0].data).toEqual([{ id: 1 }, { id: 2 }])
    expect(result.current.hasNextPage).toBe(true)

    await result.current.fetchNextPage()

    await waitFor(() => expect(result.current.data.pages).toHaveLength(2))
    expect(result.current.data.pages[1].data).toEqual([{ id: 3 }])
    expect(result.current.hasNextPage).toBe(false)
  })
})

describe('useOffsetQuery', () => {
  it('fetches data for the given page and refetches when page changes', async () => {
    const queryFn = (page) =>
      Promise.resolve({
        data: [{ id: page }],
        meta: { pagination: { total: 30, page, last_page: 3, per_page: 10 } },
      })

    const { result, rerender } = renderHook(
      ({ page }) => useOffsetQuery({ queryKey: ['admin', 'orders'], queryFn, page }),
      { wrapper: createWrapper(), initialProps: { page: 1 } },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.data).toEqual([{ id: 1 }])
    expect(result.current.data.meta.pagination.page).toBe(1)

    rerender({ page: 2 })

    await waitFor(() => expect(result.current.data.data).toEqual([{ id: 2 }]))
  })
})
