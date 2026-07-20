function PulseBlock({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse bg-unbuilt/35 motion-reduce:animate-none ${className}`} />
}

export function CatalogSkeleton() {
  return (
    <section role="status" aria-label="Đang tải sản phẩm" className="mt-5 grid grid-cols-2 gap-x-2 gap-y-9 sm:mt-6 sm:gap-x-3 sm:gap-y-12 md:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="min-w-0">
          <PulseBlock className="aspect-[4/5] w-full" />
          <PulseBlock className="mt-4 h-4 w-3/4 rounded-control" />
          <PulseBlock className="mt-2 h-4 w-1/2 rounded-control" />
          <PulseBlock className="mt-3 h-3 w-2/3 rounded-control" />
        </div>
      ))}
      <span className="sr-only">Đang tải sản phẩm</span>
    </section>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Đang tải sản phẩm" className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:px-10">
      <PulseBlock className="h-4 w-48 rounded-control" />
      <PulseBlock className="mt-7 h-12 w-3/5 rounded-control" />
      <PulseBlock className="mt-5 h-10 w-80 max-w-full rounded-control" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,0.9fr)]">
        <PulseBlock className="aspect-[5/4] w-full sm:h-[22rem] sm:aspect-auto lg:h-auto lg:aspect-[4/3]" />
        <div className="space-y-4 border-t-2 border-unbuilt pt-7 lg:border-l-2 lg:border-t-0 lg:pl-9">
          <PulseBlock className="h-5 w-32 rounded-control" />
          <PulseBlock className="h-9 w-3/4 rounded-control" />
          <PulseBlock className="h-20 w-full rounded-control" />
          <PulseBlock className="h-20 w-full rounded-control" />
        </div>
      </div>
      <span className="sr-only">Đang tải sản phẩm</span>
    </div>
  )
}

export function AccountSkeleton() {
  return (
    <div role="status" aria-label="Đang tải tài khoản" className="space-y-8">
      <div><PulseBlock className="h-10 w-64 max-w-full rounded-control" /><PulseBlock className="mt-3 h-4 w-52 rounded-control" /></div>
      <div className="grid gap-5 md:grid-cols-[1.25fr_0.75fr]">
        <PulseBlock className="h-48 w-full" /><PulseBlock className="h-48 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><PulseBlock className="h-16 rounded-card" /><PulseBlock className="h-16 rounded-card" /></div>
      <span className="sr-only">Đang tải tài khoản</span>
    </div>
  )
}

export function PlannerGeometryPlaceholder() {
  return (
    <div role="status" aria-label="Đang chuẩn bị mặt bằng phòng" className="relative flex h-dvh overflow-hidden bg-[#e9e5dd] p-5 md:p-8">
      <div className="relative m-auto aspect-[4/3] w-full max-w-4xl border-4 border-ink/30 bg-canvas shadow-[inset_0_0_0_1px_rgba(42,39,35,0.08)]">
        <div aria-hidden="true" className="absolute left-[14%] top-[18%] h-[24%] w-[34%] animate-pulse border-2 border-ink/20 bg-unbuilt/35 motion-reduce:animate-none" />
        <div aria-hidden="true" className="absolute bottom-[15%] right-[12%] h-[18%] w-[22%] animate-pulse rounded-full border-2 border-ink/20 bg-unbuilt/35 motion-reduce:animate-none" />
        <div aria-hidden="true" className="absolute bottom-0 left-[46%] h-1/4 w-16 border-x-2 border-ink/20 bg-[#e9e5dd]" />
      </div>
      <p className="absolute inset-x-0 bottom-8 text-center text-sm font-medium text-ink/65">Đang chuẩn bị mặt bằng phòng…</p>
    </div>
  )
}
