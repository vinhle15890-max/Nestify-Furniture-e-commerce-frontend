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

export function useInfiniteProducts(filters = {}) {
  return useCursorQuery({
    queryKey: ['products', filters],
    queryFn: (cursor) => catalogApi.getProducts({ ...filters, cursor }),
  })
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ['products', slug],
    queryFn: () => catalogApi.getProduct(slug),
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
