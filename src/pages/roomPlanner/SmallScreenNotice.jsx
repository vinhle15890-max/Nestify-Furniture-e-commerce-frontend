import { useState } from 'react'
import { Check, Copy, Monitor } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { DimensionComparisonFallback } from './DimensionComparisonFallback'

export function SmallScreenNotice({ continueUrl, hasUnsavedChanges = false, onExit, room, items = [] }) {
  const [copyState, setCopyState] = useState('idle')

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(continueUrl)
      setCopyState('success')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 bg-canvas px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-card border border-unbuilt bg-surface">
        <Monitor size={32} className="text-foreground" aria-hidden="true" />
      </div>

      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-display text-2xl text-foreground">Tiếp tục thiết kế trên máy tính</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Không gian thử nội thất cần màn hình lớn hơn để bạn dễ quan sát và sắp xếp. Liên kết này sẽ
          đưa bạn trở lại đúng căn phòng hoặc món đồ đang xem khi mở trên máy tính.
        </p>
        {hasUnsavedChanges && (
          <p className="text-sm leading-6 text-foreground">
            Bạn đang có thay đổi chưa lưu trong tab này. Liên kết không chứa những thay đổi đó; hãy
            mở rộng lại cửa sổ để tiếp tục phần đang làm.
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={handleCopy}>
          {copyState === 'success'
            ? <Check size={16} aria-hidden="true" />
            : <Copy size={16} aria-hidden="true" />}
          {copyState === 'success' ? 'Đã sao chép' : 'Sao chép liên kết'}
        </Button>
        <Button type="button" variant="secondary" onClick={onExit}>
          Về cửa hàng
        </Button>
      </div>

      {copyState === 'success' && (
        <p role="status" className="text-sm text-foreground">
          Đã sao chép liên kết. Bạn có thể gửi hoặc mở liên kết đó trên máy tính.
        </p>
      )}

      {copyState === 'error' && (
        <div className="flex w-full max-w-md flex-col gap-3 text-left">
          <p role="alert" className="text-sm text-destructive">
            Không thể tự sao chép. Hãy chọn liên kết bên dưới để sao chép thủ công.
          </p>
          <Input
            id="planner-continuation-url"
            label="Liên kết tiếp tục"
            value={continueUrl}
            readOnly
            onFocus={(event) => event.target.select()}
          />
        </div>
      )}
      {room && <div className="w-full text-left"><DimensionComparisonFallback room={room} items={items} /></div>}
    </div>
  )
}
