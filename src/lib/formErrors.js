// Returns true if `error` was a 422 VALIDATION_FAILED with field errors applied via setError.
export function applyServerErrors(error, setError) {
  if (error?.code !== 'VALIDATION_FAILED' || !error.details?.fields) {
    return false
  }

  for (const [field, messages] of Object.entries(error.details.fields)) {
    setError(field, { type: 'server', message: Array.isArray(messages) ? messages[0] : messages })
  }

  return true
}
