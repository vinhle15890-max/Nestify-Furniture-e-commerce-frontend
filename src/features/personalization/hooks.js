import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import * as personalizationApi from './api'

export function useRecordProductView() {
  return useMutation({
    mutationFn: (slug) => personalizationApi.recordProductView(slug),
  })
}

export function useRecentlyViewed({ enabled = true, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['recently-viewed', limit],
    queryFn: () => personalizationApi.getRecentlyViewed(limit),
    enabled,
  })
}

export function useJourneyContext(options = {}) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const eligible = Boolean(token) && Boolean(user?.email_verified_at) && !isStaff(user)

  return useQuery({
    queryKey: ['personalization', 'journey-context'],
    queryFn: personalizationApi.getJourneyContext,
    enabled: eligible && options.enabled !== false,
  })
}

export function useUpdatePersonalization() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: personalizationApi.updatePersonalization,
    onSuccess: ({ data }) => {
      if (user) setUser({ ...user, personalization_enabled: data.enabled })
      queryClient.invalidateQueries({ queryKey: ['personalization'] })
      queryClient.invalidateQueries({ queryKey: ['recently-viewed'] })
    },
  })
}

export function useClearPersonalizationHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: personalizationApi.clearPersonalizationHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalization'] })
      queryClient.invalidateQueries({ queryKey: ['recently-viewed'] })
    },
  })
}
