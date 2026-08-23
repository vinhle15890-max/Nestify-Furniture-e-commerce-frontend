import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export const useAdminCollections = () => useQuery({ queryKey: ['admin', 'collections'], queryFn: api.getCollections })
export const useCollectionProductOptions = () => useQuery({ queryKey: ['admin', 'collections', 'product-options'], queryFn: api.getCollectionProductOptions })

function mutation(requestFn) {
  return function useCollectionMutation() {
    const client = useQueryClient()
    return useMutation({ mutationFn: (payload) => requestFn(payload), onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'collections'] }) })
  }
}

export const useCreateCollection = mutation(api.createCollection)
export const useUpdateCollection = mutation(({ id, ...payload }) => api.updateCollection(id, payload))
export const useDeleteCollection = mutation(api.deleteCollection)
