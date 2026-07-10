import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as rolesApi from './api'

// Full permission catalogue for the role editor's checkbox matrix.
export function usePermissions(options = {}) {
  return useQuery({ queryKey: ['admin', 'permissions'], queryFn: rolesApi.getPermissions, ...options })
}

function useRolesMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}

export function useCreateRole() {
  return useRolesMutation((payload) => rolesApi.createRole(payload))
}

export function useUpdateRole() {
  return useRolesMutation(({ id, ...payload }) => rolesApi.updateRole(id, payload))
}

export function useDeleteRole() {
  return useRolesMutation((id) => rolesApi.deleteRole(id))
}
