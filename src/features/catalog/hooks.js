import { useQuery } from '@tanstack/react-query'
import { useCursorQuery } from '../../lib/pagination'
import * as catalogApi from './api'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.getCategories,
  })
}

export function useCategory(slug) {
  return useQuery({
    queryKey: ['categories', slug],
    queryFn: () => catalogApi.getCategory(slug),
    enabled: !!slug,
  })
}

export function useInfiniteProducts(filters = {}, { enabled = true } = {}) {
  return useCursorQuery({
    queryKey: ['products', filters],
    queryFn: (cursor) => catalogApi.getProducts({ ...filters, cursor }),
    enabled,
  })
}

export function useBestSellers(limit = 8) {
  return useQuery({
    queryKey: ['products', 'best-sellers', limit],
    queryFn: () => catalogApi.getBestSellers({ limit }),
  })
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ['products', slug],
    queryFn: () => catalogApi.getProduct(slug),
    enabled: !!slug,
  })
}

// Deep-link (Room Planner) preload of a product. Same cache key as useProduct
// (so a product already loaded from its detail page is reused instantly), but
// with a request-scoped 10s timeout — the global axios instance has NO timeout
// (`timeout: 0`), which would otherwise leave the planner hanging forever on a
// stalled request. NOTE: that missing global timeout is a separate latent issue,
// intentionally NOT fixed here to avoid an app-wide blast radius. Inherits the
// QueryClient default `retry: 1`.
export function useProductPreload(slug) {
  return useQuery({
    queryKey: ['products', slug],
    queryFn: () => catalogApi.getProduct(slug, { timeout: 10000 }),
    enabled: !!slug,
  })
}

export function useProductReviews(slug) {
  return useCursorQuery({
    queryKey: ['products', slug, 'reviews'],
    queryFn: (cursor) => catalogApi.getProductReviews(slug, { cursor }),
    enabled: !!slug,
  })
}
