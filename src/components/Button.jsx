const variantClasses = {
  primary: 'bg-primary text-surface hover:bg-primary-hover',
  secondary: 'border border-foreground text-foreground hover:bg-surface',
  ghost: 'text-foreground hover:bg-surface',
  destructive: 'bg-destructive text-surface hover:opacity-90',
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
