import { useClearPersonalizationHistory, useUpdatePersonalization } from '../../features/personalization/hooks'
import { useState } from 'react'
import { ConfirmActionDialog } from '../../components/ConfirmActionDialog'

export function PersonalizationControls({ enabled = true }) {
  const update = useUpdatePersonalization()
  const clear = useClearPersonalizationHistory()
  const [clearOpen, setClearOpen] = useState(false)

  const clearHistory = () => {
    clear.mutate(undefined, { onSuccess: () => setClearOpen(false) })
  }

  return (
    <section aria-labelledby="personalization-settings-title" className="mt-10 border-t border-border pt-7">
      <h2 id="personalization-settings-title" className="text-lg font-medium text-foreground">Cá nhân hóa hành trình</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Nestify dùng phòng đã lưu, wishlist và sản phẩm đã xem để giúp bạn tiếp tục đúng ngữ cảnh. Giá và điều kiện thanh toán không thay đổi theo dữ liệu này.</p>
      <label className="mt-5 flex min-h-11 max-w-xl cursor-pointer items-center justify-between gap-5 border-y border-unbuilt py-3 text-sm text-foreground">
        <span>Cho phép cá nhân hóa</span>
        <input type="checkbox" checked={enabled} disabled={update.isPending} onChange={(event) => update.mutate(event.target.checked)} className="h-5 w-5 accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </label>
      <button type="button" onClick={() => setClearOpen(true)} disabled={clear.isPending} className="mt-4 min-h-11 text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 hover:text-foreground active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        {clear.isPending ? 'Đang xóa lịch sử…' : 'Xóa lịch sử sản phẩm đã xem'}
      </button>
      {update.isError && <p role="alert" className="mt-3 text-sm text-destructive">Chưa cập nhật được lựa chọn cá nhân hóa.</p>}
      {clear.isError && <p role="alert" className="mt-3 text-sm text-destructive">Chưa xóa được lịch sử. Dữ liệu hiện tại vẫn được giữ nguyên.</p>}
      <ConfirmActionDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Xóa lịch sử đã xem?"
        consequence="Nestify sẽ quên các sản phẩm bạn đã xem để gợi ý lại từ đầu. Phòng đã lưu, wishlist và đơn hàng vẫn được giữ nguyên."
        confirmLabel="Xóa lịch sử đã xem"
        onConfirm={clearHistory}
        pending={clear.isPending}
        error={clear.isError ? 'Chưa xóa được lịch sử. Dữ liệu hiện tại vẫn được giữ nguyên.' : null}
        destructive
      />
    </section>
  )
}
