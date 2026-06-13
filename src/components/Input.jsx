export function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${error ? 'border-destructive' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
