# RBAC — Audit UI + log 403 bị chặn (SP4 / D2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ghi lại mọi lần bị chặn 403 (đã đăng nhập, thiếu quyền) vào `audit_logs`, và nâng cấp trang Nhật ký với lọc theo hành động + nhãn tiếng Việt + tô nổi bật dòng "bị chặn".

**Architecture:** Cross-repo, KHÔNG migration (bảng `audit_logs` đã đủ cột). BE: `CheckPermission` middleware ghi `access.denied` ở nhánh từ chối (bọc try/catch để không phá 403); `AuditLogService::list` + `AuditLogController::index` thêm filter `action`. FE: map nhãn VN cho `action`, dropdown lọc, tô đỏ dòng `access.denied`.

**Tech Stack:** Laravel 13 + PostgreSQL 16 (test Docker sqlite) · React 18 plain JSX + TanStack Query v5 + Vitest/RTL.

## Global Constraints

- **KHÔNG commit** cho tới khi user yêu cầu — mọi thay đổi để uncommitted.
- **KHÔNG migration, KHÔNG endpoint mới, KHÔNG resource mới** — tái dùng hạ tầng audit sẵn có.
- **`cloudinary_id` / `preview_public_id` không bao giờ serialize** (giữ nếp, không đụng resource).
- BE là nguồn enforce chân lý; **ghi audit lỗi KHÔNG được đổi hành vi 403** (try/catch, nuốt lỗi, vẫn 403).
- **401 vô danh (chưa đăng nhập) KHÔNG ghi** — chỉ ghi khi đã đăng nhập nhưng thiếu quyền.
- FE: plain JS (JSX), không TS; không thêm dependency; admin theme `[data-theme='legacy']`; copy VN; semantic token (không hex thô); feature-folder pattern.
- BE test: Docker sqlite (`docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=<Class>`). FE test: `npm test -- --run <path>`, `npm run lint`.

---

### Task 1: BE — ghi `access.denied` trong CheckPermission middleware

**Files:**
- Modify: `Nestify-Furniture-e-commerce-backend/src/app/Http/Middleware/CheckPermission.php`
- Test: `Nestify-Furniture-e-commerce-backend/src/tests/Feature/Security/AccessDeniedAuditTest.php`

**Interfaces:**
- Consumes: `App\Models\AuditLog` (fillable: `user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent`; casts old/new_values → array). Route `GET /api/admin/products` gated bằng `check.permission:manage_products`.
- Produces: bản ghi `AuditLog` với `action='access.denied'`, `new_values = { permission, method, path }`, khi user đã đăng nhập nhưng thiếu quyền. Hành vi 403 (code `FORBIDDEN`) giữ nguyên.

- [ ] **Step 1: Viết test thất bại**

Tạo `Nestify-Furniture-e-commerce-backend/src/tests/Feature/Security/AccessDeniedAuditTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Security;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessDeniedAuditTest extends TestCase
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

    public function test_denied_request_is_logged_and_still_returns_403(): void
    {
        $auditor = $this->userWithRole('auditor', ['view_audit']); // thiếu manage_products

        $this->actingAs($auditor)->getJson('/api/admin/products')
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');

        $log = AuditLog::where('action', 'access.denied')->first();

        $this->assertNotNull($log, 'Phải ghi 1 bản ghi access.denied');
        $this->assertSame($auditor->id, $log->user_id);
        $this->assertSame('manage_products', $log->new_values['permission']);
        $this->assertSame('GET', $log->new_values['method']);
        $this->assertStringContainsString('admin/products', $log->new_values['path']);
    }

    public function test_authorized_request_creates_no_denial_log(): void
    {
        $auditor = $this->userWithRole('auditor', ['view_audit']);

        $this->actingAs($auditor)->getJson('/api/admin/audit-logs')->assertOk();

        $this->assertSame(0, AuditLog::where('action', 'access.denied')->count());
    }

    public function test_unauthenticated_request_creates_no_denial_log(): void
    {
        $this->getJson('/api/admin/products')->assertStatus(401);

        $this->assertSame(0, AuditLog::where('action', 'access.denied')->count());
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=AccessDeniedAuditTest`
Expected: FAIL ở `test_denied_request_is_logged_and_still_returns_403` (`$log` null — chưa ghi).

- [ ] **Step 3: Sửa middleware để ghi denial**

Thay toàn bộ `Nestify-Furniture-e-commerce-backend/src/app/Http/Middleware/CheckPermission.php` bằng:

```php
<?php
namespace App\Http\Middleware;
use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'Vui lòng đăng nhập.'
                ]
            ], 401);
        }

        if (!$user->can($permission)) {
            $this->logDenied($request, $user, $permission);

            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'Bạn không có quyền thực hiện thao tác này.'
                ]
            ], 403);
        }

        return $next($request);
    }

    /**
     * Ghi lại lần bị chặn 403 vào audit trail. Audit là phụ trợ:
     * lỗi ghi KHÔNG được làm hỏng phản hồi 403 nên bọc try/catch.
     */
    private function logDenied(Request $request, $user, string $permission): void
    {
        try {
            AuditLog::create([
                'user_id'     => $user->id,
                'action'      => 'access.denied',
                'entity_type' => null,
                'entity_id'   => null,
                'old_values'  => null,
                'new_values'  => [
                    'permission' => $permission,
                    'method'     => $request->method(),
                    'path'       => $request->path(),
                ],
                'ip_address'  => $request->ip(),
                'user_agent'  => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Không ghi được audit access.denied', ['error' => $e->getMessage()]);
        }
    }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=AccessDeniedAuditTest`
Expected: PASS (3 test). Nếu Docker bind-mount mất (`/var/www/html` rỗng) → báo user chạy suite; code review đủ để xác nhận.

- [ ] **Step 5: KHÔNG commit** (guardrail — để uncommitted).

---

### Task 2: BE — filter `action` trong AuditLogService + Controller

**Files:**
- Modify: `Nestify-Furniture-e-commerce-backend/src/app/Services/AuditLogService.php`
- Modify: `Nestify-Furniture-e-commerce-backend/src/app/Http/Controllers/Admin/AuditLogController.php`
- Test: `Nestify-Furniture-e-commerce-backend/src/tests/Feature/Admin/AuditLogFilterTest.php`

**Interfaces:**
- Consumes: `AuditLog` model; route `GET /api/admin/audit-logs` (gated `view_audit`), response `{ data, meta.pagination }`.
- Produces: `AuditLogService::list(?string $entityType = null, ?string $action = null, int $perPage = 50)`; controller đọc `?action=` từ query và truyền vào.

- [ ] **Step 1: Viết test thất bại**

Tạo `Nestify-Furniture-e-commerce-backend/src/tests/Feature/Admin/AuditLogFilterTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogFilterTest extends TestCase
{
    use RefreshDatabase;

    private function auditor(): User
    {
        $role = Role::create(['name' => 'auditor', 'display_name' => 'Auditor']);
        $perm = Permission::firstOrCreate(['slug' => 'view_audit'], ['display_name' => 'view_audit']);
        $role->permissions()->attach($perm->id);

        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_filters_audit_logs_by_action(): void
    {
        $user = $this->auditor();
        AuditLog::create(['user_id' => $user->id, 'action' => 'access.denied', 'new_values' => ['permission' => 'refund']]);
        AuditLog::create(['user_id' => $user->id, 'action' => 'role.create', 'new_values' => ['name' => 'x']]);

        $res = $this->actingAs($user)->getJson('/api/admin/audit-logs?action=access.denied')->assertOk();

        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('access.denied', $data[0]['action']);
    }

    public function test_without_action_returns_all_admin_actions(): void
    {
        $user = $this->auditor();
        AuditLog::create(['user_id' => $user->id, 'action' => 'access.denied', 'new_values' => ['permission' => 'refund']]);
        AuditLog::create(['user_id' => $user->id, 'action' => 'role.create', 'new_values' => ['name' => 'x']]);

        $res = $this->actingAs($user)->getJson('/api/admin/audit-logs')->assertOk();

        $this->assertCount(2, $res->json('data'));
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=AuditLogFilterTest`
Expected: FAIL ở `test_filters_audit_logs_by_action` (trả 2 thay vì 1 — filter chưa có).

- [ ] **Step 3: Thêm filter vào service**

Sửa `Nestify-Furniture-e-commerce-backend/src/app/Services/AuditLogService.php` — đổi chữ ký `list` và thêm điều kiện `action`:

```php
    public function list(?string $entityType, ?string $action = null, int $perPage = 50): LengthAwarePaginator
    {
        return AuditLog::with('user')
            ->whereNotIn('action', self::BEHAVIORAL_ACTIONS)
            ->when($entityType, fn ($q) => $q->where('entity_type', $entityType))
            ->when($action, fn ($q) => $q->where('action', $action))
            ->latest()
            ->paginate($perPage);
    }
```

- [ ] **Step 4: Đọc `action` trong controller**

Sửa `Nestify-Furniture-e-commerce-backend/src/app/Http/Controllers/Admin/AuditLogController.php` — dòng gọi service:

```php
        $logs = $this->service->list(
            $request->query('entity_type'),
            $request->query('action'),
        );
```

(Giữ nguyên phần build response `{ data, meta.pagination }`.)

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=AuditLogFilterTest`
Expected: PASS (2 test).

- [ ] **Step 6: KHÔNG commit** (guardrail).

---

### Task 3: FE — nhãn VN cho hành động + plumbing filter qua api/hook

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/actionLabels.js`
- Create: `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/actionLabels.test.js`
- Modify: `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/api.js`
- Modify: `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/hooks.js`
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/auditLogs/AdminAuditLogsPage.test.jsx` (cập nhật assertion chữ ký cũ)

**Interfaces:**
- Consumes: `useOffsetQuery({ queryKey, queryFn, page })` — gọi `queryFn(page)`, tự nối `{ page }` vào queryKey.
- Produces:
  - `AUDIT_ACTION_LABELS` (object slug→VN) và `labelForAction(action) => string` (fallback slug thô).
  - `getAuditLogs(page, action = '')` — gửi `params: { page, action: action || undefined }`.
  - `useAdminAuditLogs(page, action = '')` — queryKey gồm `{ action }`, gọi `getAuditLogs(p, action)`.

- [ ] **Step 1: Viết test thất bại cho label map**

Tạo `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/actionLabels.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { AUDIT_ACTION_LABELS, labelForAction } from './actionLabels'

describe('labelForAction', () => {
  it('maps known actions to Vietnamese labels', () => {
    expect(labelForAction('access.denied')).toBe('Truy cập bị chặn (403)')
    expect(labelForAction('role.create')).toBe('Tạo vai trò')
    expect(labelForAction('payment.refund')).toBe('Hoàn tiền')
  })

  it('falls back to the raw slug for unknown actions', () => {
    expect(labelForAction('some.new.action')).toBe('some.new.action')
  })

  it('exposes the label map for building filter options', () => {
    expect(AUDIT_ACTION_LABELS['access.denied']).toBe('Truy cập bị chặn (403)')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npm test -- --run src/features/admin/auditLogs/actionLabels.test.js`
Expected: FAIL (module `./actionLabels` chưa tồn tại).

- [ ] **Step 3: Tạo label map**

Tạo `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/actionLabels.js`:

```js
// Nhãn tiếng Việt cho các action ghi trong audit trail.
// BE thêm action mới về sau → labelForAction fallback slug thô (không vỡ UI).
export const AUDIT_ACTION_LABELS = {
  'access.denied': 'Truy cập bị chặn (403)',
  'order.cancel': 'Hủy đơn hàng',
  'order.status_transition': 'Chuyển trạng thái đơn',
  'payment.refund': 'Hoàn tiền',
  'user.assign_roles': 'Gán vai trò cho người dùng',
  'role.create': 'Tạo vai trò',
  'role.update': 'Sửa vai trò',
  'role.delete': 'Xoá vai trò',
}

export function labelForAction(action) {
  return AUDIT_ACTION_LABELS[action] ?? action
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npm test -- --run src/features/admin/auditLogs/actionLabels.test.js`
Expected: PASS (3 test).

- [ ] **Step 5: Plumb `action` qua api + hook**

Thay `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/api.js`:

```js
import { apiClient } from '../../../lib/apiClient'

export function getAuditLogs(page, action = '') {
  return apiClient.get('/admin/audit-logs', {
    params: { page, action: action || undefined },
  })
}
```

Thay `Nestify-Furniture-e-commerce-frontend/src/features/admin/auditLogs/hooks.js`:

```js
import { useOffsetQuery } from '../../../lib/pagination'
import * as auditLogsApi from './api'

export function useAdminAuditLogs(page, action = '') {
  return useOffsetQuery({
    queryKey: ['admin', 'audit-logs', { action }],
    queryFn: (p) => auditLogsApi.getAuditLogs(p, action),
    page,
  })
}
```

- [ ] **Step 6: Cập nhật assertion chữ ký cũ trong test trang**

Trong `Nestify-Furniture-e-commerce-frontend/src/pages/admin/auditLogs/AdminAuditLogsPage.test.jsx`, đổi dòng 56:

```js
    await waitFor(() => expect(auditLogsApi.getAuditLogs).toHaveBeenCalledWith(2, ''))
```

- [ ] **Step 7: Chạy test, xác nhận PASS**

Run: `npm test -- --run src/features/admin/auditLogs/actionLabels.test.js src/pages/admin/auditLogs/AdminAuditLogsPage.test.jsx`
Expected: PASS (test cũ của trang vẫn xanh với chữ ký mới; label map xanh).

- [ ] **Step 8: KHÔNG commit** (guardrail).

---

### Task 4: FE — trang Nhật ký: dropdown lọc + nhãn VN + tô dòng bị chặn

**Files:**
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/auditLogs/AdminAuditLogsPage.jsx`
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/admin/auditLogs/AdminAuditLogsPage.test.jsx`

**Interfaces:**
- Consumes: `useAdminAuditLogs(page, action)`, `AUDIT_ACTION_LABELS`, `labelForAction`.
- Produces: dropdown lọc "Tất cả hành động" + các entry của map; cột Hành động hiển thị nhãn VN; dòng `action === 'access.denied'` có badge "Bị chặn" + nền `bg-destructive/5`.

- [ ] **Step 1: Viết test thất bại (bổ sung vào file test hiện có)**

Thêm vào cuối `describe('AdminAuditLogsPage', ...)` trong `AdminAuditLogsPage.test.jsx`:

```js
  it('renders the Vietnamese action label instead of the raw slug', async () => {
    auditLogsApi.getAuditLogs.mockResolvedValue({
      data: [{
        id: 9, user: { id: 1, name: 'Bao Le', email: 'bao@example.com' },
        action: 'access.denied', entity_type: null, entity_id: null,
        old_values: null, new_values: { permission: 'manage_products', method: 'GET', path: 'api/admin/products' },
        ip_address: '127.0.0.1', created_at: '2026-01-10T08:00:00Z',
      }],
      meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 10 } },
    })
    renderPage()

    expect(await screen.findByText('Truy cập bị chặn (403)')).toBeInTheDocument()
    expect(screen.getByText('Bị chặn')).toBeInTheDocument()
  })

  it('filters by action when the dropdown changes', async () => {
    renderPage()
    await screen.findByText('Bao Le')

    await userEvent.selectOptions(
      screen.getByLabelText('Lọc theo hành động'),
      'access.denied',
    )

    await waitFor(() =>
      expect(auditLogsApi.getAuditLogs).toHaveBeenCalledWith(1, 'access.denied'),
    )
  })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npm test -- --run src/pages/admin/auditLogs/AdminAuditLogsPage.test.jsx`
Expected: FAIL (chưa có nhãn VN / badge / dropdown "Lọc theo hành động").

- [ ] **Step 3: Cập nhật trang**

Thay toàn bộ `Nestify-Furniture-e-commerce-frontend/src/pages/admin/auditLogs/AdminAuditLogsPage.jsx`:

```jsx
import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminAuditLogs } from '../../../features/admin/auditLogs/hooks'
import { AUDIT_ACTION_LABELS, labelForAction } from '../../../features/admin/auditLogs/actionLabels'
import { formatDate } from '../../../lib/format'

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const { data, isLoading } = useAdminAuditLogs(page, action)

  const logs = data?.data ?? []
  const meta = data?.meta?.pagination ?? { last_page: 1 }

  function handleActionChange(event) {
    setAction(event.target.value)
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        icon={ScrollText}
        title="Nhật ký hệ thống"
        description="Lịch sử các thao tác quản trị quan trọng."
      />

      <div className="mt-6 flex items-center gap-2">
        <label htmlFor="audit-action-filter" className="text-sm text-muted-foreground">
          Lọc theo hành động
        </label>
        <select
          id="audit-action-filter"
          aria-label="Lọc theo hành động"
          value={action}
          onChange={handleActionChange}
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="">Tất cả hành động</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([slug, label]) => (
            <option key={slug} value={slug}>{label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <Spinner label="Đang tải nhật ký..." />
        ) : logs.length === 0 ? (
          <Card>
            <EmptyState
              illustration="search"
              title="Chưa có nhật ký nào"
              description="Hoạt động quản trị sẽ được ghi lại ở đây."
            />
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const denied = log.action === 'access.denied'
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40 ${denied ? 'bg-destructive/5' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{log.user?.name}</p>
                        <p className="text-muted-foreground">{log.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-foreground">{labelForAction(log.action)}</span>
                        {denied && (
                          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            Bị chặn
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {log.entity_type ? `${log.entity_type} #${log.entity_id}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-foreground">{log.ip_address}</td>
                      <td className="px-4 py-3 text-foreground">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-foreground transition-colors hover:text-accent">Chi tiết</summary>
                          <pre className="mt-2 max-w-xs overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                            {JSON.stringify({ old_values: log.old_values, new_values: log.new_values }, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
      </div>
    </div>
  )
}
```

**Lưu ý test cũ:** test "renders the paginated audit log list" dùng `action: 'update'` (không có trong map) → `labelForAction` trả `'update'`, assertion `getByText('update')` vẫn xanh. Test "requests the next page" đã cập nhật ở Task 3 thành `toHaveBeenCalledWith(2, '')`. Với dòng non-denied, cột Đối tượng cũ là `Product #5` — nhánh `log.entity_type ? ... : '—'` giữ `Product #5`. OK.

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npm test -- --run src/pages/admin/auditLogs/AdminAuditLogsPage.test.jsx`
Expected: PASS (3 test cũ + 2 test mới).

- [ ] **Step 5: Lint + toàn bộ suite FE**

Run: `npm run lint && npm test -- --run`
Expected: lint sạch; toàn bộ suite xanh (không regress).

- [ ] **Step 6: KHÔNG commit** (guardrail).

---

## Self-Review

**Spec coverage:**
- Ghi denial 403 (middleware, try/catch, 401 không ghi, new_values permission/method/path) → Task 1. ✓
- Filter `action` (service + controller, ghép entity_type) → Task 2. ✓
- Nhãn VN + fallback slug → Task 3 (`actionLabels.js`). ✓
- Dropdown lọc + reset trang 1 + cột nhãn VN + tô dòng `access.denied` → Task 4. ✓
- KHÔNG migration/resource/endpoint mới → không task nào đụng (chỉ mở rộng filter). ✓
- Test BE (denial + authorized + unauth; filter action) + FE (label, filter param, denied highlight) → Task 1/2/3/4. ✓

**Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh cụ thể + kỳ vọng. ✓

**Type consistency:**
- `list(?string $entityType, ?string $action = null, int $perPage = 50)` — controller gọi đúng thứ tự `(entity_type, action)`. ✓
- `getAuditLogs(page, action = '')` ↔ `useAdminAuditLogs(page, action = '')` ↔ page gọi `useAdminAuditLogs(page, action)`. ✓
- `labelForAction` / `AUDIT_ACTION_LABELS` dùng nhất quán ở Task 3 (định nghĩa) và Task 4 (tiêu thụ). ✓
- Assertion `getAuditLogs` chữ ký mới `(page, action)` được sửa ở Task 3 (dòng 56) và dùng ở Task 4 test mới. ✓
