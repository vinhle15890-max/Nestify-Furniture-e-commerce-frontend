import { forwardRef } from 'react'

export const Input = forwardRef(function Input({ label, id, error, reserveMessageSpace = false, className = '', ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${error ? 'border-destructive' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
      {(error || reserveMessageSpace) && (
        <p
          id={error && id ? `${id}-error` : undefined}
          role={error ? 'alert' : undefined}
          aria-hidden={error ? undefined : 'true'}
          data-message-slot="true"
          className={`min-h-5 text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {error || ''}
        </p>
      )}
    </div>
  )
})
