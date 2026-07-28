import { apiClient } from '../../lib/apiClient'

// POST /api/ai/chat → reply + catalog sources enriched for compact product cards.
export function sendChatMessage({ message, history = [] }) {
  return apiClient.post('/ai/chat', { message, history })
}
