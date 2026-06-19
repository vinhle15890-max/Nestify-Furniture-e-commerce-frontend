import { apiClient } from '../../lib/apiClient'

// POST /api/ai/chat → { data: { reply, sources: [{ entity_type, entity_id, product_name?, product_slug? }] } }
export function sendChatMessage(message) {
  return apiClient.post('/ai/chat', { message })
}
