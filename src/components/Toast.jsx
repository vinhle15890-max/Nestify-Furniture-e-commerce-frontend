import * as RadixToast from '@radix-ui/react-toast'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useToastStore } from '../store/toastStore'

// Becoming is near-monochrome with no free "success" hue (green = `confirmed`,
// restricted to Committed moments; `imagined` also restricted). So variant meaning
// is carried by an ICON (form), not by borrowing a colour a success toast can't have —
// which is also colour-blind-safe. Only `error` keeps a coloured cue: `destructive`
// red is a non-restricted, universally-read danger signal.
const variantConfig = {
  default: { border: 'border-border', Icon: null, iconClass: '' },
  success: { border: 'border-border', Icon: CheckCircle2, iconClass: 'text-foreground' },
  error: { border: 'border-destructive', Icon: AlertCircle, iconClass: 'text-destructive' },
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((toast) => {
        const cfg = variantConfig[toast.variant] ?? variantConfig.default
        const { Icon } = cfg
        return (
        <RadixToast.Root
          key={toast.id}
          duration={4000}
          className={`pointer-events-auto relative rounded-control border bg-surface p-4 pr-8 shadow-card ${cfg.border}`}
          onOpenChange={(open) => {
            if (!open) removeToast(toast.id)
          }}
        >
          <div className="flex gap-3">
            {Icon && <Icon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${cfg.iconClass}`} />}
            <div className="min-w-0">
              {toast.title && <RadixToast.Title className="font-medium text-foreground">{toast.title}</RadixToast.Title>}
              {toast.description && (
                <RadixToast.Description className="text-sm text-muted-foreground">
                  {toast.description}
                </RadixToast.Description>
              )}
            </div>
          </div>
          <RadixToast.Close aria-label="Đóng" className="absolute right-2 top-2 cursor-pointer text-muted-foreground">
            ×
          </RadixToast.Close>
        </RadixToast.Root>
        )
      })}
      {/* Top-anchored so transient toasts never cover the cart drawer footer /
          primary CTA at the bottom. pointer-events-none keeps the empty viewport
          area click-through; only toast cards (pointer-events-auto) capture input. */}
      <RadixToast.Viewport className="pointer-events-none fixed right-0 top-0 z-100 flex w-96 max-w-full flex-col gap-2 p-4 sm:p-6" />
    </RadixToast.Provider>
  )
}
