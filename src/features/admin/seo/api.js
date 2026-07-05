import { apiClient } from '../../../lib/apiClient'

// Queue AI SEO generation for products missing SEO ('missing') or an explicit
// id list ('selected'). Returns { batch_id, queued }.
export function bulkGenerateSeo(payload) {
  return apiClient.post('/admin/products/seo/bulk', payload)
}

// Staged drafts awaiting review. status: 'pending' | 'failed'. Paginated.
export function getSeoDrafts({ status = 'pending', page = 1 } = {}) {
  return apiClient.get('/admin/products/seo/drafts', { params: { status, page } })
}

// Progress of a running bulk batch (poll while generating).
export function getSeoBatch(batchId) {
  return apiClient.get(`/admin/products/seo/bulk/${batchId}`)
}

// Copy a draft's fields onto its product.
export function applySeoDraft(productId) {
  return apiClient.post(`/admin/products/${productId}/seo/draft/apply`)
}

// Discard a draft.
export function dismissSeoDraft(productId) {
  return apiClient.post(`/admin/products/${productId}/seo/draft/dismiss`)
}
