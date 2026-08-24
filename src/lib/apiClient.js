import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { normalizeError } from './errors'
import { queryClient } from './queryClient'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const state = useAuthStore.getState()
  const isAdminRequest = config.authScope === 'admin' || config.url?.startsWith('/admin/')
  const token = isAdminRequest ? state.adminToken : state.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const isAuthRoute = error.config?.url?.startsWith('/auth/')
    const isAdminRequest = error.config?.authScope === 'admin' || error.config?.url?.startsWith('/admin/')
    if (error.response?.status === 401 && !isAuthRoute) {
      const state = useAuthStore.getState()
      if (isAdminRequest) state.adminLogout()
      else state.logout()
      queryClient.clear()
    }
    return Promise.reject(normalizeError(error))
  },
)
