import { Link } from 'react-router-dom'
import { Logo } from '../Logo'
import { SeoHead } from '../SeoHead'

const plannerImages = {
  experiment: {
    src: '/images/home/room-planner-experiment.png',
    alt: 'Mẫu giường được đặt thử theo đúng tỷ lệ trong Room Planner Nestify',
  },
  futureHome: {
    src: '/images/home/room-planner-future-home.png',
    alt: 'Phòng ngủ hoàn chỉnh đã được bố trí trong Room Planner Nestify',
  },
}

const calibrations = {
  login: {
    grid: 'lg:grid-cols-[minmax(0,1.08fr)_minmax(26rem,0.92fr)]',
    formWidth: 'max-w-[28rem]',
    statement: 'Quay lại nơi bạn đã dừng.',
    supporting: 'Những căn phòng, lựa chọn và bản nháp bạn đang giữ vẫn ở đúng vị trí.',
    mobile: 'Tiếp tục mà không phải bắt đầu lại.',
    art: plannerImages.futureHome,
    artWidth: 'max-w-[34rem]',
  },
  register: {
    grid: 'lg:grid-cols-[minmax(20rem,0.8fr)_minmax(32rem,1.2fr)]',
    formWidth: 'max-w-[34rem]',
    statement: 'Một nơi để giữ điều còn đang hình thành.',
    supporting: 'Tạo tài khoản để lưu phòng, giữ lựa chọn và trở lại khi bạn đã nhìn rõ hơn.',
    mobile: 'Giữ lại điều bạn đang cân nhắc.',
    art: plannerImages.experiment,
    artWidth: 'max-w-[28rem]',
  },
  recovery: {
    grid: 'lg:grid-cols-[minmax(18rem,0.62fr)_minmax(28rem,1.38fr)]',
    formWidth: 'max-w-[30rem]',
    statement: 'Lấy lại lối vào, không làm lại từ đầu.',
    supporting: 'Đặt lại mật khẩu không làm thay đổi những gì bạn đã lưu trong Nestify.',
    mobile: 'Những gì bạn đã lưu vẫn được giữ nguyên.',
    art: null,
    artWidth: '',
  },
}

/** Shared auth canvas with page-specific hierarchy, using the locked Nestify DNA. */
export function AuthLayout({ title, subtitle, children, footer, variant = 'legacy' }) {
  if (variant === 'legacy') {
    return (
      <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
        <SeoHead title={`${title} | Nestify`} description={subtitle || 'Tài khoản Nestify.'} noindex />
        <aside className="hidden border-r border-unbuilt bg-unbuilt/10 lg:flex lg:flex-col lg:justify-end lg:px-12 lg:pb-20 lg:pt-28">
          <div className="ml-auto w-full max-w-sm">
            <p className="font-display text-[clamp(1.7rem,2.3vw,2.35rem)] leading-tight text-foreground [text-wrap:balance]">
              Giữ lại những gì bạn đang cân nhắc.
            </p>
            <p className="mt-4 max-w-sm text-muted-foreground">
              Lưu phòng và quay lại đúng nơi bạn đã dừng, khi bạn sẵn sàng.
            </p>
            <div className="pointer-events-none mt-10 w-full max-w-[440px]">
              <img
                src={plannerImages.futureHome.src}
                alt={plannerImages.futureHome.alt}
                className="aspect-[4/3] w-full rounded-card border border-border object-cover object-top"
              />
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col justify-center px-5 py-14 sm:px-8 md:py-24 lg:min-h-full lg:items-start lg:pl-[clamp(4rem,10vw,10rem)]">
          <div className="flex w-full max-w-[26rem] flex-col">
            <Link to="/" aria-label="Nestify — trang chủ" className="flex self-start rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Logo className="h-12 w-auto" />
            </Link>
            <h1 className="mt-10 font-display text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
            <div className="mt-8 border-t border-unbuilt pt-7">{children}</div>
            {footer && <div className="mt-7 flex flex-col items-start gap-2 text-sm">{footer}</div>}
          </div>
        </div>
      </div>
    )
  }

  const calibration = calibrations[variant] ?? calibrations.login

  return (
    <main
      data-testid="auth-layout"
      data-auth-variant={variant}
      className={`min-h-[calc(100dvh-5rem)] overflow-x-clip bg-canvas text-ink lg:grid ${calibration.grid}`}
    >
      <SeoHead title={`${title} | Nestify`} description={subtitle || 'Tài khoản Nestify.'} noindex />
      <aside className="hidden min-w-0 border-r border-unbuilt bg-unbuilt/10 px-[clamp(2.5rem,5vw,6rem)] pb-12 pt-[clamp(6rem,12vh,9rem)] lg:flex lg:flex-col">
        <div className="ml-auto flex min-h-0 w-full max-w-[36rem] flex-1 flex-col">
          <div>
            <p className="max-w-[18ch] font-display text-[clamp(2rem,3vw,3.75rem)] leading-[1.08] text-foreground [overflow-wrap:anywhere]">
              {calibration.statement}
            </p>
            <p className="mt-5 max-w-[48ch] leading-relaxed text-muted-foreground">
              {calibration.supporting}
            </p>
          </div>
          {calibration.art ? (
            <div className={`pointer-events-none mx-auto mt-[clamp(2.5rem,6vh,4rem)] w-full ${calibration.artWidth}`}>
              <img
                src={calibration.art.src}
                alt={calibration.art.alt}
                className="aspect-[16/10] w-full rounded-card border border-border bg-canvas object-contain"
              />
            </div>
          ) : (
            <div aria-hidden="true" className="mt-auto h-24 w-full border-b border-l border-unbuilt" />
          )}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col px-5 py-10 sm:px-8 sm:py-14 lg:min-h-full lg:px-[clamp(3rem,7vw,8rem)] lg:pb-16 lg:pt-[clamp(4rem,8vh,6rem)]">
        <div className={`flex w-full min-w-0 flex-col ${calibration.formWidth}`}>
          <Link to="/" aria-label="Nestify — trang chủ" className="flex self-start rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo className="h-12 w-auto" />
          </Link>

          <div className="mt-8 border-l-2 border-unbuilt pl-4 lg:hidden">
            <p className="max-w-[32ch] text-sm leading-relaxed text-muted-foreground">{calibration.mobile}</p>
          </div>

          <h1 className="mt-9 min-w-0 font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.08] text-foreground [overflow-wrap:anywhere] lg:mt-12">
            {title}
          </h1>
          {subtitle && <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}

          <div className="mt-7 border-t-2 border-foreground/25 pt-7">{children}</div>

          {footer && <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-unbuilt pt-5 text-sm">{footer}</div>}
        </div>
      </div>
    </main>
  )
}

export const authLink =
  'inline-flex min-h-11 items-center whitespace-nowrap rounded text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent active:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
