import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Store, Menu, X, ChevronsUpDown, LogOut, Eye } from 'lucide-react'
import { useLogout, useMe } from '../../features/auth/hooks'
import { useAuthStore } from '../../store/authStore'
import { usePreviewStore, useEffectiveUser } from '../../store/previewStore'
import { navGroups, visibleGroups } from './adminNav'

const allItems = navGroups.flatMap((group) => group.items)

function activeTitle(pathname) {
  const match = allItems
    .filter((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.label ?? 'Quản trị'
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'A'
  return (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

const navLinkClass = ({ isActive }) =>
  `group flex items-center gap-3 rounded-r-control border-l-2 px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
    isActive
      ? 'border-accent bg-surface-alt font-medium text-foreground'
      : 'border-transparent text-muted-foreground hover:bg-surface-alt/60 hover:text-foreground'
  }`

function SidebarNav({ groups, onNavigate }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((group, index) => (
        <div key={group.title ?? index} className={index === 0 ? '' : 'mt-6'}>
          {group.title && (
            <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
              {group.title}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        className={isActive ? 'text-accent' : 'text-muted-foreground transition-colors group-hover:text-foreground'}
                        aria-hidden="true"
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <Link
      to="/admin"
      className="flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-control bg-foreground font-display text-lg text-surface">N</span>
      <span>
        <span className="block font-display text-lg leading-none text-foreground">Nestify</span>
        <span className="block text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Admin</span>
      </span>
    </Link>
  )
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      {open && <button className="fixed inset-0 z-10 cursor-default" aria-hidden="true" onClick={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative z-20 flex w-full items-center gap-3 rounded-control p-2 text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
          {initials(user?.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{user?.name ?? 'Quản trị viên'}</span>
          <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-full rounded-card border border-border bg-surface p-1.5 shadow-card">
          <Link
            to="/"
            role="menuitem"
            className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
          >
            <Store size={16} /> Về cửa hàng
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-alt hover:text-destructive"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

function PreviewBanner({ role, onExit }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent/10 px-4 py-2 text-sm text-foreground lg:px-8">
      <span className="flex items-center gap-2">
        <Eye size={16} className="shrink-0 text-accent" aria-hidden="true" />
        Đang xem thử giao diện như vai trò <strong className="font-medium">{role.display_name}</strong> — quyền thao tác
        thật vẫn theo tài khoản của bạn.
      </span>
      <button
        type="button"
        onClick={onExit}
        className="flex shrink-0 items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-alt"
      >
        <X size={14} aria-hidden="true" /> Thoát xem thử
      </button>
    </div>
  )
}

export function AdminLayout() {
  const logout = useLogout()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const effectiveUser = useEffectiveUser()
  const previewRole = usePreviewStore((state) => state.previewRole)
  const clearPreview = usePreviewStore((state) => state.clearPreview)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const title = activeTitle(pathname)
  const handleLogout = () => logout.mutate()
  const groups = visibleGroups(effectiveUser)

  function handleExitPreview() {
    clearPreview()
    navigate('/admin')
  }

  // Legacy persisted sessions may predate `user.permissions`. Sync `/auth/me`
  // on entering the admin area so the sidebar/route guards reflect current
  // permissions instead of locking the user out with a stale/empty set.
  const { data: meData } = useMe()
  useEffect(() => {
    if (meData?.data) setUser(meData.data)
  }, [meData, setUser])

  // Admin keeps the legacy palette. Becoming is the :root default now, so we
  // opt <body> into `legacy` while an admin route is mounted — admin dialogs
  // portal to <body>, so this single stamp themes the shell AND every admin
  // portal at once, with no per-dialog stamping. The attribute on the shell
  // root below prevents a first-paint flash before this effect runs.
  useEffect(() => {
    document.body.setAttribute('data-theme', 'legacy')
    return () => document.body.removeAttribute('data-theme')
  }, [])

  return (
    <div data-theme="legacy" className="flex min-h-dvh bg-background">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <SidebarNav groups={groups} />
        <div className="border-t border-border p-3">
          <UserMenu user={user} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile slide-in nav */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface shadow-card lg:hidden">
            <Dialog.Title className="sr-only">Điều hướng quản trị</Dialog.Title>
            <Dialog.Description className="sr-only">Danh sách các mục quản trị.</Dialog.Description>
            <div className="flex items-center justify-between px-5 py-5">
              <Brand />
              <Dialog.Close aria-label="Đóng" className="rounded-control p-1 text-muted-foreground transition-colors hover:text-foreground">
                <X size={20} />
              </Dialog.Close>
            </div>
            <SidebarNav groups={groups} onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-border p-3">
              <UserMenu user={user} onLogout={handleLogout} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        {previewRole && <PreviewBanner role={previewRole} onExit={handleExitPreview} />}

        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground lg:hidden"
          >
            <Menu size={20} />
          </button>
          <h1 className="truncate font-display text-lg text-foreground">{title}</h1>
          <Link
            to="/"
            className="ml-auto hidden items-center gap-1.5 rounded-control px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground sm:flex"
          >
            <Store size={15} /> Về cửa hàng
          </Link>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
