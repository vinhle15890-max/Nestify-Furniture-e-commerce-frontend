import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOffsetQuery } from '../../lib/pagination'
import * as roomPlannerApi from './api'

export function useScenes(page) {
  return useOffsetQuery({
    queryKey: ['roomScenes'],
    queryFn: (p) => roomPlannerApi.listScenes(p),
    page,
  })
}

export function useDeleteScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => roomPlannerApi.deleteScene(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}

export function useRenameScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }) => roomPlannerApi.updateScene(id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}

export function useShareScene() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => roomPlannerApi.shareScene(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}

export function useSharedScene(token) {
  return useQuery({
    queryKey: ['sharedScene', token],
    queryFn: () => roomPlannerApi.getSharedScene(token),
    enabled: !!token,
    retry: false,
  })
}

export function useScene(id) {
  return useQuery({
    queryKey: ['roomScene', id],
    queryFn: () => roomPlannerApi.getScene(id),
    enabled: !!id,
  })
}

export function useSceneReview(id, enabled = true) {
  return useQuery({
    queryKey: ['roomSceneReview', id],
    queryFn: () => roomPlannerApi.reviewScene(id),
    enabled: Boolean(id) && enabled,
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

export function useUploadScenePreview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }) => roomPlannerApi.uploadScenePreview(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}

export function useAddSceneToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => roomPlannerApi.addSceneToCart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useRoomDraft(token) {
  return useQuery({
    queryKey: ['roomDraft', token],
    queryFn: () => roomPlannerApi.getRoomDraft(token),
    enabled: Boolean(token),
    retry: false,
  })
}

export function useSaveRoomDraft() {
  return useMutation({
    mutationFn: ({ token, payload }) => token
      ? roomPlannerApi.updateRoomDraft(token, payload)
      : roomPlannerApi.createRoomDraft(payload),
  })
}

export function useClaimRoomDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: roomPlannerApi.claimRoomDraft,
    onSuccess: (response) => queryClient.setQueryData(['roomScene', response.data.id], response),
  })
}
