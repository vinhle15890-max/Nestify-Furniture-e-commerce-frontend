import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Consistent "go back" affordance.
 *
 * Hybrid behaviour: if the user reached this page by navigating within the app,
 * go back to the exact previous screen (preserving its filters/scroll); on a
 * direct load / refresh / shared or email link there is no in-app history, so we
 * fall back to a sensible logical parent (`to`) instead of leaving the site.
 *
 * React Router records its position in `window.history.state.idx` — `idx > 0`
 * means there is at least one earlier in-app entry we can safely return to.
 */
export function BackLink({ to, children, className = '' }) {
  const navigate = useNavigate()

  function handleClick() {
    const hasInAppHistory = (window.history.state?.idx ?? 0) > 0
    if (hasInAppHistory) {
      navigate(-1)
    } else {
      navigate(to)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-accent ${className}`}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </button>
  )
}
