import { Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SmallScreenNotice() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-8 text-center lg:hidden">
      <Monitor size={40} className="text-accent" aria-hidden="true" />
      <p className="text-lg font-medium text-foreground">Thiết kế phòng 3D dùng tốt nhất trên máy tính</p>
      <p className="max-w-sm text-sm text-muted-foreground">Vui lòng mở trên màn hình lớn hơn để có trải nghiệm chỉnh sửa đầy đủ.</p>
      <Link to="/" className="text-sm text-accent hover:underline">Về cửa hàng</Link>
    </div>
  )
}
