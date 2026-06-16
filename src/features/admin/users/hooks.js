import { useOffsetQuery } from '../../../lib/pagination'
import * as usersApi from './api'

export function useAdminUsers(page) {
  return useOffsetQuery({
    queryKey: ['admin', 'users'],
    queryFn: usersApi.getUsers,
    page,
  })
}
