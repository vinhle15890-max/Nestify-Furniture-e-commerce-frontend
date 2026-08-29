import { Ticket } from 'lucide-react'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { formatDate, formatPrice } from '../../lib/format'
import { useVoucherCampaigns } from '../../features/promotions/hooks'

function benefit(voucher) {
  return voucher.type === 'percentage' ? `Giảm ${Number(voucher.value)}%` : `Giảm ${formatPrice(voucher.value)}`
}

export function VoucherCampaignsPage() {
  const query = useVoucherCampaigns()
  const vouchers = query.data?.data ?? []

  return (
    <main className="min-h-screen bg-canvas px-6 py-16 text-ink md:py-24 lg:px-10">
      <header className="mx-auto max-w-5xl border-b border-border pb-10">
        <p className="text-sm text-muted-foreground">Ưu đãi có điều kiện rõ ràng</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,5rem)] font-normal leading-none">Voucher đang mở</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">Ưu đãi chung sẽ tự xuất hiện trong giỏ hàng khi đơn đáp ứng điều kiện. Voucher được tặng riêng nằm trong ví của người nhận.</p>
      </header>
      <section aria-label="Voucher đang mở" className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
        {query.isLoading ? <Spinner label="Đang tải voucher..." /> : query.isError ? <LoadErrorState title="Chưa thể tải voucher" onRetry={query.refetch} /> : vouchers.map((voucher) => (
          <article key={voucher.id} className="border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-sm tracking-wide">{voucher.code}</p><h2 className="mt-2 font-display text-2xl font-normal">{benefit(voucher)}</h2></div><Ticket size={22} aria-hidden="true" /></div>
            <dl className="mt-5 space-y-2 text-sm text-muted-foreground"><div><dt className="inline">Đơn tối thiểu: </dt><dd className="inline text-foreground">{formatPrice(voucher.min_order_value)}</dd></div><div><dt className="inline">Kết hợp giá sale: </dt><dd className="inline text-foreground">{voucher.stack_with_sale ? 'Có' : 'Không'}</dd></div>{voucher.expires_at && <div><dt className="inline">Dùng đến: </dt><dd className="inline text-foreground">{formatDate(voucher.expires_at)}</dd></div>}</dl>
            <p className="mt-6 text-sm text-muted-foreground">Mã sẽ được đề xuất tại giỏ hàng nếu phù hợp.</p>
          </article>
        ))}
      </section>
      {!query.isLoading && vouchers.length === 0 && <p className="mx-auto mt-10 max-w-5xl text-muted-foreground">Hiện chưa có voucher công khai đang mở.</p>}
    </main>
  )
}
