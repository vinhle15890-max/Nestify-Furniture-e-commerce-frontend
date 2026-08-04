import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const PasswordInput = forwardRef(function PasswordInput({ label, id, error, guidance, reserveMessageSpace = false, ...props }, ref) {
  const [visible, setVisible] = useState(false)
  const message = error || guidance
  const messageId = error ? `${id}-error` : guidance ? `${id}-guidance` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={messageId}
          className={`w-full rounded-control border bg-surface px-3 py-2 pr-12 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${error ? 'border-destructive' : 'border-border'}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Ẩn ${label.toLocaleLowerCase('vi')}` : `Hiện ${label.toLocaleLowerCase('vi')}`}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {(message || reserveMessageSpace) && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          aria-hidden={message ? undefined : 'true'}
          data-message-slot="true"
          className={`min-h-5 text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {message || ''}
        </p>
      )}
    </div>
  )
})
