import { apiClient } from '../../lib/apiClient'

export function register({ name, email, password, password_confirmation }) {
  return apiClient.post('/auth/register', { name, email, password, password_confirmation })
}

export function login({ email, password }) {
  return apiClient.post('/auth/login', { email, password })
}

export function adminLogin({ email, password }) {
  return apiClient.post('/auth/admin/login', { email, password }, { authScope: 'admin' })
}

export function logout() {
  return apiClient.post('/auth/logout')
}

export function getMe() {
  return apiClient.get('/auth/me')
}

export function adminLogout() {
  return apiClient.post('/auth/logout', undefined, { authScope: 'admin' })
}

export function getAdminMe() {
  return apiClient.get('/auth/me', { authScope: 'admin' })
}

export function updateProfile({ name, current_password, password, password_confirmation }) {
  const payload = { name }
  if (password) {
    payload.current_password = current_password
    payload.password = password
    payload.password_confirmation = password_confirmation
  }
  return apiClient.patch('/auth/profile', payload)
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
