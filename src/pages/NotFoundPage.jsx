import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="font-display text-3xl text-foreground">Không tìm thấy trang</h1>
      <p className="mt-2 text-muted-foreground">Trang bạn tìm không tồn tại.</p>
      <Link to="/" className="mt-4 inline-block text-primary">
        Về trang chủ
      </Link>
    </div>
  )
}
