# RBAC — Khai thác permission ở admin FE (SP1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FE admin thực sự dùng permission — BE trả mảng `permissions` phẳng ở `/auth/me`, FE ẩn/hiện menu + nút theo quyền, deep-link mục thiếu quyền → trang 403, trang chủ /admin thiếu `view_dashboard` → nhảy mục đầu hợp lệ.

**Architecture:** BE `UserResource` tính union permission của các role user (super_admin ⇒ toàn bộ slug) và eager-load `roles.permissions`. FE thêm helper `can/canAny`, tách cấu hình nav (`adminNav.js`) làm nguồn chân lý cho sidebar + redirect + 403, bọc route bằng `RequirePermission`, và ẩn nút Refund theo `can('refund')`. BE vẫn là lớp enforce chân lý; FE chỉ là lớp UX.

**Tech Stack:** BE Laravel 13 + PostgreSQL (test Docker sqlite). FE React 18 (JSX no-TS), react-router-dom v6, zustand+persist, TanStack Query v5, Tailwind v4 semantic tokens, Vitest + RTL.

## Global Constraints

- **KHÔNG commit** (guardrail): plan này **bỏ mọi bước `git commit`** — mỗi task kết thúc bằng chạy suite xanh, để nguyên working tree uncommitted.
- **User tự chạy migration prod** — SP1 KHÔNG có migration (không đổi schema). Không chạy gì trên prod.
- `cloudinary_id` / `preview_public_id` **không bao giờ serialize** — không đụng, giữ nếp.
- BE là nguồn enforce chân lý; FE gating chỉ là UX, không thay thế BE 403.
- FE: **plain JS (JSX), không TypeScript**; **không thêm dependency mới**; chỉ dùng semantic token (không hex thô); UI admin dưới `[data-theme='legacy']`; copy tiếng Việt.
- BE test chạy trong Docker sqlite; lệnh kèm biến Cloudinary giả để tránh 500 ConfigurationException:
  `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=<Class>`
- FE test: `npm test -- --run <path>`; cuối mỗi FE task chạy `npm run lint` + `npm test -- --run`.
- 10 permission slug (nguồn `RolePermissionSeeder`): `manage_categories, manage_products, manage_orders, manage_vouchers, manage_users, moderate_reviews, view_audit, view_health, view_dashboard, refund`.
- Bảng nav→permission (dùng ở Task 3/5): Tổng quan→`view_dashboard`, Danh mục→`manage_categories`, Sản phẩm & Duyệt SEO→`manage_products`, Thư viện ảnh→`manage_products`, Đơn hàng→`manage_orders`, Voucher→`manage_vouchers`, Đánh giá→`moderate_reviews`, Nhân viên & Khách hàng→`manage_users`, Nhật ký→`view_audit`.

---

## File Structure

- **BE**
  - Modify `Nestify-Furniture-e-commerce-backend/src/app/Http/Resources/UserResource.php` — thêm khóa `permissions`.
  - Modify `Nestify-Furniture-e-commerce-backend/src/app/Http/Controllers/Auth/LoginController.php` — eager-load `roles.permissions` ở `me()` + `store()`.
  - Create `Nestify-Furniture-e-commerce-backend/src/tests/Feature/Auth/UserPermissionsResourceTest.php`.
- **FE** (tất cả dưới `Nestify-Furniture-e-commerce-frontend/`)
  - Modify `src/lib/roles.js` — thêm `can`, `canAny`. Test `src/lib/roles.test.js`.
  - Create `src/pages/admin/adminNav.js` — `navGroups`, `PERMISSION_LABELS`, `visibleGroups`, `firstAllowedPath`. Test `src/pages/admin/adminNav.test.js`.
  - Modify `src/pages/admin/AdminLayout.jsx` — tiêu thụ `visibleGroups`. Test `src/pages/admin/AdminLayout.test.jsx`.
  - Create `src/routes/RequirePermission.jsx` + test `src/routes/RequirePermission.test.jsx`.
  - Create `src/pages/admin/PermissionDenied.jsx` + test `src/pages/admin/PermissionDenied.test.jsx`.
  - Create `src/pages/admin/AdminHome.jsx` + test `src/pages/admin/AdminHome.test.jsx`.
  - Modify `src/app/router.jsx` — index = `<AdminHome/>`, bọc route con bằng `RequirePermission`.
  - Modify `src/pages/admin/orders/AdminOrderDetailPage.jsx` — ẩn Refund theo `can('refund')`. Modify test `src/pages/admin/orders/AdminOrderDetailPage.test.jsx`.

---

## Task 1: BE — `UserResource.permissions` + eager-load

**Files:**
- Modify: `Nestify-Furniture-e-commerce-backend/src/app/Http/Resources/UserResource.php`
- Modify: `Nestify-Furniture-e-commerce-backend/src/app/Http/Controllers/Auth/LoginController.php:28,47`
- Test: `Nestify-Furniture-e-commerce-backend/src/tests/Feature/Auth/UserPermissionsResourceTest.php` (create)

**Interfaces:**
- Produces (hợp đồng FE tiêu thụ): `GET /api/auth/me` và `POST /api/auth/login` trả `data.user.permissions: string[]` (login trả `user.permissions`). Union slug các role; user có role `super_admin` ⇒ **toàn bộ** slug trong bảng `permissions`; customer ⇒ `[]`. Danh sách sort tăng dần cho ổn định.

- [ ] **Step 1: Viết test thất bại**

Create `src/tests/Feature/Auth/UserPermissionsResourceTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserPermissionsResourceTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $roleName, array $permissionSlugs = []): User
    {
        $role = Role::create(['name' => $roleName, 'display_name' => ucfirst($roleName)]);
        foreach ($permissionSlugs as $slug) {
            $permission = Permission::firstOrCreate(['slug' => $slug], ['display_name' => $slug]);
            $role->permissions()->attach($permission->id);
        }
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_me_returns_flat_sorted_permission_slugs(): void
    {
        $user = $this->userWithRole('order_staff', ['view_dashboard', 'manage_orders']);

        $this->actingAs($user)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.permissions', ['manage_orders', 'view_dashboard']);
    }

    public function test_super_admin_receives_every_permission_slug(): void
    {
        Permission::firstOrCreate(['slug' => 'manage_orders'], ['display_name' => 'x']);
        Permission::firstOrCreate(['slug' => 'view_audit'], ['display_name' => 'x']);
        $admin = $this->userWithRole('super_admin'); // không gắn permission nào

        $perms = $this->actingAs($admin)->getJson('/api/auth/me')
            ->assertOk()
            ->json('data.permissions');

        $this->assertContains('manage_orders', $perms);
        $this->assertContains('view_audit', $perms);
    }

    public function test_customer_receives_empty_permissions(): void
    {
        $customer = $this->userWithRole('customer');

        $this->actingAs($customer)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.permissions', []);
    }

    public function test_permissions_do_not_leak_protected_columns(): void
    {
        $user = $this->userWithRole('order_staff', ['manage_orders']);

        $this->actingAs($user)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonMissing(['cloudinary_id'])
            ->assertJsonMissing(['preview_public_id']);
    }
}
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=UserPermissionsResourceTest`
Expected: FAIL — `data.permissions` không tồn tại (assertJsonPath sai).

- [ ] **Step 3: Thêm `permissions` vào `UserResource`**

Sửa `src/app/Http/Resources/UserResource.php` — thêm `use App\Models\Permission;` dưới các `use` sẵn có, và thêm khóa `permissions` vào mảng trả về (đặt ngay sau `role_ids`):

```php
            'permissions'       => $this->whenLoaded('roles', function () {
                // super_admin bypasses every gate (Gate::before) — mirror that by
                // returning ALL permission slugs, not just the pivot union, so the
                // flat list never drifts when a new permission is added without a
                // re-sync of the super_admin role.
                if ($this->roles->contains('name', 'super_admin')) {
                    return Permission::query()->orderBy('slug')->pluck('slug')->all();
                }

                return $this->roles
                    ->flatMap(fn ($role) => $role->relationLoaded('permissions')
                        ? $role->permissions->pluck('slug')
                        : collect())
                    ->unique()
                    ->sort()
                    ->values()
                    ->all();
            }),
```

- [ ] **Step 4: Eager-load `roles.permissions` ở `LoginController`**

Sửa `src/app/Http/Controllers/Auth/LoginController.php`:
- Dòng ~28 (nhánh `store`): đổi `new UserResource($user->load('roles'))` → `new UserResource($user->load('roles.permissions'))`.
- Dòng ~47 (`me`): đổi `new UserResource($request->user()->load('roles'))` → `new UserResource($request->user()->load('roles.permissions'))`.

- [ ] **Step 5: Chạy test — kỳ vọng PASS**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=UserPermissionsResourceTest`
Expected: PASS (4 test).

- [ ] **Step 6: Chạy nhóm auth để chắc không hồi quy**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=LoginTest`
Expected: PASS. (KHÔNG commit — guardrail.)

---

## Task 2: FE — helper `can` / `canAny`

**Files:**
- Modify: `Nestify-Furniture-e-commerce-frontend/src/lib/roles.js`
- Test: `Nestify-Furniture-e-commerce-frontend/src/lib/roles.test.js` (create)

**Interfaces:**
- Consumes: `user.permissions: string[]` (Task 1).
- Produces: `can(user, slug) => boolean`, `canAny(user, slugs) => boolean`. `isStaff` giữ nguyên.

- [ ] **Step 1: Viết test thất bại**

Create `src/lib/roles.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { can, canAny, isStaff } from './roles'

describe('can', () => {
  it('true khi user có slug', () => {
    expect(can({ permissions: ['manage_orders'] }, 'manage_orders')).toBe(true)
  })
  it('false khi user thiếu slug', () => {
    expect(can({ permissions: ['manage_orders'] }, 'refund')).toBe(false)
  })
  it('false khi user null / thiếu permissions', () => {
    expect(can(null, 'refund')).toBe(false)
    expect(can({}, 'refund')).toBe(false)
    expect(can(undefined, 'refund')).toBe(false)
  })
})

describe('canAny', () => {
  it('true khi có ít nhất 1 slug', () => {
    expect(canAny({ permissions: ['manage_products'] }, ['manage_categories', 'manage_products'])).toBe(true)
  })
  it('false khi không có slug nào', () => {
    expect(canAny({ permissions: ['manage_orders'] }, ['manage_categories', 'manage_products'])).toBe(false)
  })
  it('false khi user null', () => {
    expect(canAny(null, ['manage_products'])).toBe(false)
  })
})

describe('isStaff (không hồi quy)', () => {
  it('true cho role ngoài customer', () => {
    expect(isStaff({ roles: ['order_staff'] })).toBe(true)
  })
  it('false cho customer', () => {
    expect(isStaff({ roles: ['customer'] })).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `npm test -- --run src/lib/roles.test.js`
Expected: FAIL — `can`/`canAny` chưa export.

- [ ] **Step 3: Thêm `can` / `canAny` vào `roles.js`**

Thêm vào cuối `src/lib/roles.js`:

```js
// Permission-level checks against the flat `permissions` array the backend adds
// to the user (union of the user's roles' permissions; super_admin gets all).
// FE gating is UX only — the backend still enforces every action with a 403.
export function can(user, slug) {
  const permissions = user?.permissions
  return Array.isArray(permissions) && permissions.includes(slug)
}

export function canAny(user, slugs) {
  return slugs.some((slug) => can(user, slug))
}
```

- [ ] **Step 4: Chạy test — kỳ vọng PASS**

Run: `npm test -- --run src/lib/roles.test.js`
Expected: PASS.

- [ ] **Step 5: Lint (KHÔNG commit)**

Run: `npm run lint`
Expected: sạch.

---

## Task 3: FE — `adminNav.js` + sidebar gating

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/adminNav.js`
- Test: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/adminNav.test.js` (create)
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/AdminLayout.jsx`
- Test: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/AdminLayout.test.jsx` (create)

**Interfaces:**
- Consumes: `can`, `canAny` (Task 2).
- Produces:
  - `navGroups`: `Array<{ title?, items: Array<{ to, label, icon, end?, permission?, anyOf? }> }>`.
  - `PERMISSION_LABELS`: `Record<slug, string>` (nhãn tiếng Việt).
  - `visibleGroups(user)`: lọc item theo quyền, bỏ group rỗng → cùng shape `navGroups`.
  - `firstAllowedPath(user)`: `string | null` — `to` của item đầu tiên user có quyền, theo thứ tự khai báo.

- [ ] **Step 1: Viết test thất bại**

Create `src/pages/admin/adminNav.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { visibleGroups, firstAllowedPath } from './adminNav'

const orderStaff = { permissions: ['view_dashboard', 'manage_orders'] }
const moderator = { permissions: ['view_dashboard', 'moderate_reviews'] }
const superAdmin = {
  permissions: [
    'manage_categories', 'manage_products', 'manage_orders', 'manage_vouchers',
    'manage_users', 'moderate_reviews', 'view_audit', 'view_health', 'view_dashboard', 'refund',
  ],
}

function labels(groups) {
  return groups.flatMap((g) => g.items.map((i) => i.label))
}

describe('visibleGroups', () => {
  it('order_staff chỉ thấy Tổng quan + Đơn hàng', () => {
    expect(labels(visibleGroups(orderStaff))).toEqual(['Tổng quan', 'Đơn hàng'])
  })
  it('moderator chỉ thấy Tổng quan + Đánh giá', () => {
    expect(labels(visibleGroups(moderator))).toEqual(['Tổng quan', 'Đánh giá'])
  })
  it('super_admin thấy mọi mục', () => {
    expect(labels(visibleGroups(superAdmin))).toContain('Voucher')
    expect(labels(visibleGroups(superAdmin))).toContain('Nhật ký')
    expect(labels(visibleGroups(superAdmin))).toContain('Thư viện ảnh')
  })
  it('loại bỏ group rỗng (không có tiêu đề mồ côi)', () => {
    const groups = visibleGroups(orderStaff)
    expect(groups.every((g) => g.items.length > 0)).toBe(true)
    expect(groups.some((g) => g.title === 'Nhân sự')).toBe(false)
  })
  it('user không quyền admin nào → rỗng', () => {
    expect(visibleGroups({ permissions: [] })).toEqual([])
  })
})

describe('firstAllowedPath', () => {
  it('order_staff → /admin (Tổng quan trước tiên)', () => {
    expect(firstAllowedPath(orderStaff)).toBe('/admin')
  })
  it('user chỉ có manage_orders (không dashboard) → /admin/orders', () => {
    expect(firstAllowedPath({ permissions: ['manage_orders'] })).toBe('/admin/orders')
  })
  it('không có quyền → null', () => {
    expect(firstAllowedPath({ permissions: [] })).toBe(null)
  })
})
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `npm test -- --run src/pages/admin/adminNav.test.js`
Expected: FAIL — module `adminNav` chưa tồn tại.

- [ ] **Step 3: Tạo `adminNav.js`**

Create `src/pages/admin/adminNav.js`:

```js
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
      { to: '/admin/products/seo', label: 'Duyệt SEO', icon: Sparkles, permission: 'manage_products' },
      { to: '/admin/media', label: 'Thư viện ảnh', icon: Images, permission: 'manage_products' },
    ],
  },
  {
    title: 'Bán hàng',
    items: [
      { to: '/admin/orders', label: 'Đơn hàng', icon: Receipt, permission: 'manage_orders' },
      { to: '/admin/vouchers', label: 'Voucher', icon: Ticket, permission: 'manage_vouchers' },
    ],
  },
  { title: 'Cộng đồng', items: [{ to: '/admin/reviews', label: 'Đánh giá', icon: Star, permission: 'moderate_reviews' }] },
  {
    title: 'Nhân sự',
    items: [
      { to: '/admin/employees', label: 'Nhân viên', icon: ShieldCheck, permission: 'manage_users' },
      { to: '/admin/customers', label: 'Khách hàng', icon: Users2, permission: 'manage_users' },
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
```

- [ ] **Step 4: Chạy test — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/adminNav.test.js`
Expected: PASS.

- [ ] **Step 5: Refactor `AdminLayout.jsx` dùng `visibleGroups`**

Sửa `src/pages/admin/AdminLayout.jsx`:
- Xóa khối hằng `const navGroups = [...]` (dòng 25–52) và `const allItems = navGroups.flatMap(...)` — nhưng `activeTitle` cần `allItems`. Thay: import `navGroups` từ `adminNav` cho `activeTitle`, và `visibleGroups` cho sidebar.
- Xóa các icon import không còn dùng trong file (đã chuyển sang `adminNav.js`) — nhưng `Store`, `Menu`, `X`, `ChevronsUpDown`, `LogOut` vẫn dùng trong AdminLayout; giữ lại chúng, chỉ bỏ những icon đã chuyển (`LayoutDashboard, FolderTree, Package, Images, Receipt, Ticket, Star, ShieldCheck, Users2, ScrollText, Sparkles`).
- Đầu file thêm: `import { navGroups, visibleGroups } from './adminNav'`.
- `activeTitle` giữ nguyên nhưng lấy `allItems` từ `navGroups` import: thay `const allItems = navGroups.flatMap((group) => group.items)` (vẫn hợp lệ vì `navGroups` giờ là import).
- `SidebarNav` nhận prop `groups`:

```jsx
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
```

- Trong `AdminLayout`, tính `const groups = visibleGroups(user)` (sau khi có `user`), và truyền vào cả 2 chỗ dùng `SidebarNav`:
  - Desktop: `<SidebarNav groups={groups} />`
  - Mobile: `<SidebarNav groups={groups} onNavigate={() => setMobileOpen(false)} />`

- [ ] **Step 6: Viết test `AdminLayout.test.jsx`**

Create `src/pages/admin/AdminLayout.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminLayout } from './AdminLayout'
import { useAuthStore } from '../../store/authStore'

vi.mock('../../features/auth/hooks', () => ({ useLogout: () => ({ mutate: vi.fn() }) }))

function renderLayout(user) {
  useAuthStore.setState({ token: 't', user })
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminLayout />
    </MemoryRouter>,
  )
}

describe('AdminLayout sidebar gating', () => {
  beforeEach(() => useAuthStore.setState({ token: null, user: null }))

  it('order_staff không thấy Voucher / Nhân viên', () => {
    renderLayout({ permissions: ['view_dashboard', 'manage_orders'] })
    expect(screen.getAllByText('Đơn hàng').length).toBeGreaterThan(0)
    expect(screen.queryByText('Voucher')).toBeNull()
    expect(screen.queryByText('Nhân viên')).toBeNull()
  })

  it('super_admin thấy Voucher và Nhật ký', () => {
    renderLayout({
      permissions: [
        'manage_categories', 'manage_products', 'manage_orders', 'manage_vouchers',
        'manage_users', 'moderate_reviews', 'view_audit', 'view_health', 'view_dashboard', 'refund',
      ],
    })
    expect(screen.getAllByText('Voucher').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nhật ký').length).toBeGreaterThan(0)
  })
})
```

> Ghi chú: AdminLayout render sidebar 2 lần (desktop + mobile drawer), nên dùng `getAllByText(...).length > 0` cho mục có mặt và `queryByText(...) === null` cho mục bị ẩn.

- [ ] **Step 7: Chạy test + lint — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/adminNav.test.js src/pages/admin/AdminLayout.test.jsx && npm run lint`
Expected: PASS + lint sạch. (KHÔNG commit.)

---

## Task 4: FE — `RequirePermission` + `PermissionDenied`

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/PermissionDenied.jsx` + test `PermissionDenied.test.jsx`
- Create: `Nestify-Furniture-e-commerce-frontend/src/routes/RequirePermission.jsx` + test `RequirePermission.test.jsx`

**Interfaces:**
- Consumes: `can`, `canAny` (Task 2); `visibleGroups`, `PERMISSION_LABELS` (Task 3); `useAuthStore`.
- Produces:
  - `<PermissionDenied missing={slug|slugs} />` — trang 403 (nhãn quyền thiếu + link mục hợp lệ).
  - `<RequirePermission slug={string} />` / `<RequirePermission anyOf={string[]} />` — layout route: render `<Outlet/>` nếu đủ quyền, `<PermissionDenied/>` nếu không.

- [ ] **Step 1: Viết test thất bại cho `PermissionDenied`**

Create `src/pages/admin/PermissionDenied.test.jsx`:

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PermissionDenied } from './PermissionDenied'
import { useAuthStore } from '../../store/authStore'

function renderDenied(props, user) {
  useAuthStore.setState({ token: 't', user })
  return render(
    <MemoryRouter>
      <PermissionDenied {...props} />
    </MemoryRouter>,
  )
}

describe('PermissionDenied', () => {
  beforeEach(() => useAuthStore.setState({ token: null, user: null }))

  it('hiện nhãn quyền còn thiếu', () => {
    renderDenied({ missing: 'manage_vouchers' }, { permissions: ['manage_orders'] })
    expect(screen.getByText(/Quản lý voucher/)).toBeInTheDocument()
  })

  it('liệt kê link tới mục user có quyền', () => {
    renderDenied({ missing: 'manage_vouchers' }, { permissions: ['view_dashboard', 'manage_orders'] })
    expect(screen.getByRole('link', { name: 'Đơn hàng' })).toHaveAttribute('href', '/admin/orders')
  })
})
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/pages/admin/PermissionDenied.test.jsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `PermissionDenied.jsx`**

Create `src/pages/admin/PermissionDenied.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { visibleGroups, PERMISSION_LABELS } from './adminNav'

// Shown when a staffer deep-links into an admin section they lack permission for.
// We do NOT redirect (keeps the URL/context) — we explain and offer the sections
// they can actually reach.
export function PermissionDenied({ missing }) {
  const user = useAuthStore((state) => state.user)
  const slugs = Array.isArray(missing) ? missing : [missing].filter(Boolean)
  const labels = slugs.map((slug) => PERMISSION_LABELS[slug] ?? slug)
  const groups = visibleGroups(user)
  const allowed = groups.flatMap((group) => group.items)

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-muted-foreground">
        <ShieldAlert size={22} aria-hidden="true" />
      </div>
      <h2 className="font-display text-2xl text-foreground">Bạn không có quyền truy cập</h2>
      {labels.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Mục này cần quyền: <span className="font-medium text-foreground">{labels.join(', ')}</span>.
          Liên hệ quản trị viên nếu bạn cần quyền này.
        </p>
      )}
      {allowed.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground/70">Các mục bạn có thể vào</p>
          <div className="flex flex-col gap-1.5">
            {allowed.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Tài khoản của bạn chưa được cấp quyền quản trị nào. Vui lòng liên hệ quản trị viên.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Chạy — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/PermissionDenied.test.jsx`
Expected: PASS.

- [ ] **Step 5: Viết test thất bại cho `RequirePermission`**

Create `src/routes/RequirePermission.test.jsx`:

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequirePermission } from './RequirePermission'
import { useAuthStore } from '../store/authStore'

function renderGuarded({ slug, anyOf }, user) {
  useAuthStore.setState({ token: 't', user })
  return render(
    <MemoryRouter initialEntries={['/admin/thing']}>
      <Routes>
        <Route element={<RequirePermission slug={slug} anyOf={anyOf} />}>
          <Route path="/admin/thing" element={<div>Nội dung mật</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequirePermission', () => {
  beforeEach(() => useAuthStore.setState({ token: null, user: null }))

  it('render nội dung khi đủ quyền', () => {
    renderGuarded({ slug: 'manage_orders' }, { permissions: ['manage_orders'] })
    expect(screen.getByText('Nội dung mật')).toBeInTheDocument()
  })

  it('render 403 khi thiếu quyền (không redirect)', () => {
    renderGuarded({ slug: 'manage_orders' }, { permissions: ['view_dashboard'] })
    expect(screen.queryByText('Nội dung mật')).toBeNull()
    expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
  })

  it('anyOf: đủ khi có 1 trong các quyền', () => {
    renderGuarded({ anyOf: ['manage_categories', 'manage_products'] }, { permissions: ['manage_products'] })
    expect(screen.getByText('Nội dung mật')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/routes/RequirePermission.test.jsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 7: Tạo `RequirePermission.jsx`**

Create `src/routes/RequirePermission.jsx`:

```jsx
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { can, canAny } from '../lib/roles'
import { PermissionDenied } from '../pages/admin/PermissionDenied'

// Layout route guard for admin sections. Unlike AdminRoute (coarse isStaff gate),
// this checks a specific permission and, on failure, renders the 403 page in place
// (no redirect) so a deep-linked URL keeps its context.
export function RequirePermission({ slug, anyOf }) {
  const user = useAuthStore((state) => state.user)
  const allowed = anyOf ? canAny(user, anyOf) : can(user, slug)

  if (!allowed) {
    return <PermissionDenied missing={anyOf ?? slug} />
  }
  return <Outlet />
}
```

- [ ] **Step 8: Chạy test + lint — kỳ vọng PASS**

Run: `npm test -- --run src/routes/RequirePermission.test.jsx src/pages/admin/PermissionDenied.test.jsx && npm run lint`
Expected: PASS + lint sạch. (KHÔNG commit.)

---

## Task 5: FE — `AdminHome` (index redirect) + wiring router

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/AdminHome.jsx` + test `AdminHome.test.jsx`
- Modify: `Nestify-Furniture-e-commerce-frontend/src/app/router.jsx`

**Interfaces:**
- Consumes: `can` (Task 2); `firstAllowedPath` (Task 3); `PermissionDenied` (Task 4); `RequirePermission` (Task 4); `AdminDashboardPage`.
- Produces: `<AdminHome />` — element cho `{ index: true }` của `/admin`.

- [ ] **Step 1: Viết test thất bại**

Create `src/pages/admin/AdminHome.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminHome } from './AdminHome'
import { useAuthStore } from '../../store/authStore'

vi.mock('./AdminDashboardPage', () => ({ AdminDashboardPage: () => <div>Bảng tổng quan</div> }))

function renderHome(user) {
  useAuthStore.setState({ token: 't', user })
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/orders" element={<div>Trang đơn hàng</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminHome', () => {
  beforeEach(() => useAuthStore.setState({ token: null, user: null }))

  it('có view_dashboard → hiện bảng tổng quan', () => {
    renderHome({ permissions: ['view_dashboard'] })
    expect(screen.getByText('Bảng tổng quan')).toBeInTheDocument()
  })

  it('thiếu view_dashboard nhưng có mục khác → redirect tới mục đầu hợp lệ', () => {
    renderHome({ permissions: ['manage_orders'] })
    expect(screen.getByText('Trang đơn hàng')).toBeInTheDocument()
  })

  it('không có quyền nào → trang 403', () => {
    renderHome({ permissions: [] })
    expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/pages/admin/AdminHome.test.jsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `AdminHome.jsx`**

Create `src/pages/admin/AdminHome.jsx`:

```jsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { can } from '../../lib/roles'
import { firstAllowedPath } from './adminNav'
import { PermissionDenied } from './PermissionDenied'
import { AdminDashboardPage } from './AdminDashboardPage'

// Index element for /admin. The dashboard needs `view_dashboard`; a staffer
// without it is sent to the first section they CAN reach (combined behaviour:
// the index redirects, but deep-links to a forbidden section show 403). A
// staffer with no admin permission at all sees the 403 page.
export function AdminHome() {
  const user = useAuthStore((state) => state.user)

  if (can(user, 'view_dashboard')) {
    return <AdminDashboardPage />
  }
  const target = firstAllowedPath(user)
  if (target) {
    return <Navigate to={target} replace />
  }
  return <PermissionDenied missing="view_dashboard" />
}
```

> Ghi chú thiết kế: `AdminHome` import tĩnh `AdminDashboardPage` (không lazy). Dashboard là trang mặc định của admin nên gộp chung chunk với shell là chấp nhận được ở SP1; đổi lại giữ được URL `/admin` là dashboard mà không thêm path mới.

- [ ] **Step 4: Chạy — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/AdminHome.test.jsx`
Expected: PASS.

- [ ] **Step 5: Wiring `router.jsx`**

Sửa `src/app/router.jsx`:
- Thêm import (khối `named(...)` phía trên): 
  - `const AdminHome = named(() => import('../pages/admin/AdminHome'), 'AdminHome')`
  - Xóa `const AdminDashboardPage = named(...)` **nếu** không còn dùng trực tiếp trong router (nó giờ được `AdminHome` import tĩnh). Kiểm tra: sau sửa, `AdminDashboardPage` không còn xuất hiện trong `router.jsx` → xóa dòng khai báo của nó.
- Thêm import guard (đầu file cùng nhóm route import): `import { RequirePermission } from '../routes/RequirePermission'`.
- Thay khối `children` của `AdminLayout` (dòng 108–124) bằng cấu trúc nhóm theo quyền:

```jsx
        children: [
          { index: true, element: lazyPage(<AdminHome />) },
          {
            element: <RequirePermission slug="manage_categories" />,
            children: [{ path: 'categories', element: lazyPage(<AdminCategoriesPage />) }],
          },
          {
            element: <RequirePermission slug="manage_products" />,
            children: [
              { path: 'products', element: lazyPage(<AdminProductsPage />) },
              { path: 'products/new', element: lazyPage(<AdminProductCreatePage />) },
              { path: 'products/seo', element: lazyPage(<AdminSeoReviewPage />) },
              { path: 'products/:id', element: lazyPage(<AdminProductEditPage />) },
            ],
          },
          {
            element: <RequirePermission slug="manage_products" />,
            children: [{ path: 'media', element: lazyPage(<AdminMediaLibraryPage />) }],
          },
          {
            element: <RequirePermission slug="manage_orders" />,
            children: [
              { path: 'orders', element: lazyPage(<AdminOrdersPage />) },
              { path: 'orders/:id', element: lazyPage(<AdminOrderDetailPage />) },
            ],
          },
          {
            element: <RequirePermission slug="manage_vouchers" />,
            children: [{ path: 'vouchers', element: lazyPage(<AdminVouchersPage />) }],
          },
          {
            element: <RequirePermission slug="moderate_reviews" />,
            children: [{ path: 'reviews', element: lazyPage(<AdminReviewsPage />) }],
          },
          {
            element: <RequirePermission slug="manage_users" />,
            children: [
              { path: 'employees', element: lazyPage(<AdminEmployeesPage />) },
              { path: 'customers', element: lazyPage(<AdminCustomersPage />) },
              { path: 'users', element: <Navigate to="/admin/employees" replace /> },
            ],
          },
          {
            element: <RequirePermission slug="view_audit" />,
            children: [{ path: 'audit-logs', element: lazyPage(<AdminAuditLogsPage />) }],
          },
        ],
```

- [ ] **Step 6: Chạy toàn suite FE + lint + build — kỳ vọng PASS**

Run: `npm test -- --run && npm run lint && npm run build`
Expected: toàn bộ PASS, build OK (kiểm router hợp lệ). (KHÔNG commit.)

---

## Task 6: FE — ẩn nút Refund theo `can('refund')`

**Files:**
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/orders/AdminOrderDetailPage.jsx`
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/orders/AdminOrderDetailPage.test.jsx`

**Interfaces:**
- Consumes: `can` (Task 2); `useAuthStore`.

- [ ] **Step 1: Cập nhật test — thêm ca ẩn + seed quyền cho ca hiện có**

Sửa `src/pages/admin/orders/AdminOrderDetailPage.test.jsx`:
- Thêm import: `import { useAuthStore } from '../../../store/authStore'`.
- Trong `renderPage`, trước `return render(...)`, thêm dòng seed quyền refund (mặc định để các test hiện có vẫn thấy nút):

```js
  useAuthStore.setState({ token: 't', user: { permissions: ['refund'] } })
```

- Thêm test mới trong `describe('AdminOrderDetailPage', ...)`:

```js
  it('ẩn nút Hoàn tiền khi user không có quyền refund', () => {
    useAuthStore.setState({ token: 't', user: { permissions: [] } })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[{ pathname: '/admin/orders/101', state: { order: baseOrder } }]}>
          <Routes>
            <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Hoàn tiền' })).toBeNull()
  })
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL ở ca mới**

Run: `npm test -- --run src/pages/admin/orders/AdminOrderDetailPage.test.jsx`
Expected: ca "ẩn nút Hoàn tiền..." FAIL (nút vẫn hiện vì chưa gate).

- [ ] **Step 3: Gate nút Refund**

Sửa `src/pages/admin/orders/AdminOrderDetailPage.jsx`:
- Thêm import: `import { useAuthStore } from '../../../store/authStore'` và `import { can } from '../../../lib/roles'`.
- Trong component, thêm: `const user = useAuthStore((state) => state.user)`.
- Đổi điều kiện render khối refund (dòng ~55 và ~151):
  - Dòng ~55 giữ nguyên `const canRefund = order.status !== 'pending_payment'`.
  - Thêm ngay dưới: `const mayRefund = canRefund && can(user, 'refund')`.
  - Đổi `{canRefund && (` (khối Card "Hoàn tiền") thành `{mayRefund && (`.

- [ ] **Step 4: Chạy — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/orders/AdminOrderDetailPage.test.jsx`
Expected: PASS (gồm ca refund cũ — nhờ seed quyền — và ca ẩn mới).

- [ ] **Step 5: Toàn suite FE + lint — kỳ vọng PASS**

Run: `npm test -- --run && npm run lint`
Expected: toàn bộ xanh, lint sạch. (KHÔNG commit.)

---

## Xác minh cuối (sau Task 6)

- [ ] BE: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=UserPermissionsResourceTest` xanh; nhóm `LoginTest` xanh.
- [ ] FE: `npm test -- --run` toàn xanh; `npm run lint` sạch; `npm run build` OK.
- [ ] Không có file `.ts`/`.tsx` mới; không thêm dependency (`git diff` package.json trống).
- [ ] Working tree **uncommitted** (guardrail) — chỉ báo cáo, chờ user cho phép commit.
- [ ] MANUAL QA runtime (ngoài test): đăng nhập bằng order_staff → sidebar chỉ còn Tổng quan + Đơn hàng; mở thẳng `/admin/vouchers` → trang 403 có link; super_admin thấy đủ; user thiếu `view_dashboard` mở `/admin` → nhảy tới mục đầu.
