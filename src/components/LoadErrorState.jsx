import { AlertCircle } from 'lucide-react'
import { Button } from './Button'

export function LoadErrorState({
  title,
  description,
  onRetry,
  isRetrying = false,
  compact = false,
  background = false,
  className = '',
}) {
  return (
    <div
      role={background ? 'status' : 'alert'}
      className={`flex ${compact ? 'flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-start' : 'flex-col items-center gap-4 px-6 py-10 text-center'} rounded-card border border-destructive/30 bg-surface ${className}`}
    >
      <AlertCircle
        size={compact ? 20 : 28}
        aria-hidden="true"
        className="shrink-0 text-destructive"
      />
      <div className={compact ? 'min-w-0 flex-1' : 'max-w-md'}>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="secondary"
          onClick={onRetry}
          disabled={isRetrying}
          className={compact ? 'self-start shrink-0' : ''}
        >
          {isRetrying ? 'Đang thử lại...' : 'Thử lại'}
        </Button>
      )}
    </div>
  )
}
