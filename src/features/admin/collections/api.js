import { apiClient } from '../../../lib/apiClient'

export const getCollections = () => apiClient.get('/admin/collections')
export const getCollectionProductOptions = () => apiClient.get('/admin/collections/product-options')
export const createCollection = (payload) => apiClient.post('/admin/collections', payload)
export const updateCollection = (id, payload) => apiClient.patch(`/admin/collections/${id}`, payload)
export const deleteCollection = (id) => apiClient.delete(`/admin/collections/${id}`)
