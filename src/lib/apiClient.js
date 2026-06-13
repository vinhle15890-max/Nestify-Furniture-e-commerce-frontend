import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { normalizeError } from './errors'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const isAuthRoute = error.config?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !isAuthRoute) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(normalizeError(error))
  },
)
