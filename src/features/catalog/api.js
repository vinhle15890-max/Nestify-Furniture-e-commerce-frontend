import { apiClient } from '../../lib/apiClient'

export function getCategories() {
  return apiClient.get('/categories')
}

export function getCategory(slug) {
  return apiClient.get(`/categories/${slug}`)
}

export function getProducts({ category, brand, sort, cursor, limit } = {}) {
  const params = {}
  if (category) params['filter[category]'] = category
  if (brand) params['filter[brand]'] = brand
  if (sort) params.sort = sort
  if (cursor) params.cursor = cursor
  if (limit) params.limit = limit

  return apiClient.get('/products', { params })
}

export function getProduct(slug) {
  return apiClient.get(`/products/${slug}`)
}

export function getProductReviews(slug, { cursor, limit } = {}) {
  const params = {}
  if (cursor) params.cursor = cursor
  if (limit) params.limit = limit

  return apiClient.get(`/products/${slug}/reviews`, { params })
}
