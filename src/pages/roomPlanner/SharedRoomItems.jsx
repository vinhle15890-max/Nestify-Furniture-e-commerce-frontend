import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { Button } from '../../components/Button'
import { formatPrice } from '../../lib/format'
import { summarizeItems } from '../../features/roomPlanner/summary'
import { addRoomToCart } from '../../features/roomPlanner/addRoomToCart'
import { useAddCartItem } from '../../features/cart/hooks'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

// Danh sách SP trong phòng chia sẻ + "Thêm cả phòng vào giỏ". Người xem chưa đăng
// nhập → đưa sang login (giữ đường về đúng trang này). Thêm best-effort, ở lại +
// link giỏ. CTA `primary` — mua thật vẫn chốt ở Checkout (không confirmed/imagined).
export function SharedRoomItems({ items }) {
  const { lines, total, hasUnpriced } = summarizeItems(items)
  const token = useAuthStore((s) => s.token)
  const addToast = useToastStore((s) => s.addToast)
  const addCart = useAddCartItem()
  const navigate = useNavigate()
  const location = useLocation()
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)

  const onAddRoom = async () => {
    if (!token) {
      navigate('/login', { state: { from: { pathname: location.pathname } } })
      return
    }
    setBusy(true)
    const res = await addRoomToCart(lines, addCart.mutateAsync)
    setBusy(false)
    if (res.added > 0) setAdded(true)
    let title
    if (res.added === 0) {
      title = 'Chưa thêm được món nào — có thể đã hết hàng hoặc ngừng bán.'
    } else if (res.skipped > 0) {
      title = `Đã thêm ${res.added} món (${res.skipped} món không khả dụng).`
    } else {
      title = `Đã thêm ${res.added} món vào giỏ.`
    }
    addToast({ title, variant: res.added > 0 ? 'success' : 'error' })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">Trong phòng này</h2>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line.variantId} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-muted-foreground">
              {line.slug
                ? <Link to={`/p/${line.slug}`} className="text-foreground hover:underline">{line.productName ?? line.name}</Link>
                : <span className="text-foreground">{line.productName ?? line.name}</span>}
              {line.qty > 1 && <span className="text-muted-foreground"> ×{line.qty}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{line.price === null ? '—' : formatPrice(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">Tổng tạm tính</span>
        <span className="tabular-nums font-medium text-foreground">{formatPrice(total)}{hasUnpriced ? '+' : ''}</span>
      </div>
      <Button type="button" variant="primary" onClick={onAddRoom} disabled={busy || lines.length === 0}>
        <ShoppingCart size={16} /> Thêm cả phòng vào giỏ
      </Button>
      {added && (
        <Link to="/cart" className="text-center text-sm text-accent hover:underline">Xem giỏ hàng →</Link>
      )}
    </div>
  )
}
