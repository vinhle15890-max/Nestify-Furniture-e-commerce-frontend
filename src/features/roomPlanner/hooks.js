import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as roomPlannerApi from './api'

export function useScene(id) {
  return useQuery({
    queryKey: ['roomScene', id],
    queryFn: () => roomPlannerApi.getScene(id),
    enabled: !!id,
  })
}

export function useCreateScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => roomPlannerApi.createScene(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['roomScene', response.data.id], response)
    },
  })
}

export function useUpdateScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => roomPlannerApi.updateScene(id, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['roomScene', response.data.id], response)
    },
  })
}
