import { useEffect } from 'react'

export const NETWORK_ERROR_MESSAGE = 'Đã có lỗi kết nối mạng. Vui lòng thử lại.'

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

// Convert a non-field ApiError into a safe, Vietnamese form-level message.
// `codeMap` lets a flow map known codes (e.g. RESET_FAILED, FORBIDDEN) to copy.
// NETWORK_ERROR is never shown as the raw axios English string. For any other
// unmapped code the backend message is used — it is guaranteed Vietnamese
// user-facing per backend docs/00-conventions.md (errors: messages() Vietnamese).
export function formLevelMessage(error, codeMap = {}) {
  if (!error) return NETWORK_ERROR_MESSAGE
  const code = error.code ?? ''
  if (codeMap[code]) return codeMap[code]
  if (code === 'NETWORK_ERROR') return NETWORK_ERROR_MESSAGE
  return error.message ?? NETWORK_ERROR_MESSAGE
}

// Focus the first invalid control in `formEl`, falling back to the first
// role="alert" form-level summary. Makes the failure known to keyboard + AT
// users without depending on a specific form library. Safe to call when there
// are no errors (returns null).
export function focusFirstError(formEl) {
  if (!formEl) return null
  const invalid = formEl.querySelector('[aria-invalid="true"]')
  if (invalid instanceof HTMLElement) {
    invalid.focus()
    return invalid
  }
  const alert = formEl.querySelector('[role="alert"]')
  if (alert instanceof HTMLElement) {
    if (alert.tabIndex < 0) alert.tabIndex = -1
    alert.focus()
    return alert
  }
  return null
}

// Convenience hook: focus the form-level error alert when `error` becomes
// truthy. Used by flows where errors are form-level only (e.g. verify-email),
// where a control to mark invalid does not exist.
export function useFocusFormAlert(error, ref) {
  useEffect(() => {
    if (error && ref.current) focusFirstError(ref.current)
  }, [error, ref])
}