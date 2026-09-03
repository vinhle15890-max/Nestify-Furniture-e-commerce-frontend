import { useQueries, useQuery } from '@tanstack/react-query'
import { useCursorQuery } from '../../lib/pagination'
import * as catalogApi from './api'

export function useCategories(options = {}) {
  return useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.getCategories,
    ...options,
  })
}

export function useCategory(slug) {
  return useQuery({
    queryKey: ['categories', slug],
    queryFn: () => catalogApi.getCategory(slug),
    enabled: !!slug,
  })
}

export function useCollections() {
  return useQuery({ queryKey: ['collections'], queryFn: catalogApi.getCollections })
}

export function useCollection(slug) {
  return useQuery({
    queryKey: ['collections', slug],
    queryFn: () => catalogApi.getCollection(slug),
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

export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: () => catalogApi.getFeaturedProducts({ limit }),
  })
}

export function useBestSellerReviewEvidence(productLimit = 4, reviewLimit = 5) {
  const bestSellers = useBestSellers(productLimit)
  const products = bestSellers.data?.data ?? []
  const reviewQueries = useQueries({
    queries: products.map((product) => ({
      queryKey: ['products', product.slug, 'reviews', 'home-evidence', reviewLimit],
      queryFn: () => catalogApi.getProductReviews(product.slug, { limit: reviewLimit }),
    })),
  })

  return {
    groups: products.map((product, index) => ({
      product,
      reviews: (reviewQueries[index]?.data?.data ?? [])
        .filter((review) => review.verified_purchase === true),
    })),
    isLoading: bestSellers.isLoading || reviewQueries.some((query) => query.isLoading),
    isError: bestSellers.isError || (reviewQueries.length > 0 && reviewQueries.every((query) => query.isError)),
  }
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
