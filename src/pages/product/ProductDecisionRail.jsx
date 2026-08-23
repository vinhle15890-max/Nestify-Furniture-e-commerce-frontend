import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/Button'
import { formatPrice, numericClassName } from '../../lib/format'
import { ProductOptions } from './ProductOptions'
import { ProductEvidencePanel } from './ProductEvidencePanel'

export function ProductDecisionRail({ product, variants, variantOptions, selectedOptions, onSelectOption, selectedVariant, onSelectVariant, visibleMedia, outOfStock, price, quantity, onQuantityChange, maxQuantity, token, staff, onAddToCart, adding, isWishlisted, onToggleWishlist, wishlistPending, stockError, deliveryFact, returnsFact }) {
  const hasOptions = variantOptions.length > 0
  return (
    <aside aria-label="Lựa chọn sản phẩm" className="space-y-6 lg:sticky lg:top-28">
      <div>
        {hasOptions ? <ProductOptions options={variantOptions} variants={variants} selected={selectedOptions} onSelect={onSelectOption} /> : variants.length > 0 && <div><p className="text-sm font-medium text-ink/60">Phiên bản</p><div className="mt-3 flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.id} type="button" onClick={() => onSelectVariant(variant.id)} aria-pressed={variant.id === selectedVariant?.id} className={`rounded-control border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${variant.id === selectedVariant?.id ? 'border-ink bg-ink text-canvas' : 'border-unbuilt text-ink'}`}>{variant.name}</button>)}</div></div>}
        {!selectedVariant && <p className="mt-3 text-sm text-ink/65">Vui lòng chọn đầy đủ thuộc tính.</p>}
        {selectedVariant && <p className="mt-3 text-sm leading-6 text-ink/65">{visibleMedia.some((item) => item.variant_id === selectedVariant.id) ? 'Bộ ảnh có hình được gắn đúng với phiên bản này.' : 'Bộ ảnh hiện là ảnh dùng chung, chưa xác nhận riêng cho phiên bản này.'}</p>}
      </div>

      <ProductEvidencePanel product={product} selectedVariant={selectedVariant} outOfStock={outOfStock} />

      <section data-testid="transaction-runway" aria-labelledby="transaction-runway-title" className="border-t-2 border-ink/15 pt-6">
        <h2 id="transaction-runway-title" className="sr-only">Mua sản phẩm</h2>
        <div className="flex flex-wrap items-baseline gap-3">
          <p className={`text-2xl font-medium text-ink ${numericClassName}`}>{formatPrice(price)}</p>
          {selectedVariant?.is_on_sale && <p className={`text-sm text-muted-foreground line-through ${numericClassName}`}>{formatPrice(selectedVariant.regular_price)}</p>}
        </div>
        {selectedVariant?.is_on_sale && <p className="mt-1 text-sm text-muted-foreground">Giá ưu đãi đang được hệ thống áp dụng.</p>}
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/60">Số lượng<input type="number" min={1} max={maxQuantity} value={quantity} disabled={outOfStock} onChange={(event) => onQuantityChange(Number(event.target.value))} className={`w-20 rounded-control border border-unbuilt bg-canvas px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${numericClassName}`} /></label>
          {token && staff ? <p className="text-sm leading-6 text-ink/65">Tài khoản quản trị không thể mua hàng.</p> : token ? <><Button onClick={onAddToCart} disabled={!selectedVariant || outOfStock || adding} className="px-6 py-3">Thêm vào giỏ</Button><Button type="button" variant="secondary" aria-label={isWishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'} aria-pressed={isWishlisted} onClick={onToggleWishlist} disabled={!selectedVariant || wishlistPending} className="px-4 py-3"><Heart size={18} className={isWishlisted ? 'fill-current text-accent' : ''} /></Button></> : <Link to="/login" className="inline-flex items-center rounded-control bg-ink px-6 py-3 text-sm font-medium text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Đăng nhập để mua hàng</Link>}
        </div>
        {stockError !== null && <p role="alert" className="mt-3 text-sm text-destructive">Kho chỉ đủ {stockError} sản phẩm cho lựa chọn này</p>}
        <dl className="mt-5 grid gap-4 border-t border-unbuilt/70 pt-5"><div><dt className="text-sm font-medium text-ink">Giao hàng</dt><dd className="mt-1 text-sm leading-6 text-ink/65">{deliveryFact ?? 'Chưa có thời gian giao hàng. Liên hệ Nestify trước khi đặt.'}</dd></div><div><dt className="text-sm font-medium text-ink">Đổi trả và hủy đơn</dt><dd className="mt-1 text-sm leading-6 text-ink/65">{returnsFact ?? 'Chính sách cho sản phẩm này chưa được cung cấp.'}</dd></div></dl>
      </section>
    </aside>
  )
}
