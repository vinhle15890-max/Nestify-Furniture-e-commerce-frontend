import {
  LayoutDashboard,
  FolderTree,
  Package,
  Images,
  Receipt,
  Ticket,
  Star,
  ShieldCheck,
  Users2,
  ScrollText,
  Sparkles,
  KeyRound,
  Layers3,
  RotateCcw,
} from 'lucide-react'
import { can, canAny } from '../../lib/roles'

// Single source of truth for admin navigation + its permission gate. AdminLayout
// (sidebar), AdminHome (index redirect) and PermissionDenied (helpful links) all
// read from here so the nav→permission map lives in exactly one place.
export const navGroups = [
  { items: [{ to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true, permission: 'view_dashboard' }] },
  {
    title: 'Danh mục',
    items: [
      { to: '/admin/categories', label: 'Danh mục', icon: FolderTree, permission: 'manage_categories' },
      { to: '/admin/products', label: 'Sản phẩm', icon: Package, end: true, permission: 'manage_products' },
      { to: '/admin/collections', label: 'Bộ sưu tập', icon: Layers3, permission: 'manage_products' },
      { to: '/admin/products/seo', label: 'Duyệt SEO', icon: Sparkles, permission: 'manage_products' },
      { to: '/admin/media', label: 'Thư viện ảnh', icon: Images, permission: 'manage_products' },
    ],
  },
  {
    title: 'Bán hàng',
    items: [
      { to: '/admin/orders', label: 'Đơn hàng', icon: Receipt, permission: 'manage_orders' },
      { to: '/admin/returns', label: 'Đổi trả', icon: RotateCcw, permission: 'manage_orders' },
      { to: '/admin/vouchers', label: 'Voucher', icon: Ticket, permission: 'manage_vouchers' },
    ],
  },
  { title: 'Cộng đồng', items: [{ to: '/admin/reviews', label: 'Đánh giá', icon: Star, permission: 'moderate_reviews' }] },
  {
    title: 'Nhân sự',
    items: [
      { to: '/admin/employees', label: 'Nhân viên', icon: ShieldCheck, permission: 'manage_users' },
      { to: '/admin/customers', label: 'Khách hàng', icon: Users2, permission: 'manage_users' },
      { to: '/admin/roles', label: 'Vai trò', icon: KeyRound, permission: 'manage_users' },
    ],
  },
  { title: 'Hệ thống', items: [{ to: '/admin/audit-logs', label: 'Nhật ký', icon: ScrollText, permission: 'view_audit' }] },
]

// Vietnamese labels for permission slugs — used by PermissionDenied and reused by
// later RBAC sub-projects (role matrix, audit).
export const PERMISSION_LABELS = {
  manage_categories: 'Quản lý danh mục',
  manage_products: 'Quản lý sản phẩm',
  manage_orders: 'Quản lý đơn hàng',
  manage_vouchers: 'Quản lý voucher',
  manage_users: 'Quản lý người dùng',
  moderate_reviews: 'Kiểm duyệt đánh giá',
  view_audit: 'Xem nhật ký',
  view_health: 'Xem tình trạng hệ thống',
  view_dashboard: 'Xem tổng quan',
  refund: 'Hoàn tiền',
}

function itemAllowed(item, user) {
  if (item.anyOf) return canAny(user, item.anyOf)
  if (item.permission) return can(user, item.permission)
  return true // item không khai báo quyền ⇒ luôn hiện
}

export function visibleGroups(user) {
  return navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => itemAllowed(item, user)) }))
    .filter((group) => group.items.length > 0)
}

export function firstAllowedPath(user) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (itemAllowed(item, user)) return item.to
    }
  }
  return null
}
