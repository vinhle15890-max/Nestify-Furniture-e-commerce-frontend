import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { BecomingModal } from '../../components/BecomingModal'
import { Button } from '../../components/Button'

export function GuestDraftLinkDialog({ open, onOpenChange, url }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // The selectable field remains the reliable manual-copy path.
    }
  }

  return (
    <BecomingModal
      open={open}
      onOpenChange={onOpenChange}
      title="Tiếp tục phòng trên thiết bị khác"
      description="Ai có liên kết này đều có thể mở phòng trong 30 ngày. Chỉ gửi liên kết cho thiết bị của bạn."
    >
      <label className="block text-sm font-medium text-foreground" htmlFor="guest-room-link">Liên kết tiếp tục</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id="guest-room-link" readOnly value={url ?? ''} onFocus={(event) => event.target.select()} className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <Button type="button" variant="secondary" className="min-h-11 shrink-0" onClick={copy}>
          {copied ? <><Check size={16} aria-hidden="true" />Đã sao chép</> : <><Copy size={16} aria-hidden="true" />Sao chép</>}
        </Button>
      </div>
    </BecomingModal>
  )
}
