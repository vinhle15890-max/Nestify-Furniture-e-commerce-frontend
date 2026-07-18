# RBAC — Quản lý role động (SP2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin tạo/sửa/xoá role và tinh chỉnh tập permission ngay trên UI (không sửa seeder), với guard cho role hệ thống và role đang dùng.

**Architecture:** BE thêm `GET /admin/permissions`, mở rộng `RoleResource`, và `RoleController` store/update/destroy qua `RoleService` mới (audit + guard). FE thêm feature `roles` (api/hooks) + trang `/admin/roles` (list + `RoleFormDialog` ma trận permission) + nav "Vai trò". Seeder chuyển "chỉ tạo nếu vắng" để UI thành nguồn chân lý. Tất cả gate dưới `manage_users` (SP1).

**Tech Stack:** BE Laravel 13 + PostgreSQL (test Docker sqlite). FE React 18 (JSX no-TS), react-router-dom v6, TanStack Query v5, zustand, Tailwind v4 semantic tokens, Vitest + RTL.

## Global Constraints

- **KHÔNG commit** (guardrail): plan bỏ mọi bước `git commit`; mỗi task kết thúc bằng suite xanh, working tree uncommitted.
- **KHÔNG có migration** — dùng bảng `roles`/`role_permission`/`user_role` sẵn có. User vẫn là người chạy seeder trên prod.
- `cloudinary_id`/`preview_public_id` không serialize — không đụng, giữ nếp.
- BE là nguồn enforce chân lý; role CRUD gate dưới `check.permission:manage_users` (KHÔNG thêm permission mới).
- `super_admin` + `customer` **hard-lock** (không sửa/xoá/đổi tên); `locked` = `name ∈ {super_admin, customer}`.
- Xoá role đang gán → **409 `ROLE_IN_USE`** (`details.users_count`). Sửa/xoá role locked → **403 `FORBIDDEN`**.
- `name` role **bất biến sau khi tạo**; tạo mới auto = `Str::slug(display_name, '_')`, unique (trùng → 422 field `name`).
- FE: plain JS (JSX), không TypeScript; không thêm dependency; semantic token; admin theme `[data-theme='legacy']`; copy VN. Lỗi surface qua `ApiError` (message VN).
- BE test Docker sqlite: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=<Class>`.
- FE test: `npm test -- --run <path>`; cuối mỗi FE task chạy `npm run lint`.
- Envelope lỗi validation: `error.details.fields.<field>` (Laravel 422 chuẩn của dự án).

---

## File Structure

- **BE** (dưới `Nestify-Furniture-e-commerce-backend/src/`)
  - Create `app/Http/Resources/PermissionResource.php`; Create `app/Http/Controllers/Admin/PermissionController.php`.
  - Modify `app/Http/Resources/RoleResource.php` (permissions/users_count/locked); Modify `app/Http/Controllers/Admin/RoleController.php` (index eager-load + store/update/destroy).
  - Create `app/Services/RoleService.php`; Create `app/Http/Requests/Admin/StoreRoleRequest.php` + `UpdateRoleRequest.php`; Create `app/Exceptions/RoleInUseException.php`.
  - Modify `bootstrap/app.php` (render RoleInUseException → 409); Modify `routes/api.php` (permissions + roles store/update/destroy).
  - Modify `database/seeders/RolePermissionSeeder.php` (job roles create-if-absent).
  - Tests under `tests/Feature/Admin/`.
- **FE** (dưới `Nestify-Furniture-e-commerce-frontend/`)
  - Create `src/features/admin/roles/api.js` + `hooks.js` (+ `api.test.js`).
  - Create `src/pages/admin/roles/RoleFormDialog.jsx` (+ test); Create `src/pages/admin/roles/AdminRolesPage.jsx` (+ test).
  - Modify `src/pages/admin/adminNav.js` (nav "Vai trò"); Modify `src/app/router.jsx` (route).

---

## Task 1: BE — `GET /admin/permissions`

**Files:**
- Create: `app/Http/Resources/PermissionResource.php`
- Create: `app/Http/Controllers/Admin/PermissionController.php`
- Modify: `routes/api.php` (nhóm `check.permission:manage_users`, dòng ~178-183)
- Test: `tests/Feature/Admin/PermissionListTest.php` (create)

**Interfaces:**
- Produces: `GET /api/admin/permissions` → `{ data: [{ slug, display_name }] }` (sort theo slug), gate `manage_users`.

- [ ] **Step 1: Viết test thất bại**

Create `src/tests/Feature/Admin/PermissionListTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionListTest extends TestCase
{
    use RefreshDatabase;

    private function userWithPermission(string $slug): User
    {
        $role = Role::create(['name' => 'perm_manager', 'display_name' => 'PM']);
        $permission = Permission::firstOrCreate(['slug' => $slug], ['display_name' => $slug]);
        $role->permissions()->attach($permission->id);
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_lists_permissions_for_a_user_manager(): void
    {
        Permission::firstOrCreate(['slug' => 'manage_orders'], ['display_name' => 'Manage Orders']);
        $user = $this->userWithPermission('manage_users');

        $this->actingAs($user)->getJson('/api/admin/permissions')
            ->assertOk()
            ->assertJsonStructure(['data' => [['slug', 'display_name']]])
            ->assertJsonFragment(['slug' => 'manage_orders']);
    }

    public function test_forbidden_without_manage_users(): void
    {
        $user = $this->userWithPermission('manage_orders');

        $this->actingAs($user)->getJson('/api/admin/permissions')->assertStatus(403);
    }
}
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=PermissionListTest`
Expected: FAIL — route/controller chưa tồn tại (404/500).

- [ ] **Step 3: Tạo `PermissionResource`**

Create `src/app/Http/Resources/PermissionResource.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PermissionResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'slug'         => $this->slug,
            'display_name' => $this->display_name,
        ];
    }
}
```

- [ ] **Step 4: Tạo `PermissionController`**

Create `src/app/Http/Controllers/Admin/PermissionController.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    /**
     * GET /api/admin/permissions — the full permission catalogue for the role
     * editor's checkbox matrix. Behind manage_users (same as role management).
     */
    public function index(): JsonResponse
    {
        $permissions = Permission::orderBy('slug')->get();

        return response()->json(['data' => PermissionResource::collection($permissions)]);
    }
}
```

- [ ] **Step 5: Thêm route**

Trong `src/routes/api.php`, nhóm `Route::middleware('check.permission:manage_users')->group(...)` (cạnh `Route::get('roles', ...)`), thêm dòng:

```php
        Route::get('permissions', [\App\Http\Controllers\Admin\PermissionController::class, 'index']);
```

(hoặc thêm `use App\Http\Controllers\Admin\PermissionController;` ở đầu file và dùng `[PermissionController::class, 'index']` cho khớp style import sẵn có.)

- [ ] **Step 6: Chạy — kỳ vọng PASS**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=PermissionListTest`
Expected: PASS (2 test). (KHÔNG commit.)

---

## Task 2: BE — mở rộng `RoleResource` + `RoleController::index`

**Files:**
- Modify: `app/Http/Resources/RoleResource.php`
- Modify: `app/Http/Controllers/Admin/RoleController.php` (method `index`)
- Test: `tests/Feature/Admin/RoleResourceTest.php` (create)

**Interfaces:**
- Produces: `GET /api/admin/roles` → mỗi role có `{ id, name, display_name, locked, permissions: string[], users_count: int }`. `locked=true` cho super_admin & customer.

- [ ] **Step 1: Viết test thất bại**

Create `src/tests/Feature/Admin/RoleResourceTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleResourceTest extends TestCase
{
    use RefreshDatabase;

    private function userManager(): User
    {
        $role = Role::create(['name' => 'um', 'display_name' => 'UM']);
        $perm = Permission::firstOrCreate(['slug' => 'manage_users'], ['display_name' => 'Manage Users']);
        $role->permissions()->attach($perm->id);
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_index_serializes_permissions_count_and_locked(): void
    {
        $manageOrders = Permission::firstOrCreate(['slug' => 'manage_orders'], ['display_name' => 'Manage Orders']);
        Role::create(['name' => 'super_admin', 'display_name' => 'Super Admin']);
        $staff = Role::create(['name' => 'order_staff', 'display_name' => 'Order Staff']);
        $staff->permissions()->attach($manageOrders->id);
        $holder = User::factory()->create(['email_verified_at' => now()]);
        $holder->roles()->attach($staff->id);

        $data = $this->actingAs($this->userManager())->getJson('/api/admin/roles')
            ->assertOk()
            ->json('data');

        $byName = collect($data)->keyBy('name');
        $this->assertTrue($byName['super_admin']['locked']);
        $this->assertFalse($byName['order_staff']['locked']);
        $this->assertContains('manage_orders', $byName['order_staff']['permissions']);
        $this->assertSame(1, $byName['order_staff']['users_count']);
    }
}
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=RoleResourceTest`
Expected: FAIL — thiếu `locked`/`permissions`/`users_count`.

- [ ] **Step 3: Mở rộng `RoleResource`**

Sửa `src/app/Http/Resources/RoleResource.php` — thay `toArray`:

```php
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'display_name' => $this->display_name,
            // Structural roles the code keys on by name — never editable/deletable.
            'locked'       => in_array($this->name, ['super_admin', 'customer'], true),
            'permissions'  => $this->whenLoaded('permissions', fn () => $this->permissions->pluck('slug')),
            'users_count'  => $this->whenCounted('users'),
        ];
    }
```

- [ ] **Step 4: `RoleController::index` eager-load**

Sửa `src/app/Http/Controllers/Admin/RoleController.php` method `index`, đổi:

```php
        $roles = Role::withCount('users')->with('permissions')->orderBy('id')->get();
```

- [ ] **Step 5: Chạy — kỳ vọng PASS**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=RoleResourceTest`
Expected: PASS. (KHÔNG commit.)

---

## Task 3: BE — Role CRUD (`RoleService` + requests + exception + controller + routes)

**Files:**
- Create: `app/Exceptions/RoleInUseException.php`
- Modify: `bootstrap/app.php` (import + render 409)
- Create: `app/Http/Requests/Admin/StoreRoleRequest.php`
- Create: `app/Http/Requests/Admin/UpdateRoleRequest.php`
- Create: `app/Services/RoleService.php`
- Modify: `app/Http/Controllers/Admin/RoleController.php` (store/update/destroy + constructor)
- Modify: `routes/api.php` (roles store/update/destroy)
- Test: `tests/Feature/Admin/RoleCrudTest.php` (create)

**Interfaces:**
- Consumes: `RoleResource` (Task 2).
- Produces:
  - `POST /api/admin/roles` body `{ display_name, permissions?: string[] }` → 201 `{ data: RoleResource }`; slug trùng → 422 field `name`.
  - `PATCH /api/admin/roles/{role}` body `{ display_name, permissions?: string[] }` → 200; role locked → 403.
  - `DELETE /api/admin/roles/{role}` → 204; locked → 403; đang gán → 409 `ROLE_IN_USE` (`details.users_count`).
  - `RoleService::create(string $name, string $displayName, array $slugs): Role`, `update(Role, string, array): Role`, `delete(Role): void`.

- [ ] **Step 1: Viết test thất bại**

Create `src/tests/Feature/Admin/RoleCrudTest.php`:

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

class RoleCrudTest extends TestCase
{
    use RefreshDatabase;

    private function userManager(): User
    {
        $role = Role::create(['name' => 'um', 'display_name' => 'UM']);
        $perm = Permission::firstOrCreate(['slug' => 'manage_users'], ['display_name' => 'Manage Users']);
        $role->permissions()->attach($perm->id);
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_creates_role_with_slugified_name_and_syncs_permissions(): void
    {
        Permission::firstOrCreate(['slug' => 'manage_orders'], ['display_name' => 'Manage Orders']);

        $res = $this->actingAs($this->userManager())->postJson('/api/admin/roles', [
            'display_name' => 'Nhân viên kho',
            'permissions'  => ['manage_orders'],
        ])->assertCreated();

        $this->assertSame('nhan_vien_kho', $res->json('data.name'));
        $this->assertContains('manage_orders', $res->json('data.permissions'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'role.create']);
    }

    public function test_duplicate_name_returns_422(): void
    {
        Role::create(['name' => 'nhan_vien_kho', 'display_name' => 'Cũ']);

        $this->actingAs($this->userManager())->postJson('/api/admin/roles', [
            'display_name' => 'Nhân viên kho',
            'permissions'  => [],
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_updates_display_name_and_permissions_but_not_name(): void
    {
        $manageOrders = Permission::firstOrCreate(['slug' => 'manage_orders'], ['display_name' => 'MO']);
        $viewDash = Permission::firstOrCreate(['slug' => 'view_dashboard'], ['display_name' => 'VD']);
        $role = Role::create(['name' => 'order_staff', 'display_name' => 'Cũ']);
        $role->permissions()->attach($manageOrders->id);

        $res = $this->actingAs($this->userManager())->patchJson("/api/admin/roles/{$role->id}", [
            'display_name' => 'Nhân viên đơn',
            'permissions'  => ['view_dashboard'],
        ])->assertOk();

        $this->assertSame('order_staff', $res->json('data.name'));
        $this->assertSame('Nhân viên đơn', $res->json('data.display_name'));
        $this->assertSame(['view_dashboard'], $res->json('data.permissions'));
    }

    public function test_cannot_update_locked_role(): void
    {
        $role = Role::create(['name' => 'super_admin', 'display_name' => 'Super Admin']);

        $this->actingAs($this->userManager())->patchJson("/api/admin/roles/{$role->id}", [
            'display_name' => 'Hack',
            'permissions'  => [],
        ])->assertStatus(403);
    }

    public function test_deletes_unused_role(): void
    {
        $role = Role::create(['name' => 'temp', 'display_name' => 'Temp']);

        $this->actingAs($this->userManager())->deleteJson("/api/admin/roles/{$role->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'role.delete']);
    }

    public function test_cannot_delete_role_in_use_returns_409(): void
    {
        $role = Role::create(['name' => 'temp', 'display_name' => 'Temp']);
        $holder = User::factory()->create(['email_verified_at' => now()]);
        $holder->roles()->attach($role->id);

        $this->actingAs($this->userManager())->deleteJson("/api/admin/roles/{$role->id}")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'ROLE_IN_USE')
            ->assertJsonPath('error.details.users_count', 1);
    }

    public function test_cannot_delete_locked_role(): void
    {
        $role = Role::create(['name' => 'customer', 'display_name' => 'Customer']);

        $this->actingAs($this->userManager())->deleteJson("/api/admin/roles/{$role->id}")
            ->assertStatus(403);
    }
}
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=RoleCrudTest`
Expected: FAIL — route/controller/service chưa có.

- [ ] **Step 3: Tạo `RoleInUseException` + render 409**

Create `src/app/Exceptions/RoleInUseException.php`:

```php
<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * Thrown by {@see \App\Services\RoleService::delete()} when the role is still
 * assigned to at least one user. Controller-agnostic — rendered to 409 in
 * bootstrap/app.php (mirrors MediaInUseException).
 */
class RoleInUseException extends \RuntimeException
{
    public function __construct(public readonly int $usageCount)
    {
        parent::__construct("Role is assigned to {$usageCount} user(s).");
    }
}
```

Sửa `src/bootstrap/app.php`:
- Thêm import cạnh các `use App\Exceptions\...`: `use App\Exceptions\RoleInUseException;`
- Trong `->withExceptions(function (Exceptions $exceptions) { ... }`, thêm một render (cạnh render `ForbiddenException`):

```php
        $exceptions->render(function (RoleInUseException $e): JsonResponse {
            return response()->json(['error' => ['code' => 'ROLE_IN_USE', 'message' => 'Không thể xoá vai trò đang được gán. Hãy gỡ vai trò khỏi tất cả nhân viên trước.', 'details' => ['users_count' => $e->usageCount]]], 409);
        });
```

- [ ] **Step 4: Tạo FormRequests**

Create `src/app/Http/Requests/Admin/StoreRoleRequest.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    // Derive the immutable machine name from the display name, then validate its
    // uniqueness through the normal rules() path (avoids the withValidator/addRules
    // antipattern). Vietnamese diacritics are ASCII-folded by Str::slug.
    protected function prepareForValidation(): void
    {
        $this->merge(['name' => Str::slug((string) $this->input('display_name'), '_')]);
    }

    public function rules(): array
    {
        return [
            'display_name'  => ['required', 'string', 'max:255'],
            'name'          => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions'   => ['array'],
            'permissions.*' => ['string', 'exists:permissions,slug'],
        ];
    }
}
```

Create `src/app/Http/Requests/Admin/UpdateRoleRequest.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    // name is immutable on update — only display_name + permission set change.
    public function rules(): array
    {
        return [
            'display_name'  => ['required', 'string', 'max:255'],
            'permissions'   => ['array'],
            'permissions.*' => ['string', 'exists:permissions,slug'],
        ];
    }
}
```

- [ ] **Step 5: Tạo `RoleService`**

Create `src/app/Services/RoleService.php`:

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ForbiddenException;
use App\Exceptions\RoleInUseException;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class RoleService
{
    private const LOCKED = ['super_admin', 'customer'];

    public function create(string $name, string $displayName, array $permissionSlugs): Role
    {
        return DB::transaction(function () use ($name, $displayName, $permissionSlugs) {
            $role = Role::create(['name' => $name, 'display_name' => $displayName]);
            $role->permissions()->sync($this->permissionIds($permissionSlugs));

            $this->audit('role.create', $role, [], [
                'name' => $name, 'display_name' => $displayName, 'permissions' => array_values($permissionSlugs),
            ]);

            return $role->load('permissions');
        });
    }

    public function update(Role $role, string $displayName, array $permissionSlugs): Role
    {
        $this->assertMutable($role);

        return DB::transaction(function () use ($role, $displayName, $permissionSlugs) {
            $old = ['display_name' => $role->display_name, 'permissions' => $role->permissions->pluck('slug')->all()];

            $role->update(['display_name' => $displayName]);
            $role->permissions()->sync($this->permissionIds($permissionSlugs));

            $this->audit('role.update', $role, $old, [
                'display_name' => $displayName, 'permissions' => array_values($permissionSlugs),
            ]);

            return $role->fresh()->load('permissions');
        });
    }

    public function delete(Role $role): void
    {
        $this->assertMutable($role);

        $count = $role->users()->count();
        if ($count > 0) {
            throw new RoleInUseException($count);
        }

        DB::transaction(function () use ($role) {
            $this->audit('role.delete', $role, ['name' => $role->name], []);
            $role->delete();
        });
    }

    private function assertMutable(Role $role): void
    {
        if (in_array($role->name, self::LOCKED, true)) {
            throw new ForbiddenException('Không thể sửa hoặc xoá vai trò hệ thống.');
        }
    }

    private function permissionIds(array $slugs): array
    {
        return Permission::whereIn('slug', $slugs)->pluck('id')->all();
    }

    private function audit(string $action, Role $role, array $old, array $new): void
    {
        AuditLog::create([
            'user_id'     => auth()->id(),
            'action'      => $action,
            'entity_type' => 'role',
            'entity_id'   => $role->id,
            'old_values'  => $old,
            'new_values'  => $new,
            'ip_address'  => request()->ip(),
        ]);
    }
}
```

- [ ] **Step 6: `RoleController` store/update/destroy**

Sửa `src/app/Http/Controllers/Admin/RoleController.php` — thêm imports + constructor + 3 method:

```php
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use App\Services\RoleService;
```

Thêm constructor + method (giữ `index` đã sửa ở Task 2):

```php
    public function __construct(private readonly RoleService $service) {}

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->service->create(
            $request->validated('name'),
            $request->validated('display_name'),
            $request->validated('permissions', []),
        );

        return response()->json(['data' => new RoleResource($role->loadCount('users'))], 201);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $role = $this->service->update(
            $role,
            $request->validated('display_name'),
            $request->validated('permissions', []),
        );

        return response()->json(['data' => new RoleResource($role->loadCount('users'))]);
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->service->delete($role);

        return response()->json(null, 204);
    }
```

- [ ] **Step 7: Thêm routes**

Trong `src/routes/api.php`, nhóm `check.permission:manage_users`, cạnh `Route::get('roles', ...)` thêm:

```php
        Route::post('roles', [RoleController::class, 'store']);
        Route::patch('roles/{role}', [RoleController::class, 'update']);
        Route::delete('roles/{role}', [RoleController::class, 'destroy']);
```

(`RoleController` đã được import ở đầu `routes/api.php`.)

- [ ] **Step 8: Chạy — kỳ vọng PASS**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=RoleCrudTest`
Expected: PASS (7 test). (KHÔNG commit.)

---

## Task 4: BE — Seeder "chỉ tạo nếu vắng" cho role nghề

**Files:**
- Modify: `database/seeders/RolePermissionSeeder.php` (vòng lặp `$staffRoles`)
- Test: `tests/Feature/Admin/SeederPreservesRolePermissionsTest.php` (create)

**Interfaces:**
- Produces: chạy lại `RolePermissionSeeder` KHÔNG ghi đè permission-set của role nghề đã tồn tại (chỉ set khi vừa tạo).

- [ ] **Step 1: Viết test thất bại**

Create `src/tests/Feature/Admin/SeederPreservesRolePermissionsTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Role;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederPreservesRolePermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_reseed_does_not_overwrite_edited_job_role_permissions(): void
    {
        $this->seed(RolePermissionSeeder::class);

        // Admin tinh chỉnh order_staff qua UI: chỉ còn view_dashboard.
        $orderStaff = Role::where('name', 'order_staff')->firstOrFail();
        $orderStaff->permissions()->sync(
            \App\Models\Permission::where('slug', 'view_dashboard')->pluck('id')
        );

        // Deploy chạy lại seeder.
        $this->seed(RolePermissionSeeder::class);

        $slugs = $orderStaff->fresh()->permissions->pluck('slug')->all();
        $this->assertSame(['view_dashboard'], $slugs);
    }

    public function test_first_seed_still_sets_job_role_permissions(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $catalog = Role::where('name', 'catalog_staff')->firstOrFail();
        $this->assertEqualsCanonicalizing(
            ['manage_categories', 'manage_products', 'view_dashboard'],
            $catalog->permissions->pluck('slug')->all()
        );
    }
}
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=SeederPreservesRolePermissionsTest`
Expected: FAIL ở test đầu (seeder hiện re-sync → order_staff bị đưa về [manage_orders, view_dashboard]).

- [ ] **Step 3: Sửa vòng lặp seeder**

Trong `src/database/seeders/RolePermissionSeeder.php`, thay vòng lặp `foreach ($staffRoles as $name => $definition)` cuối file bằng:

```php
        foreach ($staffRoles as $name => $definition) {
            $role = Role::firstOrCreate(['name' => $name], ['display_name' => $definition['display_name']]);

            // Only seed the permission set on first creation. After that the admin UI
            // (SP2) owns each job role's permissions — re-running the seeder on deploy
            // must NOT clobber changes made through the UI.
            if ($role->wasRecentlyCreated) {
                $role->permissions()->sync(Permission::whereIn('slug', $definition['permissions'])->pluck('id'));
            }
        }
```

(super_admin vẫn `->sync(Permission::pluck('id'))` mỗi lần — giữ nguyên, đúng vì super_admin luôn full/bypass.)

- [ ] **Step 4: Chạy — kỳ vọng PASS**

Run: `docker compose exec -e CLOUDINARY_CLOUD_NAME=x -e CLOUDINARY_API_KEY=x -e CLOUDINARY_API_SECRET=x app php artisan test --filter=SeederPreservesRolePermissionsTest`
Expected: PASS (2 test). Rồi chạy `--filter=RolePermission` (nếu có StaffRoleSeederTest) để chắc không hồi quy seeder. (KHÔNG commit.)

---

## Task 5: FE — feature `roles` (api + hooks)

**Files:**
- Create: `src/features/admin/roles/api.js`
- Create: `src/features/admin/roles/hooks.js`
- Test: `src/features/admin/roles/api.test.js` (create)

**Interfaces:**
- Consumes: BE endpoints Task 1/3.
- Produces:
  - api: `getPermissions()`, `createRole(payload)`, `updateRole(id, payload)`, `deleteRole(id)`.
  - hooks: `usePermissions(options?)`, `useCreateRole()`, `useUpdateRole()`, `useDeleteRole()` (đều invalidate `['admin','roles']`; usePermissions dùng key `['admin','permissions']`).

- [ ] **Step 1: Viết test thất bại**

Create `src/features/admin/roles/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../../lib/apiClient'
import * as rolesApi from './api'

vi.mock('../../../lib/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

describe('roles api', () => {
  it('getPermissions GET /admin/permissions', () => {
    rolesApi.getPermissions()
    expect(apiClient.get).toHaveBeenCalledWith('/admin/permissions')
  })
  it('createRole POST /admin/roles', () => {
    const payload = { display_name: 'Kho', permissions: ['manage_orders'] }
    rolesApi.createRole(payload)
    expect(apiClient.post).toHaveBeenCalledWith('/admin/roles', payload)
  })
  it('updateRole PATCH /admin/roles/:id', () => {
    rolesApi.updateRole(7, { display_name: 'X', permissions: [] })
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/roles/7', { display_name: 'X', permissions: [] })
  })
  it('deleteRole DELETE /admin/roles/:id', () => {
    rolesApi.deleteRole(7)
    expect(apiClient.delete).toHaveBeenCalledWith('/admin/roles/7')
  })
})
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/features/admin/roles/api.test.js`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `api.js`**

Create `src/features/admin/roles/api.js`:

```js
import { apiClient } from '../../../lib/apiClient'

export function getPermissions() {
  return apiClient.get('/admin/permissions')
}

export function createRole(payload) {
  return apiClient.post('/admin/roles', payload)
}

export function updateRole(id, payload) {
  return apiClient.patch(`/admin/roles/${id}`, payload)
}

export function deleteRole(id) {
  return apiClient.delete(`/admin/roles/${id}`)
}
```

- [ ] **Step 4: Tạo `hooks.js`**

Create `src/features/admin/roles/hooks.js`:

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as rolesApi from './api'

// Full permission catalogue for the role editor's checkbox matrix.
export function usePermissions(options = {}) {
  return useQuery({ queryKey: ['admin', 'permissions'], queryFn: rolesApi.getPermissions, ...options })
}

function useRolesMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}

export function useCreateRole() {
  return useRolesMutation((payload) => rolesApi.createRole(payload))
}

export function useUpdateRole() {
  return useRolesMutation(({ id, ...payload }) => rolesApi.updateRole(id, payload))
}

export function useDeleteRole() {
  return useRolesMutation((id) => rolesApi.deleteRole(id))
}
```

- [ ] **Step 5: Chạy + lint — kỳ vọng PASS**

Run: `npm test -- --run src/features/admin/roles/api.test.js && npm run lint`
Expected: PASS + lint sạch. (KHÔNG commit.)

---

## Task 6: FE — `RoleFormDialog`

**Files:**
- Create: `src/pages/admin/roles/RoleFormDialog.jsx`
- Test: `src/pages/admin/roles/RoleFormDialog.test.jsx` (create)

**Interfaces:**
- Consumes: `usePermissions`, `useCreateRole`, `useUpdateRole` (Task 5); `PERMISSION_LABELS` (`src/pages/admin/adminNav.js`); `Modal`/`Button`/`Spinner`; `useToastStore`.
- Produces: `<RoleFormDialog open onOpenChange role={roleOrNull} />` — `role=null` → tạo mới; `role` có → sửa (khoá nếu `role.locked`).

- [ ] **Step 1: Viết test thất bại**

Create `src/pages/admin/roles/RoleFormDialog.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleFormDialog } from './RoleFormDialog'
import * as hooks from '../../../features/admin/roles/hooks'

vi.mock('../../../features/admin/roles/hooks')

const permissions = [
  { slug: 'manage_orders', display_name: 'Manage Orders' },
  { slug: 'view_dashboard', display_name: 'View Admin Dashboard' },
]

beforeEach(() => {
  vi.clearAllMocks()
  hooks.usePermissions.mockReturnValue({ data: { data: permissions }, isLoading: false })
  hooks.useUpdateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
})

describe('RoleFormDialog', () => {
  it('tạo role mới gửi display_name + permissions đã tick', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    hooks.useCreateRole.mockReturnValue({ mutateAsync, isPending: false })

    render(<RoleFormDialog open role={null} onOpenChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('Tên hiển thị'), 'Nhân viên kho')
    await userEvent.click(screen.getByLabelText('Quản lý đơn hàng'))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo vai trò' }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ display_name: 'Nhân viên kho', permissions: ['manage_orders'] }),
    )
  })

  it('role locked → chỉ xem, không có nút lưu', () => {
    hooks.useCreateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    render(
      <RoleFormDialog
        open
        role={{ id: 1, name: 'super_admin', display_name: 'Super Admin', locked: true, permissions: ['manage_orders'] }}
        onOpenChange={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /Lưu|Tạo vai trò/ })).toBeNull()
    expect(screen.getByText(/Toàn quyền|hệ thống/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/pages/admin/roles/RoleFormDialog.test.jsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `RoleFormDialog.jsx`**

Create `src/pages/admin/roles/RoleFormDialog.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { PERMISSION_LABELS } from '../adminNav'
import { usePermissions, useCreateRole, useUpdateRole } from '../../../features/admin/roles/hooks'
import { useToastStore } from '../../../store/toastStore'

function labelFor(permission) {
  return PERMISSION_LABELS[permission.slug] ?? permission.display_name ?? permission.slug
}

export function RoleFormDialog({ role, open, onOpenChange }) {
  const isEdit = Boolean(role)
  const locked = Boolean(role?.locked)
  const { data: permData, isLoading } = usePermissions({ enabled: open })
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const addToast = useToastStore((state) => state.addToast)

  const [displayName, setDisplayName] = useState('')
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)

  const permissions = permData?.data ?? []

  useEffect(() => {
    if (open) {
      setDisplayName(role?.display_name ?? '')
      setSelected(role?.permissions ?? [])
      setError(null)
    }
  }, [open, role])

  function toggle(slug) {
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    )
  }

  async function handleSave() {
    setError(null)
    const payload = { display_name: displayName.trim(), permissions: selected }
    try {
      if (isEdit) {
        await updateRole.mutateAsync({ id: role.id, ...payload })
        addToast({ title: 'Đã cập nhật vai trò.', variant: 'success' })
      } else {
        await createRole.mutateAsync(payload)
        addToast({ title: 'Đã tạo vai trò.', variant: 'success' })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const pending = createRole.isPending || updateRole.isPending

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? (locked ? 'Vai trò hệ thống' : 'Sửa vai trò') : 'Tạo vai trò'}
      description={isEdit ? role.name : undefined}
    >
      {isLoading ? (
        <Spinner label="Đang tải quyền..." />
      ) : (
        <div className="flex flex-col gap-4">
          {locked && (
            <p className="rounded-control bg-surface-alt px-3 py-2 text-sm text-muted-foreground">
              {role.name === 'super_admin'
                ? 'Toàn quyền (bypass) — vai trò hệ thống, không thể chỉnh sửa.'
                : 'Vai trò hệ thống, không thể chỉnh sửa.'}
            </p>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Tên hiển thị</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={locked}
              className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-60"
            />
          </label>

          <fieldset className="flex flex-col gap-2" disabled={locked}>
            <legend className="mb-1 text-sm font-medium text-foreground">Quyền</legend>
            {permissions.map((permission) => (
              <label
                key={permission.slug}
                className="flex cursor-pointer items-center gap-3 rounded-control border border-border bg-surface p-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(permission.slug)}
                  onChange={() => toggle(permission.slug)}
                  disabled={locked}
                  className="accent-[var(--color-foreground)]"
                />
                <span>
                  <span className="text-foreground">{labelFor(permission)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{permission.slug}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {locked ? 'Đóng' : 'Hủy'}
            </Button>
            {!locked && (
              <Button onClick={handleSave} disabled={pending || !displayName.trim()}>
                {pending ? 'Đang lưu...' : isEdit ? 'Lưu' : 'Tạo vai trò'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 4: Chạy + lint — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/roles/RoleFormDialog.test.jsx && npm run lint`
Expected: PASS + lint sạch. (KHÔNG commit.)

---

## Task 7: FE — `AdminRolesPage` + nav + router

**Files:**
- Create: `src/pages/admin/roles/AdminRolesPage.jsx`
- Test: `src/pages/admin/roles/AdminRolesPage.test.jsx` (create)
- Modify: `src/pages/admin/adminNav.js` (thêm mục "Vai trò")
- Modify: `src/app/router.jsx` (route `roles` dưới `RequirePermission slug="manage_users"`)

**Interfaces:**
- Consumes: `useRoles` (`src/features/admin/users/hooks.js`, list roles — nay có `permissions`/`users_count`/`locked`); `useDeleteRole` (Task 5); `RoleFormDialog` (Task 6); `useToastStore`; admin primitives.

- [ ] **Step 1: Viết test thất bại**

Create `src/pages/admin/roles/AdminRolesPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminRolesPage } from './AdminRolesPage'
import * as usersHooks from '../../../features/admin/users/hooks'
import * as rolesHooks from '../../../features/admin/roles/hooks'
import { ApiError } from '../../../lib/errors'

vi.mock('../../../features/admin/users/hooks')
vi.mock('../../../features/admin/roles/hooks')

const roles = [
  { id: 1, name: 'super_admin', display_name: 'Super Admin', locked: true, permissions: [], users_count: 1 },
  { id: 2, name: 'order_staff', display_name: 'Nhân viên đơn', locked: false, permissions: ['manage_orders'], users_count: 3 },
]

beforeEach(() => {
  vi.clearAllMocks()
  usersHooks.useRoles.mockReturnValue({ data: { data: roles }, isLoading: false })
  rolesHooks.usePermissions.mockReturnValue({ data: { data: [] }, isLoading: false })
  rolesHooks.useCreateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  rolesHooks.useUpdateRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  rolesHooks.useDeleteRole.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminRolesPage />
    </MemoryRouter>,
  )
}

describe('AdminRolesPage', () => {
  it('liệt kê role + badge Hệ thống cho role locked', () => {
    renderPage()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText('Nhân viên đơn')).toBeInTheDocument()
    expect(screen.getByText('Hệ thống')).toBeInTheDocument()
  })

  it('xoá role đang dùng → toast đọc users_count từ 409', async () => {
    const addToast = vi.fn()
    // toastStore: mock nếu cần, hoặc kiểm qua text. Ở đây kiểm mutateAsync bị gọi + lỗi được bắt.
    const mutateAsync = vi.fn().mockRejectedValue(
      new ApiError('ROLE_IN_USE', 'Không thể xoá vai trò đang được gán.', { users_count: 3 }, 409),
    )
    rolesHooks.useDeleteRole.mockReturnValue({ mutateAsync, isPending: false })

    renderPage()
    // Mở xoá cho order_staff (không locked)
    await userEvent.click(screen.getByRole('button', { name: 'Xoá vai trò Nhân viên đơn' }))
    // Xác nhận trong confirm
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(2))
  })
})
```

> Ghi chú cho implementer: nút xoá mỗi hàng cần `aria-label={`Xoá vai trò ${role.display_name}`}`; confirm dialog có nút nhãn "Xoá". Nếu dùng `useToastStore`, có thể mock `../../../store/toastStore` để assert nội dung toast; tối thiểu test đảm bảo `deleteRole` được gọi đúng id và lỗi 409 không làm văng app (được catch).

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm test -- --run src/pages/admin/roles/AdminRolesPage.test.jsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `AdminRolesPage.jsx`**

Create `src/pages/admin/roles/AdminRolesPage.jsx`:

```jsx
import { useState } from 'react'
import { KeyRound, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { Spinner } from '../../../components/Spinner'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useRoles } from '../../../features/admin/users/hooks'
import { useDeleteRole } from '../../../features/admin/roles/hooks'
import { useToastStore } from '../../../store/toastStore'
import { RoleFormDialog } from './RoleFormDialog'

const thClass = 'px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'

export function AdminRolesPage() {
  const { data, isLoading } = useRoles()
  const deleteRole = useDeleteRole()
  const addToast = useToastStore((state) => state.addToast)

  const [editing, setEditing] = useState(undefined) // undefined=đóng, null=tạo mới, role=sửa
  const [deleting, setDeleting] = useState(null)

  const roles = data?.data ?? []

  async function confirmDelete() {
    try {
      await deleteRole.mutateAsync(deleting.id)
      addToast({ title: 'Đã xoá vai trò.', variant: 'success' })
      setDeleting(null)
    } catch (err) {
      const count = err?.details?.users_count
      addToast({
        title:
          err?.code === 'ROLE_IN_USE' && count != null
            ? `Còn ${count} nhân viên giữ vai trò này, hãy gỡ trước khi xoá.`
            : err.message,
        variant: 'error',
      })
      setDeleting(null)
    }
  }

  return (
    <div>
      <PageHeader
        icon={KeyRound}
        title="Vai trò"
        description="Tạo và tinh chỉnh vai trò cùng tập quyền cho đội ngũ nội bộ."
        actions={
          <Button onClick={() => setEditing(null)} className="gap-2">
            <Plus size={16} />
            Tạo vai trò
          </Button>
        }
      />

      <Panel className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải vai trò..." />
        ) : roles.length === 0 ? (
          <EmptyState title="Chưa có vai trò" description="Tạo vai trò đầu tiên để phân quyền." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className={thClass}>Vai trò</th>
                  <th className={thClass}>Số quyền</th>
                  <th className={thClass}>Nhân viên</th>
                  <th className={thClass}>&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{role.display_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{role.name}</span>
                      {role.locked && (
                        <Badge tone="neutral" className="ml-2">
                          Hệ thống
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{role.permissions?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{role.users_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(role)}
                          aria-label={`${role.locked ? 'Xem' : 'Sửa'} vai trò ${role.display_name}`}
                          className="gap-1.5"
                        >
                          <Pencil size={15} />
                        </Button>
                        {!role.locked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(role)}
                            aria-label={`Xoá vai trò ${role.display_name}`}
                            className="gap-1.5 text-destructive"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <RoleFormDialog
        role={editing ?? null}
        open={editing !== undefined}
        onOpenChange={(next) => !next && setEditing(undefined)}
      />

      <Modal
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Xoá vai trò"
        description={deleting ? `Xoá vai trò "${deleting.display_name}"? Hành động không thể hoàn tác.` : undefined}
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Hủy
          </Button>
          <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={confirmDelete} disabled={deleteRole.isPending}>
            {deleteRole.isPending ? 'Đang xoá...' : 'Xoá'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
```

> Ghi chú: nếu `Button` không nhận `size="sm"`/`variant="ghost"` thì implementer xem props thật của `src/components/Button.jsx` và điều chỉnh cho khớp (giữ nhãn/aria-label như trên để test pass). Tương tự `Badge` `tone` — dùng đúng prop mà `src/components/Badge.jsx` hỗ trợ.

- [ ] **Step 4: Chạy — kỳ vọng PASS**

Run: `npm test -- --run src/pages/admin/roles/AdminRolesPage.test.jsx`
Expected: PASS.

- [ ] **Step 5: Thêm mục nav "Vai trò"**

Sửa `src/pages/admin/adminNav.js` — thêm import icon `KeyRound` vào khối import lucide-react, và thêm item vào group "Nhân sự" (sau "Khách hàng"):

```js
      { to: '/admin/roles', label: 'Vai trò', icon: KeyRound, permission: 'manage_users' },
```

- [ ] **Step 6: Thêm route**

Sửa `src/app/router.jsx`:
- Thêm khai báo lazy: `const AdminRolesPage = named(() => import('../pages/admin/roles/AdminRolesPage'), 'AdminRolesPage')`.
- Trong nhóm `<RequirePermission slug="manage_users" />` (đã có từ SP1, chứa employees/customers/users), thêm route con:

```jsx
              { path: 'roles', element: lazyPage(<AdminRolesPage />) },
```

- [ ] **Step 7: Toàn suite + lint + build — kỳ vọng PASS**

Run: `npm test -- --run && npm run lint && npm run build`
Expected: toàn bộ xanh, build OK. (KHÔNG commit.)

---

## Xác minh cuối (sau Task 7)

- [ ] BE: `--filter=PermissionListTest`, `--filter=RoleResourceTest`, `--filter=RoleCrudTest`, `--filter=SeederPreservesRolePermissionsTest` đều xanh; `--filter=AssignRolesGuard` (và các test role/user cũ) không hồi quy.
- [ ] FE: `npm test -- --run` toàn xanh; `npm run lint` sạch; `npm run build` OK.
- [ ] Không file `.ts`/`.tsx`; không thêm dependency; không migration mới.
- [ ] Working tree **uncommitted** (guardrail) — chờ user cho phép commit.
- [ ] MANUAL QA: đăng nhập user có `manage_users` → thấy mục "Vai trò"; tạo role mới (tick quyền) → xuất hiện trong `AssignRolesDialog`; sửa role nghề đổi quyền; xoá role đang gán → toast "Còn N nhân viên..."; super_admin/customer hiện badge "Hệ thống", không xoá được. User có thể re-run seeder trên prod mà KHÔNG mất chỉnh sửa.
