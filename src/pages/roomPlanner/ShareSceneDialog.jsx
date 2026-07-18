import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { BecomingModal } from '../../components/BecomingModal'

// Minimal share affordance: the scene has already been made public server-side;
// this just surfaces the public link and copies it. No revoke (BE has no such
// endpoint) — see the scene-lifecycle spec.
export function ShareSceneDialog({ open, onOpenChange, token }) {
  const [copied, setCopied] = useState(false)
  const url = token ? `${window.location.origin}/room-planner/shared/${token}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the input is already selectable for manual copy.
    }
  }

  return (
    <BecomingModal
      open={open}
      onOpenChange={onOpenChange}
      title="Chia sẻ phòng"
      description="Bất kỳ ai có link đều xem được phòng này ở chế độ chỉ xem."
    >
      <div className="flex items-center gap-2">
        <input
          aria-label="Link chia sẻ"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-primary px-3 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary-hover"
        >
          {copied ? <><Check size={15} aria-hidden="true" /> Đã sao chép</> : <><Copy size={15} aria-hidden="true" /> Sao chép</>}
        </button>
      </div>
    </BecomingModal>
  )
}
