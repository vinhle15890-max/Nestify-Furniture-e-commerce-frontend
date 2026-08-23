import { apiClient } from '../../lib/apiClient'

export function getCategories() {
  return apiClient.get('/categories')
}

export function getCategory(slug) {
  return apiClient.get(`/categories/${slug}`)
}

export function getCollections() {
  return apiClient.get('/collections')
}

export function getCollection(slug) {
  return apiClient.get(`/collections/${slug}`)
}

export function getProducts({ category, brand, woodType, priceMin, priceMax, sort, cursor, limit, search } = {}) {
  const params = {}
  if (category) params['filter[category]'] = category
  if (brand) params['filter[brand]'] = brand
  if (woodType) params['filter[wood_type]'] = woodType
  if (priceMin != null && priceMin !== '') params['filter[price_min]'] = priceMin
  if (priceMax != null && priceMax !== '') params['filter[price_max]'] = priceMax
  if (search) params['filter[search]'] = search
  if (sort) params.sort = sort
  if (cursor) params.cursor = cursor
  if (limit) params.limit = limit

  return apiClient.get('/products', { params })
}

export function getBestSellers({ limit } = {}) {
  const params = {}
  if (limit) params.limit = limit

  return apiClient.get('/products/best-sellers', { params })
}

export function getFeaturedProducts({ limit } = {}) {
  const params = {}
  if (limit) params.limit = limit

  return apiClient.get('/products/featured', { params })
}

// `config` lets a caller pass a request-scoped axios config (e.g. a per-call
// `timeout`) WITHOUT mutating the shared apiClient instance. Default `{}` keeps
// every existing caller (ProductPage) unchanged.
export function getProduct(slug, config = {}) {
  return apiClient.get(`/products/${slug}`, config)
}

export function getProductReviews(slug, { cursor, limit } = {}) {
  const params = {}
  if (cursor) params.cursor = cursor
  if (limit) params.limit = limit

  return apiClient.get(`/products/${slug}/reviews`, { params })
}
