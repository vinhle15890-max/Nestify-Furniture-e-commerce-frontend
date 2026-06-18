import { apiClient } from '../../lib/apiClient'

export function register({ name, email, password, password_confirmation }) {
  return apiClient.post('/auth/register', { name, email, password, password_confirmation })
}

export function login({ email, password }) {
  return apiClient.post('/auth/login', { email, password })
}

export function logout() {
  return apiClient.post('/auth/logout')
}

export function getMe() {
  return apiClient.get('/auth/me')
}

export function forgotPassword({ email }) {
  return apiClient.post('/auth/forgot-password', { email })
}

export function resetPassword({ token, email, password, password_confirmation }) {
  return apiClient.post('/auth/reset-password', { token, email, password, password_confirmation })
}

export function verifyEmail(params) {
  return apiClient.post('/auth/verify-email', params)
}

export function resendVerificationEmail() {
  return apiClient.post('/auth/email/verification-notification')
}
