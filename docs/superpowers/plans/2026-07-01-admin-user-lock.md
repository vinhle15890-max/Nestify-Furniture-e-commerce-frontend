# Khóa / Mở-khóa người dùng (admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép admin khóa (đình chỉ) và mở-khóa tài khoản khách hàng lẫn nhân viên, tái dùng trạng thái `archived` đã chặn đăng nhập sẵn.

**Architecture:** Thêm 1 endpoint `PATCH /admin/users/{id}/status` (permission `manage_users`) đổi `User.status` giữa `active`/`archived`; khi khóa thì thu hồi token + ghi audit. FE thêm mutation + một component `LockUserButton` (nút + hộp thoại xác nhận + toast) nhúng vào 3 bề mặt admin sẵn có.

**Tech Stack:** BE Laravel 13 (Sanctum, enum cast, FormRequest, AuditLog); FE React 18 + Vite + TanStack Query v5 + Radix Dialog (`Modal`) + Zustand (`authStore`) + Vitest/RTL.

## Global Constraints

- **KHÔNG commit** — chỉ **stage** (`git add`). Quy tắc user: không commit tới khi được yêu cầu. Mọi bước "Stage" dưới đây là `git add`, không `git commit`.
- Tái dùng `User.status` enum `active | archived` — **không migration**, không thêm status mới.
- Nhãn UI cho `archived` = **"Đã khóa"** (đổi từ "Đã lưu trữ" ở mọi nơi chạm tới).
- Login đã chặn `archived` (`AuthService::login` → `ACCOUNT_INACTIVE` 403) — **không** sửa login.
- Endpoint nằm trong nhóm `check.permission:manage_users` (cùng `assignRoles`).
- Guard: (a) không đổi status của **chính mình** → 403 `FORBIDDEN`; (b) không khóa **super_admin active cuối cùng** → 403 `FORBIDDEN`.
- Khi khóa: `$user->tokens()->delete()` (đăng xuất ngay). Audit action `user.lock` / `user.unlock`, hiện bình thường trong admin audit log (KHÔNG thêm vào `BEHAVIORAL_ACTIONS`).
- BE test chạy qua Docker+sqlite: `cd BE/src && docker run --rm --entrypoint sh -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: -e CACHE_STORE=array -v "$PWD":/var/www -w /var/www nestify-furniture-e-commerce-backend-app:latest -c 'php artisan config:clear; php artisan route:clear; php artisan test --filter=X'`.
- FE: `npm test -- --run <file>`; `npm run lint` phải sạch.
- Copy tiếng Việt cho mọi UI; không raw hex, dùng token/`Button` variant sẵn có.

Repos: BE `Nestify-Furniture-e-commerce-backend` (branch `dev`), FE `Nestify-Furniture-e-commerce-frontend` (branch `GiaBao/feat`). Đường dẫn BE dưới đây tính từ `Nestify-Furniture-e-commerce-backend/`, FE từ `Nestify-Furniture-e-commerce-frontend/`.

---

## File Structure

**BE:**
- Create `src/app/Http/Requests/Admin/UpdateUserStatusRequest.php` — validate `status ∈ {active, archived}`.
- Modify `src/app/Services/UserService.php` — thêm `setStatus()` + `guardLastSuperAdminStatus()`.
- Modify `src/app/Http/Controllers/Admin/UserController.php` — thêm `setStatus()`.
- Modify `src/routes/api.php` — thêm route trong nhóm `manage_users`.
- Create `src/tests/Feature/Admin/UserStatusTest.php`.
- Modify `docs/14-workflows.md`, `docs/FE_AI_CONTEXT.md`.

**FE:**
- Modify `src/features/admin/users/api.js` — `updateUserStatus()`.
- Modify `src/features/admin/users/hooks.js` — `useUpdateUserStatus()`.
- Modify `src/features/admin/users/api.test.js` (tạo nếu chưa có).
- Create `src/pages/admin/users/LockUserButton.jsx` + `LockUserButton.test.jsx`.
- Modify `src/pages/admin/users/AdminEmployeesPage.jsx`, `AdminCustomersPage.jsx`, `CustomerDetailDrawer.jsx` — nhúng nút + đổi nhãn badge.
- Modify `docs/FE-TEAM-WORKFLOW.md`.

---

## Task 1: BE — Endpoint khóa/mở-khóa + guard + audit + tests

**Files:**
- Create: `src/app/Http/Requests/Admin/UpdateUserStatusRequest.php`
- Modify: `src/app/Services/UserService.php`
- Modify: `src/app/Http/Controllers/Admin/UserController.php`
- Modify: `src/routes/api.php:154-158`
- Test: `src/tests/Feature/Admin/UserStatusTest.php`
- Docs: `docs/14-workflows.md`, `docs/FE_AI_CONTEXT.md`

**Interfaces:**
- Produces (FE Task 2 relies on this contract):
  - `PATCH /api/admin/users/{id}/status`, body `{ "status": "active" | "archived" }`.
  - 200 → `{ "data": { id, name, email, status, roles, role_ids, email_verified_at } }` (UserResource, `status` = giá trị mới).
  - 403 `{ "error": { "code": "FORBIDDEN", "message": <vi> } }` khi tự-đổi hoặc khóa super_admin cuối.
  - 422 `{ "error": { "code": "VALIDATION_FAILED", ... } }` khi status sai enum/thiếu.
  - 401 khi guest; 403 khi thiếu `manage_users`; 404 khi user không tồn tại.

- [ ] **Step 1: Viết test thất bại — `UserStatusTest.php`**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserStatusTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin    = $this->makeSuperAdmin();
        $this->customer = User::factory()->create(['status' => 'active']);
    }

    /** Actor có quyền manage_users nhưng KHÔNG phải super_admin. */
    private function makeUserManager(): User
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $perm = Permission::firstOrCreate(['slug' => 'manage_users'], ['display_name' => 'Manage Users']);
        $role = Role::create(['name' => 'user_manager', 'display_name' => 'User Manager']);
        $role->permissions()->attach($perm->id);
        $user->roles()->attach($role->id);

        return $user;
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    public function test_admin_can_lock_a_customer(): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$this->customer->id}/status", ['status' => 'archived'])
            ->assertOk()
            ->assertJsonPath('data.id', $this->customer->id)
            ->assertJsonPath('data.status', 'archived');

        $this->assertDatabaseHas('users', ['id' => $this->customer->id, 'status' => 'archived']);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.lock', 'entity_type' => 'user', 'entity_id' => $this->customer->id,
        ]);
    }

    public function test_admin_can_unlock_an_archived_user(): void
    {
        $this->customer->update(['status' => 'archived']);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$this->customer->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('users', ['id' => $this->customer->id, 'status' => 'active']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.unlock', 'entity_id' => $this->customer->id]);
    }

    public function test_admin_can_lock_a_staff_user(): void
    {
        $staffRole = Role::create(['name' => 'order_staff', 'display_name' => 'NV đơn']);
        $staff = User::factory()->create(['status' => 'active']);
        $staff->roles()->attach($staffRole->id);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$staff->id}/status", ['status' => 'archived'])
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');
    }

    public function test_locking_revokes_all_tokens(): void
    {
        $this->customer->createToken('nestify-spa');
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$this->customer->id}/status", ['status' => 'archived'])
            ->assertOk();

        $this->assertSame(0, $this->customer->tokens()->count());
    }

    // ── Guards ────────────────────────────────────────────────────────────────

    public function test_cannot_change_own_status(): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$this->admin->id}/status", ['status' => 'archived'])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');

        $this->assertDatabaseHas('users', ['id' => $this->admin->id, 'status' => 'active']);
    }

    public function test_cannot_lock_last_active_super_admin(): void
    {
        // $this->admin là super_admin DUY NHẤT; actor là user_manager (không super_admin).
        $manager = $this->makeUserManager();

        $this->actingAs($manager)
            ->patchJson("/api/admin/users/{$this->admin->id}/status", ['status' => 'archived'])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');

        $this->assertDatabaseHas('users', ['id' => $this->admin->id, 'status' => 'active']);
    }

    public function test_can_lock_a_super_admin_when_another_active_one_exists(): void
    {
        $manager     = $this->makeUserManager();
        $secondSuper = $this->makeSuperAdmin(); // giờ có 2 super_admin active

        $this->actingAs($manager)
            ->patchJson("/api/admin/users/{$secondSuper->id}/status", ['status' => 'archived'])
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');
    }

    // ── AuthZ / AuthN ───────────────────────────────────────────────────────────

    public function test_guest_cannot_change_status(): void
    {
        $this->patchJson("/api/admin/users/{$this->customer->id}/status", ['status' => 'archived'])
            ->assertUnauthorized();
    }

    public function test_user_without_permission_cannot_change_status(): void
    {
        $plain = User::factory()->create();

        $this->actingAs($plain)
            ->patchJson("/api/admin/users/{$this->customer->id}/status", ['status' => 'archived'])
            ->assertForbidden();
    }

    // ── Validation / not found ────────────────────────────────────────────────

    public function test_status_must_be_valid_enum(): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$this->customer->id}/status", ['status' => 'banned'])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_status_is_required(): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$this->customer->id}/status", [])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_user_not_found(): void
    {
        $this->actingAs($this->admin)
            ->patchJson('/api/admin/users/999999/status', ['status' => 'archived'])
            ->assertNotFound();
    }
}
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `cd Nestify-Furniture-e-commerce-backend/src && docker run --rm --entrypoint sh -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: -e CACHE_STORE=array -v "$PWD":/var/www -w /var/www nestify-furniture-e-commerce-backend-app:latest -c 'php artisan config:clear; php artisan route:clear; php artisan test --filter=UserStatusTest'`
Expected: FAIL — route `users/{id}/status` chưa tồn tại → 404/405 ở các test.

- [ ] **Step 3: Tạo FormRequest `UpdateUserStatusRequest.php`**

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\UserStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(UserStatus::class)],
        ];
    }
}
```

- [ ] **Step 4: Thêm `setStatus()` + guard vào `UserService.php`**

Thêm `use App\Enums\UserStatus;` ở đầu file (cùng khối `use`). Thêm 2 method vào class `UserService` (sau `assignRoles`):

```php
    /**
     * Khóa (archived) / mở-khóa (active) một tài khoản.
     * Khóa: thu hồi toàn bộ token để phiên đang đăng nhập chết ngay.
     *
     * @throws ForbiddenException
     */
    public function setStatus(User $user, UserStatus $status): User
    {
        Log::info('[User] setStatus', ['user_id' => $user->id, 'status' => $status->value]);

        if (auth()->id() === $user->id) {
            throw new ForbiddenException('Không thể thay đổi trạng thái tài khoản của chính bạn.');
        }

        $this->guardLastSuperAdminStatus($user, $status);

        return DB::transaction(function () use ($user, $status) {
            $old = $user->status;

            $user->status = $status;
            $user->save();

            if ($status === UserStatus::Archived) {
                $user->tokens()->delete();
            }

            AuditLog::create([
                'user_id'     => auth()->id(),
                'action'      => $status === UserStatus::Archived ? 'user.lock' : 'user.unlock',
                'entity_type' => 'user',
                'entity_id'   => $user->id,
                'old_values'  => ['status' => $old->value],
                'new_values'  => ['status' => $status->value],
                'ip_address'  => request()->ip(),
            ]);

            return $user->fresh()->load('roles');
        });
    }

    /**
     * Chặn khóa super_admin active cuối cùng — nếu không sẽ không còn ai quản trị.
     *
     * @throws ForbiddenException
     */
    private function guardLastSuperAdminStatus(User $user, UserStatus $status): void
    {
        if ($status !== UserStatus::Archived) {
            return;
        }

        $superAdmin = Role::where('name', 'super_admin')->first();
        if (! $superAdmin) {
            return;
        }

        $targetIsSuperAdmin = $user->roles()->where('roles.id', $superAdmin->id)->exists();
        if (! $targetIsSuperAdmin) {
            return;
        }

        $otherActiveSuperAdmins = $superAdmin->users()
            ->where('users.id', '!=', $user->id)
            ->where('users.status', UserStatus::Active)
            ->count();

        if ($otherActiveSuperAdmins === 0) {
            throw new ForbiddenException('Không thể khóa super admin cuối cùng còn hoạt động.');
        }
    }
```

- [ ] **Step 5: Thêm `setStatus()` vào `UserController.php`**

Thêm `use App\Enums\UserStatus;` và `use App\Http\Requests\Admin\UpdateUserStatusRequest;` ở đầu file. Thêm method sau `assignRoles`:

```php
    public function setStatus(UpdateUserStatusRequest $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $user = $this->service->setStatus($user, UserStatus::from($request->validated('status')));

        return response()->json(['data' => new UserResource($user)]);
    }
```

- [ ] **Step 6: Thêm route vào `api.php`**

Trong nhóm `Route::middleware('check.permission:manage_users')->group(...)` (hiện có `get users`, `get roles`, `patch users/{id}/roles`), thêm:

```php
        Route::patch('users/{id}/status', [UserController::class, 'setStatus']);
```

- [ ] **Step 7: Chạy test — kỳ vọng PASS**

Run: `cd Nestify-Furniture-e-commerce-backend/src && docker run --rm --entrypoint sh -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: -e CACHE_STORE=array -v "$PWD":/var/www -w /var/www nestify-furniture-e-commerce-backend-app:latest -c 'php artisan config:clear; php artisan route:clear; php artisan test --filter=UserStatusTest'`
Expected: PASS — 12/12, output sạch.

- [ ] **Step 8: Cập nhật docs BE**

Trong `docs/14-workflows.md` thêm mục workflow khóa người dùng: `PATCH /admin/users/{id}/status` (perm `manage_users`) đổi `active↔archived`; khóa = thu hồi token (đăng xuất ngay) + login bị chặn (`ACCOUNT_INACTIVE`); guard tự-khóa + super_admin cuối; audit `user.lock`/`user.unlock`.
Trong `docs/FE_AI_CONTEXT.md` thêm endpoint: request `{status:'active'|'archived'}`, response `{data: UserResource}`, lỗi 403 `FORBIDDEN` (tự-khóa / super_admin cuối), 422 `VALIDATION_FAILED`.

- [ ] **Step 9: Stage (KHÔNG commit)**

```bash
cd Nestify-Furniture-e-commerce-backend && git add -A src/app src/routes src/tests docs/14-workflows.md docs/FE_AI_CONTEXT.md
```

---

## Task 2: FE — API call + hook

**Files:**
- Modify: `src/features/admin/users/api.js`
- Modify: `src/features/admin/users/hooks.js`
- Test: `src/features/admin/users/api.test.js` (tạo nếu chưa có)

**Interfaces:**
- Consumes: endpoint từ Task 1 (`PATCH /admin/users/{id}/status`).
- Produces (Task 3 dùng):
  - `updateUserStatus(id, status)` → Promise (response body `{data: user}`).
  - `useUpdateUserStatus()` → mutation; `mutate/mutateAsync({ id, status })`; `onSuccess` invalidate `['admin','users']`.

- [ ] **Step 1: Viết test thất bại — `api.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateUserStatus } from './api'
import { apiClient } from '../../../lib/apiClient'

vi.mock('../../../lib/apiClient', () => ({
  apiClient: { patch: vi.fn(() => Promise.resolve({ data: {} })) },
}))

describe('admin users api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updateUserStatus PATCHes the status endpoint with the new status', () => {
    updateUserStatus(7, 'archived')
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/7/status', { status: 'archived' })
  })
})
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run src/features/admin/users/api.test.js`
Expected: FAIL — `updateUserStatus` chưa export.

- [ ] **Step 3: Thêm `updateUserStatus` vào `api.js`**

Thêm vào cuối `src/features/admin/users/api.js`:

```js
export function updateUserStatus(id, status) {
  return apiClient.patch(`/admin/users/${id}/status`, { status })
}
```

- [ ] **Step 4: Thêm `useUpdateUserStatus` vào `hooks.js`**

Thêm vào cuối `src/features/admin/users/hooks.js`:

```js
export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) => usersApi.updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
```

- [ ] **Step 5: Chạy test — kỳ vọng PASS**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run src/features/admin/users/api.test.js`
Expected: PASS.

- [ ] **Step 6: Stage (KHÔNG commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/features/admin/users/api.js src/features/admin/users/hooks.js src/features/admin/users/api.test.js
```

---

## Task 3: FE — `LockUserButton` (nút + xác nhận + toast)

**Files:**
- Create: `src/pages/admin/users/LockUserButton.jsx`
- Test: `src/pages/admin/users/LockUserButton.test.jsx`

**Interfaces:**
- Consumes: `useUpdateUserStatus` (Task 2); `Modal`, `Button`, `useToastStore`, `useAuthStore`.
- Produces (Task 4 dùng): `<LockUserButton user={user} />` — render nút "Khóa"/"Mở khóa"; **render null** nếu `user.id === currentUser.id`.

- [ ] **Step 1: Viết test thất bại — `LockUserButton.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LockUserButton } from './LockUserButton'

const mutateAsync = vi.fn(() => Promise.resolve())
vi.mock('../../../features/admin/users/hooks', () => ({
  useUpdateUserStatus: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('../../../store/toastStore', () => ({
  useToastStore: (selector) => selector({ addToast: vi.fn() }),
}))
let currentUserId = 1
vi.mock('../../../store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: currentUserId } }),
}))

describe('LockUserButton', () => {
  beforeEach(() => {
    mutateAsync.mockClear()
    currentUserId = 1
  })

  it('shows "Khóa" for an active user', () => {
    render(<LockUserButton user={{ id: 2, name: 'A', email: 'a@x.vn', status: 'active' }} />)
    expect(screen.getByRole('button', { name: 'Khóa' })).toBeInTheDocument()
  })

  it('shows "Mở khóa" for an archived user', () => {
    render(<LockUserButton user={{ id: 2, name: 'A', email: 'a@x.vn', status: 'archived' }} />)
    expect(screen.getByRole('button', { name: 'Mở khóa' })).toBeInTheDocument()
  })

  it('renders nothing on the current user\'s own row', () => {
    const { container } = render(
      <LockUserButton user={{ id: 1, name: 'Me', email: 'me@x.vn', status: 'active' }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('confirming a lock calls the mutation with archived', async () => {
    render(<LockUserButton user={{ id: 2, name: 'A', email: 'a@x.vn', status: 'active' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Khóa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận khóa' }))
    expect(mutateAsync).toHaveBeenCalledWith({ id: 2, status: 'archived' })
  })
})
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run src/pages/admin/users/LockUserButton.test.jsx`
Expected: FAIL — file `LockUserButton.jsx` chưa tồn tại.

- [ ] **Step 3: Tạo `LockUserButton.jsx`**

```jsx
import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { useUpdateUserStatus } from '../../../features/admin/users/hooks'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'

// Nút khóa/mở-khóa một tài khoản + hộp thoại xác nhận. Ẩn trên hàng của chính
// người đang đăng nhập (BE cũng chặn tự-đổi-status, đây là lớp bảo vệ UX).
export function LockUserButton({ user }) {
  const currentUser = useAuthStore((state) => state.user)
  const updateStatus = useUpdateUserStatus()
  const addToast = useToastStore((state) => state.addToast)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (currentUser && user.id === currentUser.id) return null

  const isLocked = user.status === 'archived'
  const nextStatus = isLocked ? 'active' : 'archived'

  async function handleConfirm() {
    try {
      await updateStatus.mutateAsync({ id: user.id, status: nextStatus })
      addToast({ title: isLocked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.', variant: 'success' })
      setConfirmOpen(false)
    } catch (err) {
      addToast({ title: err.message, variant: 'error' })
    }
  }

  return (
    <>
      <Button
        variant={isLocked ? 'secondary' : 'destructive'}
        className="px-3 py-1.5"
        onClick={() => setConfirmOpen(true)}
      >
        {isLocked ? <LockOpen size={14} /> : <Lock size={14} />}
        {isLocked ? 'Mở khóa' : 'Khóa'}
      </Button>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        description={`${user.name} · ${user.email}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {isLocked
              ? 'Tài khoản sẽ đăng nhập lại được bình thường.'
              : 'Người dùng sẽ bị đăng xuất ngay và không thể đăng nhập cho tới khi được mở khóa.'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Hủy
            </Button>
            <Button
              variant={isLocked ? 'primary' : 'destructive'}
              onClick={handleConfirm}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending
                ? 'Đang xử lý...'
                : isLocked
                  ? 'Xác nhận mở khóa'
                  : 'Xác nhận khóa'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 4: Chạy test — kỳ vọng PASS**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run src/pages/admin/users/LockUserButton.test.jsx`
Expected: PASS — 4/4.

- [ ] **Step 5: Stage (KHÔNG commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/pages/admin/users/LockUserButton.jsx src/pages/admin/users/LockUserButton.test.jsx
```

---

## Task 4: FE — Nhúng nút vào 3 bề mặt + đổi nhãn badge + docs

**Files:**
- Modify: `src/pages/admin/users/AdminEmployeesPage.jsx:142-157`
- Modify: `src/pages/admin/users/AdminCustomersPage.jsx:85-101`
- Modify: `src/pages/admin/users/CustomerDetailDrawer.jsx:42-46,71-76`
- Test: `src/pages/admin/users/AdminEmployeesPage.test.jsx`
- Docs: `docs/FE-TEAM-WORKFLOW.md`

**Interfaces:**
- Consumes: `<LockUserButton user={user} />` (Task 3).

- [ ] **Step 1: Viết test thất bại — bổ sung `AdminEmployeesPage.test.jsx`**

Mở `src/pages/admin/users/AdminEmployeesPage.test.jsx`. Đảm bảo `useUpdateUserStatus`, `useToastStore`, `useAuthStore` được mock (nếu test dùng mock module cho `hooks`, thêm `useUpdateUserStatus: () => ({ mutateAsync: vi.fn(), isPending: false })` vào mock; mock `authStore` trả `user:{id: 999}` để nút KHÔNG bị ẩn). Thêm test:

```jsx
it('renders a lock action for each staff row', async () => {
  // (dùng cùng render helper + dữ liệu staff active như các test hiện có trong file)
  expect(await screen.findAllByRole('button', { name: 'Khóa' })).not.toHaveLength(0)
})

it('shows "Đã khóa" badge for an archived staff user', async () => {
  // render với 1 user status='archived'
  expect(await screen.findByText('Đã khóa')).toBeInTheDocument()
})
```

> Lưu ý cho implementer: đọc phần mock/render sẵn có ở đầu `AdminEmployeesPage.test.jsx` và tái dùng đúng cơ chế đó (cùng `queryClient`/`renderWithProviders`, cùng cách mock `useAdminUsers`). Thêm mock cho 3 store/hook mới để component render được.

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run src/pages/admin/users/AdminEmployeesPage.test.jsx`
Expected: FAIL — chưa có nút "Khóa"; badge còn "Đã lưu trữ".

- [ ] **Step 3: `AdminEmployeesPage.jsx` — thêm nút + đổi badge**

Thêm import ở đầu: `import { LockUserButton } from './LockUserButton'`.
Đổi ô badge (dòng ~142-144) từ `'Đã lưu trữ'` → `'Đã khóa'`:

```jsx
                      <Badge tone={user.status === 'active' ? 'in-stock' : 'neutral'}>
                        {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
```

Đổi ô thao tác (dòng ~153-157) để có cả 2 nút:

```jsx
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" className="px-3 py-1.5" onClick={() => setEditingUser(user)}>
                          Phân quyền
                        </Button>
                        <LockUserButton user={user} />
                      </div>
                    </td>
```

- [ ] **Step 4: `AdminCustomersPage.jsx` — thêm nút + đổi badge**

Thêm import: `import { LockUserButton } from './LockUserButton'`.
Đổi badge (dòng ~86-88) → `'Đã khóa'`:

```jsx
                      <Badge tone={user.status === 'active' ? 'in-stock' : 'neutral'}>
                        {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
```

Đổi ô thao tác (dòng ~97-101):

```jsx
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" className="px-3 py-1.5" onClick={() => setDetailUser(user)}>
                          Chi tiết
                        </Button>
                        <LockUserButton user={user} />
                      </div>
                    </td>
```

- [ ] **Step 5: `CustomerDetailDrawer.jsx` — thêm nút + đổi badge**

Thêm import: `import { LockUserButton } from './LockUserButton'`.
Đổi badge trạng thái (dòng ~43-45) → `'Đã khóa'`:

```jsx
                <Badge tone={user.status === 'active' ? 'in-stock' : 'neutral'}>
                  {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                </Badge>
```

Đổi footer (dòng ~71-76) để có cả nút khóa:

```jsx
          <div className="flex flex-col gap-2 border-t border-border px-6 py-5">
            <Button onClick={() => onPromote(user)} className="w-full gap-2">
              <UserCog size={16} />
              Thăng thành nhân viên
            </Button>
            {user && <LockUserButton user={user} />}
          </div>
```

- [ ] **Step 6: Chạy test + lint**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run src/pages/admin/users/AdminEmployeesPage.test.jsx src/pages/admin/users/AdminCustomersPage.test.jsx && npm run lint`
Expected: PASS + lint sạch. Nếu `AdminCustomersPage.test.jsx` vỡ do thiếu mock 3 store/hook mới, thêm mock tương tự Step 1.

- [ ] **Step 7: Chạy full suite FE — bảo đảm không hồi quy**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm test -- --run`
Expected: toàn bộ PASS.

- [ ] **Step 8: Cập nhật `docs/FE-TEAM-WORKFLOW.md`**

Thêm mục "Khóa/Mở-khóa người dùng (admin)": nút `LockUserButton` ở bảng Nhân viên, bảng Khách hàng, drawer chi tiết; xác nhận qua `Modal`; ẩn trên hàng của chính mình; khóa → toast + user bị đăng xuất; badge `archived` = "Đã khóa"; gọi `PATCH /admin/users/{id}/status`.

- [ ] **Step 9: Stage (KHÔNG commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/pages/admin/users docs/FE-TEAM-WORKFLOW.md
```

---

## Self-Review (đã rà)

- **Spec coverage:** phạm vi (customer+staff) → Task 1 test lock customer & staff; mô hình archived → Task 1; workflow xác nhận+đăng xuất+audit → Task 1 (token/audit) + Task 3 (Modal xác nhận); guard tự-khóa + super_admin cuối → Task 1; endpoint → Task 1; FE api/hook/nút/3 bề mặt/badge → Task 2-4; docs → Task 1 (BE) + Task 4 (FE). Không thấy khoảng trống.
- **Placeholder:** không có TODO/TBD; code đầy đủ ở mọi bước (test AdminEmployeesPage Step 1 cố ý ủy quyền cho implementer tái dùng mock/render helper sẵn có của file đó — đã ghi rõ hướng dẫn thay vì bịa render harness).
- **Type/tên nhất quán:** `updateUserStatus(id, status)` / `useUpdateUserStatus()` / mutation payload `{ id, status }` / `setStatus(User, UserStatus)` / action `user.lock`/`user.unlock` / nút label "Khóa"/"Mở khóa" + "Xác nhận khóa"/"Xác nhận mở khóa" — dùng đồng nhất giữa các task.
- **Login không đổi:** guard `ACCOUNT_INACTIVE` đã có test ở `LoginTest`; không lặp lại (YAGNI).
