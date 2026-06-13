import * as RadixToast from '@radix-ui/react-toast'
import { useToastStore } from '../store/toastStore'

const variantClasses = {
  default: 'border-border',
  success: 'border-secondary',
  error: 'border-destructive',
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <RadixToast.Root
          key={toast.id}
          duration={4000}
          className={`relative rounded-control border bg-surface p-4 pr-8 shadow-soft ${variantClasses[toast.variant] ?? variantClasses.default}`}
          onOpenChange={(open) => {
            if (!open) removeToast(toast.id)
          }}
        >
          {toast.title && <RadixToast.Title className="font-medium text-foreground">{toast.title}</RadixToast.Title>}
          {toast.description && (
            <RadixToast.Description className="text-sm text-muted-foreground">
              {toast.description}
            </RadixToast.Description>
          )}
          <RadixToast.Close aria-label="Đóng" className="absolute right-2 top-2 cursor-pointer text-muted-foreground">
            ×
          </RadixToast.Close>
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport className="fixed bottom-0 right-0 z-100 flex w-96 max-w-full flex-col gap-2 p-4" />
    </RadixToast.Provider>
  )
}
