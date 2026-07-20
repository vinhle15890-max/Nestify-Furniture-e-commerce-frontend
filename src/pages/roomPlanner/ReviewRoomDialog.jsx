import { BecomingModal } from '../../components/BecomingModal'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { RoomSummary } from './RoomSummary'

export function ReviewRoomDialog({ open, onOpenChange, items, onContinue, pending }) {
  return (
    <BecomingModal open={open} onOpenChange={onOpenChange} title="Xem lại phòng" description="Kiểm tra các món bạn đã đặt trước khi chuyển sang giỏ hàng.">
      <RoomSummary items={items} />
      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={onContinue} disabled={pending}>
          {pending ? <Spinner label="Đang chuẩn bị giỏ hàng" /> : 'Tiếp tục đến giỏ hàng'}
        </Button>
      </div>
    </BecomingModal>
  )
}
