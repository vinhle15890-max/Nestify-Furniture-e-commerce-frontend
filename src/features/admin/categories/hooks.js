import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as categoriesApi from './api'

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: categoriesApi.getCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => categoriesApi.createCategory(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) => categoriesApi.updateCategory(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  })
}

export function useUploadCategoryImage() {
  return useMutation({
    mutationFn: (formData) => categoriesApi.uploadImage(formData),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => categoriesApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  })
}
