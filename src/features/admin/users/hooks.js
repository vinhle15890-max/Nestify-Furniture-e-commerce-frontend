import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as usersApi from './api'

// Filtered, paginated admin user list. `type` partitions staff vs customers; `role`
// narrows to one role; `search` matches name or email. Previous page data is kept
// while refetching so the table doesn't flash on filter/page changes.
export function useAdminUsers({ page = 1, type, search, role, enabled = true } = {}) {
  return useQuery({
    queryKey: ['admin', 'users', { page, type: type ?? null, search: search || null, role: role ?? null }],
    queryFn: () => usersApi.getUsers({ page, type, search: search || undefined, role }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

// Catalogue of assignable roles (id + display_name) for the role-assignment dialog.
export function useRoles(options = {}) {
  return useQuery({ queryKey: ['admin', 'roles'], queryFn: usersApi.getRoles, ...options })
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, roleIds }) => usersApi.assignUserRoles(id, roleIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: usersApi.createStaff, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }) })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) => usersApi.updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
