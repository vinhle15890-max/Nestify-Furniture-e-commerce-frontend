export function PersonalizedGreeting({ name, hasHistory }) {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-6 lg:px-10">
      <div className="max-w-2xl">
        <p className="eyebrow">Dành riêng cho bạn</p>
        <h2 className="mt-3 font-display text-[clamp(1.6rem,2.8vw,2.4rem)] leading-tight text-foreground">
          Chào mừng trở lại, {name}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {hasHistory
            ? 'Tiếp tục khám phá những món bạn đang quan tâm.'
            : 'Bắt đầu khám phá bộ sưu tập nội thất của chúng tôi.'}
        </p>
      </div>
    </div>
  )
}
