import { useQuery } from '@tanstack/react-query'
import * as dashboardApi from './api'

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: dashboardApi.getDashboard,
  })
}
