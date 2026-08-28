import { useQuery } from '@tanstack/react-query'
import * as dashboardApi from './api'

export function useAdminDashboard(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'dashboard', filters],
    queryFn: () => dashboardApi.getDashboard(filters),
  })
}
