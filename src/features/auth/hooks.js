import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import * as authApi from './api'

export function useRegister() {
  const login = useAuthStore((state) => state.login)

  return useMutation({
    mutationFn: (payload) => authApi.register(payload),
    onSuccess: ({ data }) => login(data.token, data.user),
  })
}

export function useLogin() {
  const login = useAuthStore((state) => state.login)

  return useMutation({
    mutationFn: (payload) => authApi.login(payload),
    onSuccess: ({ data }) => login(data.token, data.user),
  })
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout)

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => logout(),
  })
}

export function useMe() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: !!token,
  })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (payload) => authApi.forgotPassword(payload) })
}

export function useResetPassword() {
  return useMutation({ mutationFn: (payload) => authApi.resetPassword(payload) })
}

export function useVerifyEmail(params) {
  return useQuery({
    queryKey: ['auth', 'verify-email', params],
    queryFn: () => authApi.verifyEmail(params),
    enabled: Object.keys(params ?? {}).length > 0,
    retry: false,
  })
}

export function useResendVerificationEmail() {
  return useMutation({ mutationFn: () => authApi.resendVerificationEmail() })
}
