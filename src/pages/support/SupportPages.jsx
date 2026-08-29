import { useEffect } from 'react'
import { ArrowRight, Mail, PackageCheck, RotateCcw, ShieldCheck } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

/* Hallmark · pre-emit critique: P5 H4 E4 S5 R5 V4 */
const supportNavigation = [
  { label: 'Giao hàng', to: '/shipping' },
  { label: 'Hủy đơn và hỗ trợ sau bán', to: '/returns' },
  { label: 'Quyền riêng tư', to: '/privacy' },
  { label: 'Liên hệ', to: '/contact' },
]

const pages = {
  shipping: {
    eyebrow: 'Hỗ trợ đơn hàng',
    title: 'Giao hàng, rõ từ trước khi đặt',
    intro:
      'Thời gian, phạm vi và điều kiện giao phụ thuộc vào từng sản phẩm. Nestify chỉ hiển thị thông tin đã được người quản trị xác nhận, để bạn không phải quyết định dựa trên một con số ước đoán.',
    icon: PackageCheck,
    calloutTitle: 'Kiểm tra ở đâu?',
    callout:
      'Xem mục “Giao hàng” trên trang chi tiết sản phẩm. Nếu mục này chưa có thông tin, hãy liên hệ Nestify trước khi đặt.',
    sections: [
      {
        title: 'Trước khi đặt hàng',
        body:
          'Thông tin giao hàng riêng của từng sản phẩm được đặt cạnh khu vực lựa chọn mua. Với sản phẩm chưa có dữ liệu được xác nhận, Nestify giữ trạng thái “chưa được cung cấp” thay vì tự ước tính.',
      },
      {
        title: 'Khi thanh toán',
        body:
          'Bạn chọn địa chỉ nhận hàng và phương thức thanh toán tại Checkout. Phiên bản hiện tại chưa hiển thị phí giao hàng riêng; tổng tiền hiển thị gồm tiền sản phẩm và phần giảm giá dự kiến.',
      },
      {
        title: 'Sau khi đặt',
        body:
          'Bạn có thể theo dõi trạng thái trong “Đơn hàng của tôi”. Địa chỉ nhận hàng được lưu theo đơn tại thời điểm đặt để những thay đổi sau đó không làm sai thông tin giao của đơn cũ.',
      },
    ],
    action: { label: 'Xem đơn hàng của tôi', to: '/orders' },
  },
  returns: {
    eyebrow: 'Hỗ trợ đơn hàng',
    title: 'Hủy đơn và hỗ trợ sau bán',
    intro:
      'Bạn có thể tự hủy đơn khi hệ thống còn cho phép. Sau khi nhận hàng, Nestify trao đổi trực tiếp để hiểu tình trạng thực tế trước khi thống nhất phương án hỗ trợ.',
    icon: RotateCcw,
    calloutTitle: 'Cần hỗ trợ sau khi nhận hàng?',
    callout:
      'Gọi 0945691309 và cung cấp mã đơn hàng. Nhân viên sẽ kiểm tra cùng bạn trước khi hướng dẫn gửi sản phẩm hoặc thực hiện bước tiếp theo.',
    sections: [
      {
        title: 'Hủy đơn chưa giao',
        body:
          'Mở “Đơn hàng của tôi”, chọn đơn cần xử lý và dùng thao tác hủy nếu trạng thái hiện tại cho phép. Hệ thống không cho tự hủy đơn đã chuyển sang đang giao, đã giao hoặc đã hủy.',
      },
      {
        title: 'Khoản tiền đã thanh toán',
        body:
          'Với đơn đã thanh toán, yêu cầu hủy được ghi nhận để Nestify xử lý hoàn tiền. Việc chuyển tiền hoàn không diễn ra tự động trong PayOS, vì vậy trạng thái xử lý cần được đối chiếu bởi quản trị viên.',
      },
      {
        title: 'Trao đổi trực tiếp sau khi nhận',
        body:
          'Nestify không tiếp nhận yêu cầu đổi trả tự động trên website. Hãy gọi 0945691309, chuẩn bị mã đơn và mô tả tình trạng sản phẩm; nhân viên sẽ thống nhất phương án trước khi bạn gửi hàng ngược lại.',
      },
    ],
    action: { label: 'Gọi 0945691309', href: 'tel:0945691309' },
  },
  privacy: {
    eyebrow: 'Thông tin của bạn',
    title: 'Quyền riêng tư của bạn',
    intro:
      'Nestify dùng thông tin bạn cung cấp để vận hành tài khoản, đơn hàng và những căn phòng bạn chọn lưu. Chúng tôi trình bày theo từng mục để bạn biết dữ liệu xuất hiện ở đâu.',
    icon: ShieldCheck,
    calloutTitle: 'Nguyên tắc sử dụng',
    callout:
      'Thông tin được dùng cho chức năng bạn chủ động sử dụng — không phải để suy đoán kích thước, vật liệu hay quyết định thay bạn.',
    sections: [
      {
        title: 'Thông tin được ghi nhận',
        body:
          'Tùy thao tác, hệ thống có thể ghi nhận thông tin tài khoản, địa chỉ giao hàng, giỏ hàng, đơn hàng, sản phẩm yêu thích, đánh giá, nội dung trò chuyện và dữ liệu phòng đã lưu.',
      },
      {
        title: 'Mục đích xử lý',
        body:
          'Dữ liệu được dùng để đăng nhập, hoàn tất và theo dõi đơn hàng, khôi phục lựa chọn của bạn, hỗ trợ khách hàng, kiểm soát quyền truy cập và duy trì lịch sử cần thiết cho vận hành.',
      },
      {
        title: 'Kiểm soát của bạn',
        body:
          'Bạn có thể cập nhật thông tin tài khoản và địa chỉ trong khu vực tài khoản. Với yêu cầu xem xét, chỉnh sửa hoặc xóa dữ liệu ngoài các thao tác có sẵn, hãy liên hệ từ email gắn với tài khoản để Nestify có thể xác minh.',
      },
      {
        title: 'Thanh toán và bên cung cấp dịch vụ',
        body:
          'Khi chọn thanh toán trực tuyến, quá trình thanh toán được chuyển qua PayOS. Nestify lưu trạng thái và thông tin giao dịch cần cho đơn hàng; thông tin bạn nhập trên trang thanh toán còn chịu sự xử lý của nhà cung cấp đó.',
      },
    ],
    action: { label: 'Gửi yêu cầu về dữ liệu', href: 'mailto:support@nestify.vn?subject=Y%C3%AAu%20c%E1%BA%A7u%20v%E1%BB%81%20d%E1%BB%AF%20li%E1%BB%87u%20c%C3%A1%20nh%C3%A2n' },
  },
  contact: {
    eyebrow: 'Khi bạn cần một người thật',
    title: 'Liên hệ Nestify',
    intro:
      'Gửi đúng thông tin ngay từ đầu giúp Nestify hiểu căn phòng, sản phẩm hoặc đơn hàng bạn đang nói tới — và tránh yêu cầu bạn kể lại từ đầu.',
    icon: Mail,
    calloutTitle: 'Kênh hỗ trợ hiện có',
    callout:
      'Gọi 0945691309 để trao đổi trực tiếp về đơn hàng và hỗ trợ sau bán. Email support@nestify.vn dành cho nội dung cần gửi kèm hình ảnh hoặc tài liệu.',
    sections: [
      {
        title: 'Về đơn hàng',
        body:
          'Hãy gửi kèm mã đơn hàng, email đặt hàng và nội dung bạn cần hỗ trợ. Không gửi mật khẩu, mã xác thực hoặc thông tin thẻ thanh toán qua email.',
      },
      {
        title: 'Về sản phẩm hoặc phòng',
        body:
          'Gửi tên hoặc đường dẫn sản phẩm; nếu đang thử nội thất trong phòng, hãy mô tả căn phòng hoặc tên phòng đã lưu. Ảnh chụp màn hình có thể giúp làm rõ vị trí đang gặp vấn đề.',
      },
      {
        title: 'Về quyền riêng tư',
        body:
          'Gửi yêu cầu từ email gắn với tài khoản và nêu rõ dữ liệu hoặc thao tác bạn muốn được xem xét. Nestify có thể cần xác minh chủ tài khoản trước khi xử lý.',
      },
    ],
    action: { label: 'Gửi email cho Nestify', href: 'mailto:support@nestify.vn' },
  },
}

function SupportAction({ action }) {
  const className =
    'group inline-flex items-center gap-2 whitespace-nowrap rounded-control bg-ink px-5 py-3 text-sm font-medium text-canvas transition-colors duration-200 ease-out hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
  const content = (
    <>
      {action.label}
      <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
    </>
  )

  return action.to ? (
    <Link to={action.to} className={className}>{content}</Link>
  ) : (
    <a href={action.href} className={className}>{content}</a>
  )
}

function SupportPage({ pageKey }) {
  const page = pages[pageKey]
  const Icon = page.icon

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${page.title} | Nestify`
    return () => {
      document.title = previousTitle
    }
  }, [page.title])

  return (
    <div className="bg-canvas text-ink">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 md:pt-24 lg:px-10">
        <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(12rem,0.42fr)_minmax(0,1fr)] lg:gap-20">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-medium text-ink/60">Trung tâm hỗ trợ</p>
            <nav aria-label="Các trang hỗ trợ" className="mt-5">
              <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                {supportNavigation.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `block whitespace-nowrap border-l-2 px-4 py-2.5 text-sm transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isActive
                            ? 'border-ink font-medium text-ink'
                            : 'border-unbuilt text-ink/60 hover:border-emerging hover:text-ink'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0">
            <header className="max-w-3xl border-b border-unbuilt pb-10">
              <div className="flex size-11 items-center justify-center rounded-full border border-unbuilt text-ink">
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <p className="mt-8 text-sm font-medium text-ink/60">{page.eyebrow}</p>
              <h1 className="mt-3 min-w-0 [overflow-wrap:anywhere] font-display text-[clamp(2.25rem,5vw,4.25rem)] font-normal leading-[1.02] tracking-[-0.025em] text-ink">
                {page.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/70">{page.intro}</p>
            </header>

            <section className="grid gap-8 border-b border-unbuilt py-10 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
              <h2 className="font-display text-2xl font-normal text-ink">{page.calloutTitle}</h2>
              <p className="text-base leading-7 text-ink/75">{page.callout}</p>
            </section>

            <div className="divide-y divide-unbuilt">
              {page.sections.map((section) => (
                <section key={section.title} className="grid gap-4 py-9 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] md:gap-8">
                  <h2 className="font-display text-xl font-normal leading-snug text-ink">{section.title}</h2>
                  <p className="text-base leading-7 text-ink/70">{section.body}</p>
                </section>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-ink pt-8">
              <SupportAction action={page.action} />
              {pageKey !== 'contact' && (
                <Link
                  to="/contact"
                  className="whitespace-nowrap text-sm font-medium text-ink underline decoration-unbuilt underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Vẫn cần hỗ trợ?
                </Link>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}

export function ShippingPage() {
  return <SupportPage pageKey="shipping" />
}

export function ReturnsPage() {
  return <SupportPage pageKey="returns" />
}

export function PrivacyPage() {
  return <SupportPage pageKey="privacy" />
}

export function ContactPage() {
  return <SupportPage pageKey="contact" />
}
