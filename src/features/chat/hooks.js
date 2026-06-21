import { useMutation } from '@tanstack/react-query'
import * as chatApi from './api'

export function useSendChatMessage() {
  return useMutation({
    mutationFn: (message) => chatApi.sendChatMessage(message),
  })
}
