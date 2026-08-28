import { Link } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { formatDate, formatPrice } from '../../lib/format'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { isStaff } from '../../lib/roles'
import { useClaimVoucher, useVoucherCampaigns } from '../../features/promotions/hooks'

function benefit(voucher) {
  return voucher.type === 'percentage' ? `Giảm ${Number(voucher.value)}%` : `Giảm ${formatPrice(voucher.value)}`
}

export function VoucherCampaignsPage() {
  const query = useVoucherCampaigns()
  const claim = useClaimVoucher()
  const { token, user } = useAuthStore()
  const toast = useToastStore((state) => state.addToast)
  const vouchers = query.data?.data ?? []

  const collect = (voucher) => claim.mutate(voucher.id, {
    onSuccess: () => toast({ title: `Đã lưu ${voucher.code} vào ví`, variant: 'success' }),
    onError: (error) => toast({ title: error.message ?? 'Chưa thể lưu voucher', variant: 'error' }),
  })

  return (
    <main className="min-h-screen bg-canvas px-6 py-16 text-ink md:py-24 lg:px-10">
      <header className="mx-auto max-w-5xl border-b border-border pb-10">
        <p className="text-sm text-muted-foreground">Ưu đãi có điều kiện rõ ràng</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,5rem)] font-normal leading-none">Voucher dành cho bạn</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">Lưu mã phù hợp vào ví, rồi chọn lại tại giỏ hàng. Mỗi đơn dùng một voucher; khả năng kết hợp với sản phẩm sale được ghi trên từng mã.</p>
      </header>
      <section aria-label="Voucher đang mở" className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
        {query.isLoading ? <Spinner label="Đang tải voucher..." /> : query.isError ? <LoadErrorState title="Chưa thể tải voucher" onRetry={query.refetch} /> : vouchers.map((voucher) => (
          <article key={voucher.id} className="border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-sm tracking-wide">{voucher.code}</p><h2 className="mt-2 font-display text-2xl font-normal">{benefit(voucher)}</h2></div><Ticket size={22} aria-hidden="true" /></div>
            <dl className="mt-5 space-y-2 text-sm text-muted-foreground"><div><dt className="inline">Đơn tối thiểu: </dt><dd className="inline text-foreground">{formatPrice(voucher.min_order_value)}</dd></div><div><dt className="inline">Kết hợp giá sale: </dt><dd className="inline text-foreground">{voucher.stack_with_sale ? 'Có' : 'Không'}</dd></div>{voucher.expires_at && <div><dt className="inline">Dùng đến: </dt><dd className="inline text-foreground">{formatDate(voucher.expires_at)}</dd></div>}</dl>
            <div className="mt-6">{!token ? <Link to="/login" className="text-sm font-medium underline underline-offset-4">Đăng nhập để lưu</Link> : isStaff(user) ? <p className="text-sm text-muted-foreground">Tài khoản nhân viên không nhận voucher mua hàng.</p> : voucher.claim_required ? <Button onClick={() => collect(voucher)} disabled={claim.isPending}>Lưu vào ví</Button> : <p className="text-sm text-muted-foreground">Mã có thể nhập trực tiếp tại giỏ hàng.</p>}</div>
          </article>
        ))}
      </section>
      {!query.isLoading && vouchers.length === 0 && <p className="mx-auto mt-10 max-w-5xl text-muted-foreground">Hiện chưa có voucher công khai đang mở.</p>}
    </main>
  )
}
