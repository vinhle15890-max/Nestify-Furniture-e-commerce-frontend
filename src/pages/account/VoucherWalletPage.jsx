import { Link } from 'react-router-dom'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { formatDate, formatPrice } from '../../lib/format'
import { useVoucherWallet } from '../../features/promotions/hooks'

export function VoucherWalletPage() {
  const query = useVoucherWallet()
  const claims = query.data?.data ?? []
  return <main className="min-h-screen bg-canvas px-6 py-16 text-ink lg:px-10"><div className="mx-auto max-w-4xl"><h1 className="font-display text-4xl font-normal">Ví voucher</h1><p className="mt-3 text-muted-foreground">Những mã bạn đã lưu. Voucher phù hợp với giỏ sẽ xuất hiện khi thanh toán.</p><div className="mt-8 border-t border-border">{query.isLoading ? <Spinner label="Đang tải ví voucher..." /> : query.isError ? <LoadErrorState title="Chưa thể tải ví voucher" onRetry={query.refetch} /> : claims.map(({ voucher, claimed_at }) => <article key={voucher.id} className="grid gap-3 border-b border-border py-5 sm:grid-cols-[1fr_auto]"><div><h2 className="font-mono font-medium">{voucher.code}</h2><p className="mt-1 text-sm text-muted-foreground">{voucher.type === 'percentage' ? `Giảm ${Number(voucher.value)}%` : `Giảm ${formatPrice(voucher.value)}`} · Đã lưu {formatDate(claimed_at)}</p></div><p className="text-sm text-muted-foreground">{voucher.expires_at ? `Hết hạn ${formatDate(voucher.expires_at)}` : 'Không giới hạn ngày'}</p></article>)}</div>{!query.isLoading && claims.length === 0 && <p className="mt-8 text-muted-foreground">Ví đang trống. <Link to="/vouchers" className="text-foreground underline underline-offset-4">Xem voucher đang mở</Link></p>}</div></main>
}
