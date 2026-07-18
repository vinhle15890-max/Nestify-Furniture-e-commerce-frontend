# RBAC — Ma trận Role×Permission (SP3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chế độ xem "Ma trận" (read-only) hàng=role × cột=permission trên trang Vai trò, với lối tắt Sửa mở `RoleFormDialog` (SP2).

**Architecture:** Thuần FE. Component mới `RolePermissionMatrix` nhận `roles` (từ `useRoles` sẵn có, đã mang `permissions[]`/`locked`) + tự gọi `usePermissions` (cột). `AdminRolesPage` thêm toggle `Bảng | Ma trận` (state cục bộ) và render matrix thay bảng khi chọn. Không endpoint BE mới, không migration.

**Tech Stack:** React 18 (JSX no-TS), TanStack Query v5, Tailwind v4 semantic tokens, lucide-react, Vitest + RTL.

## Global Constraints

- **KHÔNG commit** (guardrail): mỗi task kết thúc suite xanh, working tree uncommitted; bỏ mọi bước `git commit`.
- **Thuần FE** — KHÔNG đụng BE, KHÔNG endpoint mới, KHÔNG migration.
- Chỉ đọc: ma trận KHÔNG có checkbox/onChange trên ô; đổi quyền đi qua `RoleFormDialog` (SP2) qua nút Sửa.
- Tái dùng dữ liệu: `useRoles` (`features/admin/users/hooks`) cho hàng; `usePermissions` (`features/admin/roles/hooks`) cho cột. KHÔNG gọi API mới.
- **Ẩn `customer`** khỏi ma trận (baseline non-staff, 0 quyền admin). Hiện mọi role còn lại.
- Hàng `super_admin`: hiện ghi chú "Toàn quyền (bypass)".
- Plain JS (JSX), không TypeScript; không thêm dependency; admin theme `[data-theme='legacy']`; copy VN; semantic token (không raw hex, không `text-white`).
- FE test: `npm test -- --run <path>`; cuối mỗi task chạy `npm run lint`.

---

## File Structure

- Create: `src/pages/admin/roles/RolePermissionMatrix.jsx` (+ test `RolePermissionMatrix.test.jsx`).
- Modify: `src/pages/admin/roles/AdminRolesPage.jsx` (thêm toggle view + render matrix); mở rộng `AdminRolesPage.test.jsx` (2 test mới, giữ 2 test SP2 xanh).

Các primitive/nguồn dùng lại (đã xác minh ở SP2): `Button` (variant `primary|secondary|ghost|destructive`, KHÔNG có prop `size`), `Badge` (`tone` ∈ `{sale,in-stock,out-of-stock,neutral}`), `Spinner` (`label`), `PERMISSION_LABELS` (`../adminNav`), `usePermissions`/`useRoles`. `Check` icon có trong lucide-react.

---

## Task 1: `RolePermissionMatrix` component

**Files:**
- Create: `src/pages/admin/roles/RolePermissionMatrix.jsx`
- Test: `src/pages/admin/roles/RolePermissionMatrix.test.jsx` (create)

**Interfaces:**
- Consumes: `usePermissions()` → `{ data: { data: [{ slug, display_name }] }, isLoading }`; prop `roles` (mảng `{ id, name, display_name, locked, permissions: string[] }`), prop `onEdit(role)`.
- Produces: `export function RolePermissionMatrix({ roles, onEdit })` — bảng read-only; ẩn `customer`; ô "có quyền" là `<span role="img" aria-label="{display_name} có quyền {permLabel}">`; nút "Sửa/Xem vai trò {display_name}" gọi `onEdit(role)`.

- [ ] **Step 1: Viết test thất bại**

Create `src/pages/admin/roles/RolePermissionMatrix.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RolePermissionMatrix } from './RolePermissionMatrix'
import * as rolesHooks from '../../../features/admin/roles/hooks'

vi.mock('../../../features/admin/roles/hooks')

const permissions = [
  { slug: 'manage_orders', display_name: 'Manage Orders' },
  { slug: 'view_dashboard', display_name: 'View Admin Dashboard' },
]

const roles = [
  { id: 1, name: 'super_admin', display_name: 'Super Admin', locked: true, permissions: ['manage_orders', 'view_dashboard'] },
  { id: 2, name: 'order_staff', display_name: 'Nhân viên đơn', locked: false, permissions: ['manage_orders'] },
  { id: 3, name: 'customer', display_name: 'Khách hàng', locked: true, permissions: [] },
]

beforeEach(() => {
  vi.clearAllMocks()
  rolesHooks.usePermissions.mockReturnValue({ data: { data: permissions }, isLoading: false })
})

describe('RolePermissionMatrix', () => {
  it('render cột theo permission + ẩn customer + ghi chú bypass cho super_admin', () => {
    render(<RolePermissionMatrix roles={roles} onEdit={() => {}} />)

    // cột (nhãn VN từ PERMISSION_LABELS) — chỉ có ở header
    expect(screen.getByText('Quản lý đơn hàng')).toBeInTheDocument()
    expect(screen.getByText('Xem tổng quan')).toBeInTheDocument()
    // hàng role
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText('Nhân viên đơn')).toBeInTheDocument()
    // customer bị ẩn
    expect(screen.queryByText('Khách hàng')).toBeNull()
    // super_admin bypass note
    expect(screen.getByText(/bypass/i)).toBeInTheDocument()
  })

  it('ô đánh dấu đúng quyền của từng role', () => {
    render(<RolePermissionMatrix roles={roles} onEdit={() => {}} />)

    // order_staff CÓ manage_orders
    expect(
      screen.getByRole('img', { name: 'Nhân viên đơn có quyền Quản lý đơn hàng' }),
    ).toBeInTheDocument()
    // order_staff KHÔNG có view_dashboard
    expect(
      screen.queryByRole('img', { name: 'Nhân viên đơn có quyền Xem tổng quan' }),
    ).toBeNull()
  })

  it('click Sửa gọi onEdit với đúng role', async () => {
    const onEdit = vi.fn()
    render(<RolePermissionMatrix roles={roles} onEdit={onEdit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sửa vai trò Nhân viên đơn' }))
    expect(onEdit).toHaveBeenCalledWith(roles[1])
  })
})
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/pages/admin/roles/RolePermissionMatrix.test.jsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `RolePermissionMatrix.jsx`**

Create `src/pages/admin/roles/RolePermissionMatrix.jsx`:

```jsx
import { Check } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { Spinner } from '../../../components/Spinner'
import { PERMISSION_LABELS } from '../adminNav'
import { usePermissions } from '../../../features/admin/roles/hooks'

function labelFor(permission) {
  return PERMISSION_LABELS[permission.slug] ?? permission.display_name ?? permission.slug
}

const thBase = 'text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'

// Read-only Role×Permission overview. Rows = roles (customer hidden — it's the
// non-staff baseline with no admin permissions), columns = the full permission
// catalogue. Editing still goes through RoleFormDialog via onEdit (SP2); this grid
// never writes.
export function RolePermissionMatrix({ roles, onEdit }) {
  const { data: permData, isLoading } = usePermissions()
  const permissions = permData?.data ?? []
  const rows = roles.filter((role) => role.name !== 'customer')

  if (isLoading) {
    return <Spinner label="Đang tải quyền..." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className={`sticky left-0 z-10 bg-surface px-4 py-3 text-left ${thBase}`}>Vai trò</th>
            {permissions.map((permission) => (
              <th key={permission.slug} className={`px-3 py-3 text-center ${thBase}`} title={permission.display_name ?? permission.slug}>
                {labelFor(permission)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((role) => (
            <tr key={role.id} className="border-b border-border/60">
              <td className="sticky left-0 z-10 bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{role.display_name}</span>
                      <span className="text-xs text-muted-foreground">{role.name}</span>
                      {role.locked && (
                        <Badge tone="neutral">Hệ thống</Badge>
                      )}
                    </div>
                    {role.name === 'super_admin' && (
                      <span className="text-xs text-muted-foreground">Toàn quyền (bypass)</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => onEdit(role)}
                    aria-label={`${role.locked ? 'Xem' : 'Sửa'} vai trò ${role.display_name}`}
                    className="ml-auto"
                  >
                    {role.locked ? 'Xem' : 'Sửa'}
                  </Button>
                </div>
              </td>
              {permissions.map((permission) => {
                const has = role.permissions?.includes(permission.slug)
                return (
                  <td key={permission.slug} className="px-3 py-3 text-center">
                    {has ? (
                      <span role="img" aria-label={`${role.display_name} có quyền ${labelFor(permission)}`}>
                        <Check size={16} className="mx-auto text-foreground" aria-hidden="true" />
                      </span>
                    ) : (
                      <span aria-hidden="true" className="text-muted-foreground">–</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Chạy + lint — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/roles/RolePermissionMatrix.test.jsx && npm run lint`
Expected: PASS (3 test) + lint sạch. (KHÔNG commit.)

> Ghi chú implementer: nếu `Badge`/`Button`/`Spinner` props thực tế khác giả định (xem `src/components/*.jsx`), chỉnh cho khớp NHƯNG giữ nguyên: aria-label nút Sửa (`Sửa/Xem vai trò {display_name}`), `role="img"` + aria-label ô có quyền (`{display_name} có quyền {permLabel}`), ghi chú `bypass`, và việc ẩn `customer` — test phụ thuộc các điểm này.

---

## Task 2: Toggle `Bảng | Ma trận` trên `AdminRolesPage`

**Files:**
- Modify: `src/pages/admin/roles/AdminRolesPage.jsx`
- Test: `src/pages/admin/roles/AdminRolesPage.test.jsx` (mở rộng — thêm 2 test, giữ 2 test SP2)

**Interfaces:**
- Consumes: `RolePermissionMatrix` (Task 1), state `view` cục bộ.
- Produces: `AdminRolesPage` có toggle 2 nút; `view==='matrix'` → render `<RolePermissionMatrix roles={roles} onEdit={setEditing} />`; `view==='table'` → bảng list SP2.

- [ ] **Step 1: Viết test thất bại (thêm vào file test hiện có)**

Mở `src/pages/admin/roles/AdminRolesPage.test.jsx`. Trong `describe('AdminRolesPage', ...)`, thêm 2 test (giữ nguyên 2 test cũ):

```jsx
  it('toggle sang Ma trận hiển thị lưới, toggle về Bảng quay lại danh sách', async () => {
    renderPage()

    // mặc định là Bảng: có cột "Số quyền"
    expect(screen.getByText('Số quyền')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ma trận' }))
    // matrix-specific: ghi chú bypass của super_admin
    expect(screen.getByText(/bypass/i)).toBeInTheDocument()
    // header bảng list biến mất
    expect(screen.queryByText('Số quyền')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Bảng' }))
    expect(screen.getByText('Số quyền')).toBeInTheDocument()
  })

  it('nút Sửa trong ma trận mở RoleFormDialog cho đúng role', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Ma trận' }))
    // order_staff không locked → nút "Sửa vai trò Nhân viên đơn"
    await userEvent.click(screen.getByRole('button', { name: 'Sửa vai trò Nhân viên đơn' }))
    // RoleFormDialog mở ở chế độ sửa (title "Sửa vai trò")
    expect(screen.getByText('Sửa vai trò')).toBeInTheDocument()
  })
```

(Lưu ý: `usePermissions` đã được mock ở `beforeEach` trả `{ data: { data: [] }, isLoading: false }` — matrix vẫn render hàng role + ghi chú bypass dù 0 cột, đủ cho 2 test này. `RoleFormDialog` dùng cùng `usePermissions` mock nên mở được.)

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/pages/admin/roles/AdminRolesPage.test.jsx`
Expected: FAIL — chưa có nút "Ma trận"/"Bảng".

- [ ] **Step 3: Sửa `AdminRolesPage.jsx`**

Thêm import (cạnh các import hiện có):
```jsx
import { RolePermissionMatrix } from './RolePermissionMatrix'
```

Thêm state view (cạnh `const [editing, ...]`):
```jsx
  const [view, setView] = useState('table') // 'table' | 'matrix'
```

Đổi prop `actions` của `PageHeader` thành cụm toggle + nút Tạo:
```jsx
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-control border border-border p-0.5">
              <button
                type="button"
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'table' ? 'bg-foreground text-surface' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Bảng
              </button>
              <button
                type="button"
                onClick={() => setView('matrix')}
                aria-pressed={view === 'matrix'}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'matrix' ? 'bg-foreground text-surface' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ma trận
              </button>
            </div>
            <Button onClick={() => setEditing(null)} className="gap-2">
              <Plus size={16} />
              Tạo vai trò
            </Button>
          </div>
        }
```

Trong `<Panel className="mt-6">`, đổi nhánh render (giữ `isLoading`/`EmptyState`, chỉ rẽ theo `view` ở nhánh có data):
```jsx
        {isLoading ? (
          <Spinner label="Đang tải vai trò..." />
        ) : roles.length === 0 ? (
          <EmptyState title="Chưa có vai trò" description="Tạo vai trò đầu tiên để phân quyền." />
        ) : view === 'matrix' ? (
          <RolePermissionMatrix roles={roles} onEdit={setEditing} />
        ) : (
          <div className="overflow-x-auto">
            {/* ...bảng list SP2 giữ nguyên... */}
          </div>
        )}
```
(Giữ nguyên toàn bộ `<table>` list SP2 trong nhánh cuối, và giữ `RoleFormDialog` + Modal xoá bên dưới Panel không đổi.)

- [ ] **Step 4: Chạy + lint — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/roles/AdminRolesPage.test.jsx && npm run lint`
Expected: PASS (4 test) + lint sạch. (KHÔNG commit.)

- [ ] **Step 5: Toàn suite + build — kỳ vọng PASS**

Run: `npm test -- --run && npm run build`
Expected: toàn bộ xanh, build OK. (KHÔNG commit.)

---

## Xác minh cuối (sau Task 2)

- [ ] FE: `npm test -- --run` toàn xanh; `npm run lint` sạch; `npm run build` OK.
- [ ] Không file `.ts`/`.tsx`; không thêm dependency; không endpoint/migration BE.
- [ ] Working tree **uncommitted** (guardrail).
- [ ] MANUAL QA: `/admin/roles` → toggle "Ma trận" thấy lưới role×permission; `customer` không có trong lưới; `super_admin` có ghi chú "bypass"; nút Sửa mở `RoleFormDialog` (role hệ thống → chỉ xem); tràn ngang scroll được; toggle "Bảng" quay lại danh sách SP2.
