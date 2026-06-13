export class ApiError extends Error {
  constructor(code, message, details, status) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details ?? null
    this.status = status
  }
}

export function normalizeError(error) {
  const status = error.response?.status
  const body = error.response?.data?.error

  if (body) {
    return new ApiError(body.code, body.message, body.details, status)
  }

  return new ApiError('NETWORK_ERROR', error.message, null, status)
}
