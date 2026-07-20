import { AlertCircle } from 'lucide-react'

export function FeedbackState({ kind = 'empty', title, description, action, compact = false, className = '' }) {
  const isError = kind === 'error'
  return (
    <section role={isError ? 'alert' : 'status'} className={`${compact ? 'py-5' : 'py-9'} border-y border-unbuilt ${className}`}>
      <div className="max-w-xl">
        {isError && <AlertCircle size={20} aria-hidden="true" className="mb-3 text-destructive" />}
        <h2 className="text-xl font-medium text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </section>
  )
}
