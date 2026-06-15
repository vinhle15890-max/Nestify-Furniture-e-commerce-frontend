import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { useLogout, useMe } from '../../features/auth/hooks'
import { useAuthStore } from '../../store/authStore'

export function AccountPage() {
  const storedUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const { data, isLoading } = useMe()
  const logout = useLogout()

  useEffect(() => {
    if (data?.data) setUser(data.data)
  }, [data, setUser])

  const user = data?.data ?? storedUser

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Tài khoản</h1>

      <Card className="mt-6">
        {isLoading && !user ? (
          <Spinner label="Đang tải thông tin tài khoản..." />
        ) : user ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Họ tên</p>
              <p className="text-base text-foreground">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-base text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Xác thực email</p>
              <Badge tone={user.email_verified_at ? 'in-stock' : 'out-of-stock'}>
                {user.email_verified_at ? 'Đã xác thực' : 'Chưa xác thực'}
              </Badge>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        <Link to="/account/addresses" className="text-primary hover:text-primary-hover">
          Sổ địa chỉ
        </Link>
        <Link to="/forgot-password" className="text-primary hover:text-primary-hover">
          Đổi mật khẩu
        </Link>
        <Button variant="secondary" onClick={() => logout.mutate()}>
          Đăng xuất
        </Button>
      </div>
    </div>
  )
}
