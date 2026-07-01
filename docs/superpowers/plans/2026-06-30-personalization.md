# Personalization Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cá nhân hoá storefront cho khách hàng đã đăng nhập — ghi lịch sử xem sản phẩm, hiển thị "Bạn vừa xem", "Gợi ý cho bạn" và lời chào theo ngữ cảnh.

**Architecture:** Tái dùng bảng `audit_logs` (BE) làm nơi lưu sự kiện `product_viewed`; 2 endpoint mới (`POST /products/{slug}/view`, `GET /me/recently-viewed`). FE thêm feature folder `personalization` + 4 component, gate hiển thị `token && !isStaff(user)`. Gợi ý danh mục derive từ recently-viewed, tái dùng `GET /products?filter[category]=`.

**Tech Stack:** Laravel (PHPUnit, sqlite :memory: test) + React 18 / Vite / TanStack Query v5 / Zustand (Vitest + RTL).

## Global Constraints

- **No TypeScript** — chỉ `.js`/`.jsx`, không type annotation.
- **Design tokens only** — `bg-surface`, `text-foreground`, `font-display`… Không hex thô, không thêm token.
- **UI copy tiếng Việt.**
- **Gate hiển thị** mọi surface personalization: `token && !isStaff(user)` (guest + admin/staff không thấy).
- **Không lưu snapshot** sản phẩm trong audit_logs — đọc JOIN/whereIn sang `products` lấy dữ liệu sống, lọc `status='active'`.
- **Read query phải portable** giữa Postgres (prod) và sqlite (test): dedup trong PHP, không dùng `DISTINCT ON`.
- **`recordProductView` fire-and-forget** — lỗi nuốt im lặng, không toast, không chặn render.
- **Surface phụ trợ rỗng/lỗi → trả `null`**, không hiện thông báo lỗi.
- **Không commit cho tới khi user yêu cầu** — mỗi task chạy tới bước test xanh; bước "Commit" để sẵn nhưng CHỜ user duyệt mới chạy.
- BE test: route customer-facing có middleware `verified` → user phải `User::factory()->verified()->create()`.

---

## File Structure

**BE (repo `Nestify-Furniture-e-commerce-backend/src`):**
- Create `app/Services/RecentlyViewedService.php` — record + list lịch sử xem.
- Create `app/Http/Controllers/RecentlyViewedController.php` — `store` (ghi view), `index` (đọc lịch sử).
- Create `database/migrations/2026_06_30_000001_add_user_action_index_to_audit_logs_table.php` — index hỗ trợ query.
- Modify `routes/api.php` — 2 route mới trong nhóm `auth:sanctum` + `verified`.
- Modify `app/Services/AuditLogService.php` — loại `product_viewed` khỏi danh sách admin.
- Create `tests/Feature/Personalization/RecordProductViewTest.php`
- Create `tests/Feature/Personalization/RecentlyViewedTest.php`
- Modify `tests/Feature/Admin/AdminAuditLogTest.php` — thêm test filter.

**FE (repo `Nestify-Furniture-e-commerce-frontend/src`):**
- Create `features/personalization/api.js` + `api.test.js`
- Create `features/personalization/hooks.js`
- Create `features/personalization/recommend.js` + `recommend.test.js`
- Modify `features/catalog/hooks.js` — `useInfiniteProducts` nhận `enabled`.
- Create `components/personalization/PersonalizedGreeting.jsx` + `.test.jsx`
- Create `components/personalization/RecentlyViewedStrip.jsx` + `.test.jsx`
- Create `components/personalization/SuggestedForYou.jsx` + `.test.jsx`
- Create `components/personalization/PersonalizedSection.jsx` + `.test.jsx`
- Modify `pages/home/HomePage.jsx`
- Modify `pages/product/ProductPage.jsx` + `ProductPage.test.jsx`

**Docs:**
- Modify BE `docs/14-workflows.md`, `docs/FE_AI_CONTEXT.md`; FE `FE-TEAM-WORKFLOW.md`.

---

## Task 1: BE — Record product view (`POST /products/{slug}/view`)

**Files:**
- Create: `app/Services/RecentlyViewedService.php`
- Create: `app/Http/Controllers/RecentlyViewedController.php`
- Modify: `routes/api.php` (authed customer group, ~after line 102)
- Test: `tests/Feature/Personalization/RecordProductViewTest.php`

**Interfaces:**
- Produces: `RecentlyViewedService::record(int $userId, Product $product): void` (insert audit_logs row `action='product_viewed'`, `entity_type='product'`, `entity_id=$product->id`).
- Produces: route `POST /api/products/{slug}/view` → `RecentlyViewedController@store` → `204`; slug không active → `404`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Personalization/RecordProductViewTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Personalization;

use App\Enums\ProductStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecordProductViewTest extends TestCase
{
    use RefreshDatabase;

    private function product(string $slug = 'ghe-sofa'): Product
    {
        $cat = Category::create(['name' => 'Ghế', 'slug' => 'ghe-' . uniqid()]);

        return Product::create([
            'category_id' => $cat->id,
            'name'        => 'Ghế Sofa',
            'slug'        => $slug,
            'description' => 'mô tả',
            'attributes'  => [],
            'status'      => ProductStatus::Active,
        ]);
    }

    public function test_customer_view_is_recorded(): void
    {
        $user = User::factory()->verified()->create();
        $product = $this->product();

        $this->actingAs($user)
            ->postJson("/api/products/{$product->slug}/view")
            ->assertNoContent();

        $this->assertDatabaseHas('audit_logs', [
            'user_id'     => $user->id,
            'action'      => 'product_viewed',
            'entity_type' => 'product',
            'entity_id'   => $product->id,
        ]);
    }

    public function test_guest_cannot_record_view(): void
    {
        $product = $this->product();
        $this->postJson("/api/products/{$product->slug}/view")->assertUnauthorized();
    }

    public function test_unknown_slug_returns_404(): void
    {
        $user = User::factory()->verified()->create();
        $this->actingAs($user)
            ->postJson('/api/products/khong-ton-tai/view')
            ->assertNotFound();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (xem [Chạy test BE nhanh] trong memory — Docker app image + sqlite):
```
php artisan test --filter=RecordProductViewTest
```
Expected: FAIL (route chưa tồn tại → 404 cho cả happy path, hoặc MethodNotAllowed).

- [ ] **Step 3: Create the service**

Create `app/Services/RecentlyViewedService.php`:

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Product;

class RecentlyViewedService
{
    public const VIEW_ACTION = 'product_viewed';

    public function record(int $userId, Product $product): void
    {
        AuditLog::create([
            'user_id'     => $userId,
            'action'      => self::VIEW_ACTION,
            'entity_type' => 'product',
            'entity_id'   => $product->id,
        ]);
    }
}
```

- [ ] **Step 4: Create the controller**

Create `app/Http/Controllers/RecentlyViewedController.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\RecentlyViewedService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RecentlyViewedController extends Controller
{
    public function __construct(private readonly RecentlyViewedService $service) {}

    public function store(Request $request, string $slug): Response
    {
        $product = Product::active()->where('slug', $slug)->firstOrFail();
        $this->service->record($request->user()->id, $product);

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Register the route**

In `routes/api.php`, add `use App\Http\Controllers\RecentlyViewedController;` near the other controller imports, then inside the `Route::middleware(['auth:sanctum', 'verified'])->group(...)` block (after the `ai/chat` line ~102) add:

```php
    Route::post('products/{slug}/view', [RecentlyViewedController::class, 'store']);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --filter=RecordProductViewTest`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit** *(CHỜ user duyệt mới chạy)*

```bash
git add app/Services/RecentlyViewedService.php app/Http/Controllers/RecentlyViewedController.php routes/api.php tests/Feature/Personalization/RecordProductViewTest.php
git commit -m "feat(be): record product views to audit_logs"
```

---

## Task 2: BE — List recently viewed (`GET /me/recently-viewed`) + index migration

**Files:**
- Modify: `app/Services/RecentlyViewedService.php` (add `list`)
- Modify: `app/Http/Controllers/RecentlyViewedController.php` (add `index`)
- Modify: `routes/api.php`
- Create: `database/migrations/2026_06_30_000001_add_user_action_index_to_audit_logs_table.php`
- Test: `tests/Feature/Personalization/RecentlyViewedTest.php`

**Interfaces:**
- Consumes: `RecentlyViewedService::VIEW_ACTION`.
- Produces: `RecentlyViewedService::list(int $userId, int $limit): \Illuminate\Support\Collection` — Collection<Product> deduped theo entity_id, mới nhất trước, chỉ active, eager-load `category` + active `variants` + ảnh đầu.
- Produces: route `GET /api/me/recently-viewed?limit=` → `{ data: ProductResource[] }`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Personalization/RecentlyViewedTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Personalization;

use App\Enums\ProductStatus;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecentlyViewedTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->category = Category::create(['name' => 'Ghế', 'slug' => 'ghe']);
    }

    private function product(string $slug, ProductStatus $status = ProductStatus::Active): Product
    {
        $p = Product::create([
            'category_id' => $this->category->id,
            'name'        => "SP {$slug}",
            'slug'        => $slug,
            'description' => 'mô tả',
            'attributes'  => [],
            'status'      => $status,
        ]);
        ProductVariant::create([
            'product_id'     => $p->id,
            'name'           => 'Mặc định',
            'sku'            => strtoupper($slug) . '-01',
            'price'          => 1000000,
            'stock_quantity' => 5,
            'is_active'      => true,
        ]);

        return $p;
    }

    private function recordView(User $user, Product $product, string $at): void
    {
        AuditLog::create([
            'user_id'     => $user->id,
            'action'      => 'product_viewed',
            'entity_type' => 'product',
            'entity_id'   => $product->id,
            'created_at'  => $at,
            'updated_at'  => $at,
        ]);
    }

    public function test_returns_deduped_products_most_recent_first(): void
    {
        $user = User::factory()->verified()->create();
        $a = $this->product('ghe-a');
        $b = $this->product('ghe-b');

        $this->recordView($user, $a, '2026-06-30 10:00:00');
        $this->recordView($user, $b, '2026-06-30 11:00:00');
        $this->recordView($user, $a, '2026-06-30 12:00:00'); // a xem lại → mới nhất

        $this->actingAs($user)
            ->getJson('/api/me/recently-viewed')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', 'ghe-a')
            ->assertJsonPath('data.1.slug', 'ghe-b');
    }

    public function test_excludes_archived_products(): void
    {
        $user = User::factory()->verified()->create();
        $archived = $this->product('ghe-cu', ProductStatus::Archived);
        $this->recordView($user, $archived, '2026-06-30 10:00:00');

        $this->actingAs($user)
            ->getJson('/api/me/recently-viewed')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_respects_limit(): void
    {
        $user = User::factory()->verified()->create();
        foreach (range(1, 5) as $i) {
            $p = $this->product("ghe-{$i}");
            $this->recordView($user, $p, '2026-06-30 10:0' . $i . ':00');
        }

        $this->actingAs($user)
            ->getJson('/api/me/recently-viewed?limit=3')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_only_returns_own_history(): void
    {
        $user  = User::factory()->verified()->create();
        $other = User::factory()->verified()->create();
        $p = $this->product('ghe-x');
        $this->recordView($other, $p, '2026-06-30 10:00:00');

        $this->actingAs($user)
            ->getJson('/api/me/recently-viewed')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_guest_is_unauthorized(): void
    {
        $this->getJson('/api/me/recently-viewed')->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=RecentlyViewedTest`
Expected: FAIL (route chưa có → 404/405).

- [ ] **Step 3: Add `list` to the service**

In `app/Services/RecentlyViewedService.php` add `use App\Support\...` not needed; add method (and the import for `Illuminate\Support\Collection` at top):

```php
    public function list(int $userId, int $limit): \Illuminate\Support\Collection
    {
        // Dedup trong PHP để portable giữa Postgres và sqlite (không DISTINCT ON).
        // Giới hạn cửa sổ quét để tránh tải toàn bộ lịch sử.
        $events = AuditLog::query()
            ->where('user_id', $userId)
            ->where('action', self::VIEW_ACTION)
            ->where('entity_type', 'product')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get(['entity_id']);

        $orderedIds = $events->pluck('entity_id')->unique()->take($limit)->values();

        if ($orderedIds->isEmpty()) {
            return collect();
        }

        $products = Product::active()
            ->with([
                'category',
                'variants' => fn ($q) => $q->active(),
                'media'    => fn ($q) => $q->orderBy('sort_order')->limit(1),
            ])
            ->whereIn('id', $orderedIds)
            ->get()
            ->keyBy('id');

        // Giữ đúng thứ tự mới-nhất-trước; bỏ id đã bị lọc (archived/đã xoá).
        return $orderedIds
            ->map(fn ($id) => $products->get($id))
            ->filter()
            ->values();
    }
```

- [ ] **Step 4: Add `index` to the controller**

In `app/Http/Controllers/RecentlyViewedController.php` add imports `use App\Http\Resources\ProductResource;` and `use Illuminate\Http\JsonResponse;`, then:

```php
    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->integer('limit', 10);
        $limit = max(1, min($limit, 20));

        $products = $this->service->list($request->user()->id, $limit);

        return response()->json([
            'data' => ProductResource::collection($products),
        ]);
    }
```

- [ ] **Step 5: Register the route**

In `routes/api.php`, in the same authed+verified group, add:

```php
    Route::get('me/recently-viewed', [RecentlyViewedController::class, 'index']);
```

- [ ] **Step 6: Create the index migration**

Create `database/migrations/2026_06_30_000001_add_user_action_index_to_audit_logs_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index(['user_id', 'action', 'created_at'], 'audit_logs_user_action_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_user_action_created_idx');
        });
    }
};
```

- [ ] **Step 7: Run test to verify it passes**

Run: `php artisan test --filter=RecentlyViewedTest`
Expected: PASS (5 tests).

- [ ] **Step 8: Commit** *(CHỜ user duyệt)*

```bash
git add app/Services/RecentlyViewedService.php app/Http/Controllers/RecentlyViewedController.php routes/api.php database/migrations/2026_06_30_000001_add_user_action_index_to_audit_logs_table.php tests/Feature/Personalization/RecentlyViewedTest.php
git commit -m "feat(be): list recently viewed products"
```

---

## Task 3: BE — Hide `product_viewed` from admin audit list

**Files:**
- Modify: `app/Services/AuditLogService.php`
- Test: `tests/Feature/Admin/AdminAuditLogTest.php`

**Interfaces:**
- Consumes: `RecentlyViewedService::VIEW_ACTION`.
- Produces: `AuditLogService::list` không bao giờ trả action thuộc `BEHAVIORAL_ACTIONS`.

- [ ] **Step 1: Write the failing test**

In `tests/Feature/Admin/AdminAuditLogTest.php`, add (use the existing `$this->admin`):

```php
    public function test_product_viewed_events_are_hidden_from_admin(): void
    {
        $this->createLog('order', 1);
        AuditLog::create([
            'user_id'     => $this->customer->id,
            'action'      => 'product_viewed',
            'entity_type' => 'product',
            'entity_id'   => 99,
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/audit-logs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'order.status_transition');
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=AdminAuditLogTest`
Expected: FAIL on new test — returns 2 rows (product_viewed leaks).

- [ ] **Step 3: Filter in the service**

In `app/Services/AuditLogService.php`, add the constant and `whereNotIn`:

```php
class AuditLogService
{
    /** Sự kiện hành vi khách hàng — KHÔNG thuộc audit trail quản trị. */
    private const BEHAVIORAL_ACTIONS = ['product_viewed'];

    public function list(?string $entityType, int $perPage = 50): LengthAwarePaginator
    {
        return AuditLog::with('user')
            ->whereNotIn('action', self::BEHAVIORAL_ACTIONS)
            ->when($entityType, fn ($q) => $q->where('entity_type', $entityType))
            ->latest()
            ->paginate($perPage);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=AdminAuditLogTest`
Expected: PASS (all, including new test).

- [ ] **Step 5: Commit** *(CHỜ user duyệt)*

```bash
git add app/Services/AuditLogService.php tests/Feature/Admin/AdminAuditLogTest.php
git commit -m "feat(be): hide product_viewed from admin audit log"
```

---

## Task 4: FE — Personalization API + hooks

**Files:**
- Create: `src/features/personalization/api.js`
- Create: `src/features/personalization/hooks.js`
- Modify: `src/features/catalog/hooks.js`
- Test: `src/features/personalization/api.test.js`

**Interfaces:**
- Produces: `recordProductView(slug): Promise` → `POST /products/{slug}/view`.
- Produces: `getRecentlyViewed(limit=10): Promise<{ data: Product[] }>` → `GET /me/recently-viewed?limit=`.
- Produces: `useRecordProductView()` → mutation `mutate(slug)`.
- Produces: `useRecentlyViewed({ enabled=true, limit=10 } = {})` → query, `data` = `{ data: Product[] }`.
- Produces: `useInfiniteProducts(filters={}, { enabled=true } = {})` (extended).

- [ ] **Step 1: Write the failing test**

Create `src/features/personalization/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../lib/apiClient'
import { recordProductView, getRecentlyViewed } from './api'

vi.mock('../../lib/apiClient', () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}))

describe('personalization api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('records a product view by slug', () => {
    recordProductView('ghe-sofa')
    expect(apiClient.post).toHaveBeenCalledWith('/products/ghe-sofa/view')
  })

  it('fetches recently viewed with a limit', () => {
    getRecentlyViewed(8)
    expect(apiClient.get).toHaveBeenCalledWith('/me/recently-viewed', { params: { limit: 8 } })
  })

  it('defaults the limit to 10', () => {
    getRecentlyViewed()
    expect(apiClient.get).toHaveBeenCalledWith('/me/recently-viewed', { params: { limit: 10 } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/personalization/api.test.js`
Expected: FAIL — `./api` not found.

- [ ] **Step 3: Implement api.js**

Create `src/features/personalization/api.js`:

```js
import { apiClient } from '../../lib/apiClient'

export function recordProductView(slug) {
  return apiClient.post(`/products/${slug}/view`)
}

export function getRecentlyViewed(limit = 10) {
  return apiClient.get('/me/recently-viewed', { params: { limit } })
}
```

- [ ] **Step 4: Implement hooks.js**

Create `src/features/personalization/hooks.js`:

```js
import { useMutation, useQuery } from '@tanstack/react-query'
import * as personalizationApi from './api'

export function useRecordProductView() {
  return useMutation({
    mutationFn: (slug) => personalizationApi.recordProductView(slug),
  })
}

export function useRecentlyViewed({ enabled = true, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['recently-viewed', limit],
    queryFn: () => personalizationApi.getRecentlyViewed(limit),
    enabled,
  })
}
```

- [ ] **Step 5: Extend `useInfiniteProducts` with `enabled`**

In `src/features/catalog/hooks.js`, replace the `useInfiniteProducts` function:

```js
export function useInfiniteProducts(filters = {}, { enabled = true } = {}) {
  return useCursorQuery({
    queryKey: ['products', filters],
    queryFn: (cursor) => catalogApi.getProducts({ ...filters, cursor }),
    enabled,
  })
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --run src/features/personalization/api.test.js`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit** *(CHỜ user duyệt)*

```bash
git add src/features/personalization/api.js src/features/personalization/hooks.js src/features/personalization/api.test.js src/features/catalog/hooks.js
git commit -m "feat(fe): personalization api + hooks"
```

---

## Task 5: FE — `topCategorySlug` recommendation helper

**Files:**
- Create: `src/features/personalization/recommend.js`
- Test: `src/features/personalization/recommend.test.js`

**Interfaces:**
- Produces: `topCategorySlug(products): string | null` — slug danh mục xuất hiện nhiều nhất; tie → cái xuất hiện trước; rỗng/không có category → `null`.

- [ ] **Step 1: Write the failing test**

Create `src/features/personalization/recommend.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { topCategorySlug } from './recommend'

describe('topCategorySlug', () => {
  it('returns null for empty input', () => {
    expect(topCategorySlug([])).toBeNull()
    expect(topCategorySlug(undefined)).toBeNull()
  })

  it('returns the most frequent category slug', () => {
    const products = [
      { slug: 'a', category: { slug: 'ghe' } },
      { slug: 'b', category: { slug: 'ban' } },
      { slug: 'c', category: { slug: 'ghe' } },
    ]
    expect(topCategorySlug(products)).toBe('ghe')
  })

  it('ignores products without a category', () => {
    const products = [
      { slug: 'a', category: null },
      { slug: 'b', category: { slug: 'ban' } },
    ]
    expect(topCategorySlug(products)).toBe('ban')
  })

  it('breaks ties by first appearance', () => {
    const products = [
      { slug: 'a', category: { slug: 'ghe' } },
      { slug: 'b', category: { slug: 'ban' } },
    ]
    expect(topCategorySlug(products)).toBe('ghe')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/personalization/recommend.test.js`
Expected: FAIL — `./recommend` not found.

- [ ] **Step 3: Implement recommend.js**

Create `src/features/personalization/recommend.js`:

```js
// Slug danh mục xuất hiện nhiều nhất trong danh sách sản phẩm đã xem.
// Tie → danh mục xuất hiện trước. Không có category hợp lệ → null.
export function topCategorySlug(products) {
  const counts = new Map()
  for (const product of products ?? []) {
    const slug = product?.category?.slug
    if (!slug) continue
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }

  let best = null
  let bestCount = 0
  for (const [slug, count] of counts) {
    if (count > bestCount) {
      best = slug
      bestCount = count
    }
  }
  return best
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/personalization/recommend.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit** *(CHỜ user duyệt)*

```bash
git add src/features/personalization/recommend.js src/features/personalization/recommend.test.js
git commit -m "feat(fe): top category recommendation helper"
```

---

## Task 6: FE — `PersonalizedGreeting`

**Files:**
- Create: `src/components/personalization/PersonalizedGreeting.jsx`
- Test: `src/components/personalization/PersonalizedGreeting.test.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<PersonalizedGreeting name={string} hasHistory={boolean} />` — presentational.

- [ ] **Step 1: Write the failing test**

Create `src/components/personalization/PersonalizedGreeting.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonalizedGreeting } from './PersonalizedGreeting'

describe('PersonalizedGreeting', () => {
  it('greets the user by name', () => {
    render(<PersonalizedGreeting name="Bảo" hasHistory={false} />)
    expect(screen.getByText(/Chào mừng trở lại, Bảo/)).toBeInTheDocument()
  })

  it('shows the explore-more line when there is history', () => {
    render(<PersonalizedGreeting name="Bảo" hasHistory />)
    expect(screen.getByText(/Tiếp tục khám phá/)).toBeInTheDocument()
  })

  it('shows the get-started line when there is no history', () => {
    render(<PersonalizedGreeting name="Bảo" hasHistory={false} />)
    expect(screen.getByText(/Bắt đầu khám phá/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/personalization/PersonalizedGreeting.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/personalization/PersonalizedGreeting.jsx`:

```jsx
export function PersonalizedGreeting({ name, hasHistory }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">Dành riêng cho bạn</p>
      <h2 className="mt-3 font-display text-[clamp(1.6rem,2.8vw,2.4rem)] leading-tight text-foreground">
        Chào mừng trở lại, {name}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        {hasHistory
          ? 'Tiếp tục khám phá những món bạn đang quan tâm.'
          : 'Bắt đầu khám phá bộ sưu tập nội thất của chúng tôi.'}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/personalization/PersonalizedGreeting.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit** *(CHỜ user duyệt)*

```bash
git add src/components/personalization/PersonalizedGreeting.jsx src/components/personalization/PersonalizedGreeting.test.jsx
git commit -m "feat(fe): personalized greeting component"
```

---

## Task 7: FE — `RecentlyViewedStrip`

**Files:**
- Create: `src/components/personalization/RecentlyViewedStrip.jsx`
- Test: `src/components/personalization/RecentlyViewedStrip.test.jsx`

**Interfaces:**
- Consumes: `useRecentlyViewed` (Task 4), `ProductCard`, `SectionHeading`.
- Produces: `<RecentlyViewedStrip excludeSlug={string?} title={string?} enabled={boolean?} />` — self-fetching; trả `null` khi rỗng/đang tải/lỗi hoặc sau khi loại `excludeSlug` còn 0 item.

- [ ] **Step 1: Write the failing test**

Create `src/components/personalization/RecentlyViewedStrip.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecentlyViewedStrip } from './RecentlyViewedStrip'
import * as hooks from '../../features/personalization/hooks'

vi.mock('../../features/personalization/hooks')

function renderStrip(props) {
  return render(
    <MemoryRouter>
      <RecentlyViewedStrip {...props} />
    </MemoryRouter>,
  )
}

describe('RecentlyViewedStrip', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders viewed products', () => {
    hooks.useRecentlyViewed.mockReturnValue({
      data: { data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 }] },
    })
    renderStrip()
    expect(screen.getByText('Ghế A')).toBeInTheDocument()
  })

  it('returns null when there is no history', () => {
    hooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    const { container } = renderStrip()
    expect(container).toBeEmptyDOMElement()
  })

  it('excludes the current product by slug', () => {
    hooks.useRecentlyViewed.mockReturnValue({
      data: {
        data: [
          { id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 },
          { id: 2, slug: 'ghe-b', name: 'Ghế B', base_price: 2000000 },
        ],
      },
    })
    renderStrip({ excludeSlug: 'ghe-a' })
    expect(screen.queryByText('Ghế A')).not.toBeInTheDocument()
    expect(screen.getByText('Ghế B')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/personalization/RecentlyViewedStrip.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/personalization/RecentlyViewedStrip.jsx`:

```jsx
import { SectionHeading } from '../home/SectionHeading'
import { ProductCard } from '../ProductCard'
import { useRecentlyViewed } from '../../features/personalization/hooks'

export function RecentlyViewedStrip({ excludeSlug, title = 'Bạn vừa xem', enabled = true }) {
  const { data } = useRecentlyViewed({ enabled })
  const items = (data?.data ?? []).filter((product) => product.slug !== excludeSlug)

  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
      <SectionHeading eyebrow="Lịch sử" title={title} />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/personalization/RecentlyViewedStrip.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit** *(CHỜ user duyệt)*

```bash
git add src/components/personalization/RecentlyViewedStrip.jsx src/components/personalization/RecentlyViewedStrip.test.jsx
git commit -m "feat(fe): recently viewed strip"
```

---

## Task 8: FE — `SuggestedForYou`

**Files:**
- Create: `src/components/personalization/SuggestedForYou.jsx`
- Test: `src/components/personalization/SuggestedForYou.test.jsx`

**Interfaces:**
- Consumes: `useRecentlyViewed` (Task 4), `useInfiniteProducts` (Task 4 extended), `topCategorySlug` (Task 5), `ProductCard`, `SectionHeading`.
- Produces: `<SuggestedForYou />` — self-fetching; `null` khi không có top category hoặc không còn gợi ý sau khi loại sản phẩm đã xem.

- [ ] **Step 1: Write the failing test**

Create `src/components/personalization/SuggestedForYou.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuggestedForYou } from './SuggestedForYou'
import * as personalizationHooks from '../../features/personalization/hooks'
import * as catalogHooks from '../../features/catalog/hooks'

vi.mock('../../features/personalization/hooks')
vi.mock('../../features/catalog/hooks')

function renderSuggest() {
  return render(
    <MemoryRouter>
      <SuggestedForYou />
    </MemoryRouter>,
  )
}

describe('SuggestedForYou', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when there is no view history', () => {
    personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    catalogHooks.useInfiniteProducts.mockReturnValue({ data: undefined })
    const { container } = renderSuggest()
    expect(container).toBeEmptyDOMElement()
  })

  it('suggests products from the top category, excluding already-viewed', () => {
    personalizationHooks.useRecentlyViewed.mockReturnValue({
      data: { data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', category: { slug: 'ghe' } }] },
    })
    catalogHooks.useInfiniteProducts.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 },
              { id: 2, slug: 'ghe-b', name: 'Ghế B', base_price: 2000000 },
            ],
          },
        ],
      },
    })
    renderSuggest()
    expect(screen.getByText('Ghế B')).toBeInTheDocument()
    expect(screen.queryByText('Ghế A')).not.toBeInTheDocument()
  })

  it('returns null when no suggestions remain after exclusion', () => {
    personalizationHooks.useRecentlyViewed.mockReturnValue({
      data: { data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', category: { slug: 'ghe' } }] },
    })
    catalogHooks.useInfiniteProducts.mockReturnValue({
      data: { pages: [{ data: [{ id: 1, slug: 'ghe-a', name: 'Ghế A', base_price: 1000000 }] }] },
    })
    const { container } = renderSuggest()
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/personalization/SuggestedForYou.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/personalization/SuggestedForYou.jsx`:

```jsx
import { SectionHeading } from '../home/SectionHeading'
import { ProductCard } from '../ProductCard'
import { useRecentlyViewed } from '../../features/personalization/hooks'
import { useInfiniteProducts } from '../../features/catalog/hooks'
import { topCategorySlug } from '../../features/personalization/recommend'

export function SuggestedForYou() {
  const { data: viewedData } = useRecentlyViewed()
  const viewed = viewedData?.data ?? []
  const category = topCategorySlug(viewed)
  const viewedSlugs = new Set(viewed.map((product) => product.slug))

  const query = useInfiniteProducts(
    category ? { category } : {},
    { enabled: Boolean(category) },
  )

  if (!category) return null

  const suggestions = (query.data?.pages?.[0]?.data ?? [])
    .filter((product) => !viewedSlugs.has(product.slug))
    .slice(0, 4)

  if (suggestions.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
      <SectionHeading eyebrow="Gợi ý" title="Gợi ý cho bạn" />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {suggestions.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/personalization/SuggestedForYou.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit** *(CHỜ user duyệt)*

```bash
git add src/components/personalization/SuggestedForYou.jsx src/components/personalization/SuggestedForYou.test.jsx
git commit -m "feat(fe): suggested-for-you section"
```

---

## Task 9: FE — `PersonalizedSection` (gate + compose)

**Files:**
- Create: `src/components/personalization/PersonalizedSection.jsx`
- Test: `src/components/personalization/PersonalizedSection.test.jsx`

**Interfaces:**
- Consumes: `useAuthStore`, `isStaff`, `useRecentlyViewed`, `PersonalizedGreeting`, `RecentlyViewedStrip`, `SuggestedForYou`.
- Produces: `<PersonalizedSection />` — `null` nếu không phải customer đăng nhập; ngược lại render greeting + strip + suggestions.

- [ ] **Step 1: Write the failing test**

Create `src/components/personalization/PersonalizedSection.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PersonalizedSection } from './PersonalizedSection'
import { useAuthStore } from '../../store/authStore'
import * as personalizationHooks from '../../features/personalization/hooks'
import * as catalogHooks from '../../features/catalog/hooks'

vi.mock('../../features/personalization/hooks')
vi.mock('../../features/catalog/hooks')

function renderSection() {
  return render(
    <MemoryRouter>
      <PersonalizedSection />
    </MemoryRouter>,
  )
}

describe('PersonalizedSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    catalogHooks.useInfiniteProducts.mockReturnValue({ data: undefined })
  })

  it('renders nothing for a guest', () => {
    useAuthStore.setState({ token: null, user: null })
    const { container } = renderSection()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an admin/staff user', () => {
    useAuthStore.setState({ token: 't', user: { name: 'Admin', roles: ['super_admin'] } })
    const { container } = renderSection()
    expect(container).toBeEmptyDOMElement()
  })

  it('greets a logged-in customer', () => {
    useAuthStore.setState({ token: 't', user: { name: 'Bảo', roles: ['customer'] } })
    renderSection()
    expect(screen.getByText(/Chào mừng trở lại, Bảo/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/personalization/PersonalizedSection.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/personalization/PersonalizedSection.jsx`:

```jsx
import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import { useRecentlyViewed } from '../../features/personalization/hooks'
import { PersonalizedGreeting } from './PersonalizedGreeting'
import { RecentlyViewedStrip } from './RecentlyViewedStrip'
import { SuggestedForYou } from './SuggestedForYou'

export function PersonalizedSection() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const isCustomer = Boolean(token) && !isStaff(user)
  const { data } = useRecentlyViewed({ enabled: isCustomer })

  if (!isCustomer) return null

  const hasHistory = (data?.data ?? []).length > 0

  return (
    <div className="mx-auto max-w-7xl px-6 pt-16 lg:px-10">
      <PersonalizedGreeting name={user?.name} hasHistory={hasHistory} />
      <RecentlyViewedStrip />
      <SuggestedForYou />
    </div>
  )
}
```

> Lưu ý: `RecentlyViewedStrip`/`SuggestedForYou` tự bọc `<section className="mx-auto max-w-7xl px-6 ...">`. Khi nằm trong wrapper này sẽ lồng max-width — chấp nhận được vì cả hai trả `null` thường xuyên và padding vẫn hợp lý. Nếu lồng gây lệch lề lúc QA, bỏ class `mx-auto max-w-7xl px-6 lg:px-10` ở wrapper `PersonalizedSection` (chỉ giữ `pt-16`). Xác nhận lúc chạy `/run`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/personalization/PersonalizedSection.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit** *(CHỜ user duyệt)*

```bash
git add src/components/personalization/PersonalizedSection.jsx src/components/personalization/PersonalizedSection.test.jsx
git commit -m "feat(fe): personalized section gate + compose"
```

---

## Task 10: FE — Wire `PersonalizedSection` into HomePage

**Files:**
- Modify: `src/pages/home/HomePage.jsx`
- Test: `src/pages/home/HomePage.test.jsx` (verify existing still passes; add render-with-section check)

**Interfaces:**
- Consumes: `PersonalizedSection` (Task 9).

- [ ] **Step 1: Update HomePage**

Replace `src/pages/home/HomePage.jsx`:

```jsx
import { Hero } from '../../components/home/Hero'
import { PersonalizedSection } from '../../components/personalization/PersonalizedSection'
import { FeaturedCategories } from '../../components/home/FeaturedCategories'
import { CuratedCollections } from '../../components/home/CuratedCollections'
import { BestSellers } from '../../components/home/BestSellers'
import { MaterialStory } from '../../components/home/MaterialStory'
import { Lookbook } from '../../components/home/Lookbook'
import { BrandStory } from '../../components/home/BrandStory'
import { Testimonials } from '../../components/home/Testimonials'
import { Newsletter } from '../../components/home/Newsletter'

export function HomePage() {
  return (
    <>
      <Hero />
      <PersonalizedSection />
      <FeaturedCategories />
      <CuratedCollections />
      <BestSellers />
      <MaterialStory />
      <Lookbook />
      <BrandStory />
      <Testimonials />
      <Newsletter />
    </>
  )
}
```

- [ ] **Step 2: Run the existing HomePage test**

Run: `npm test -- --run src/pages/home/HomePage.test.jsx`
Expected: PASS. If it fails because `PersonalizedSection`'s hooks aren't mocked and hit the network, add to the top of that test file:

```jsx
vi.mock('../../features/personalization/hooks', () => ({
  useRecentlyViewed: () => ({ data: { data: [] } }),
  useRecordProductView: () => ({ mutate: () => {} }),
}))
```

(and ensure `import { vi } from 'vitest'` is present). For a guest render (default auth state) `PersonalizedSection` returns `null` anyway, so usually no change is needed — only add the mock if the test logs a query error.

- [ ] **Step 3: Run full FE suite + lint**

Run: `npm test -- --run && npm run lint`
Expected: PASS / clean.

- [ ] **Step 4: Commit** *(CHỜ user duyệt)*

```bash
git add src/pages/home/HomePage.jsx src/pages/home/HomePage.test.jsx
git commit -m "feat(fe): show personalized section on home"
```

---

## Task 11: FE — ProductPage: record view + "Bạn vừa xem"

**Files:**
- Modify: `src/pages/product/ProductPage.jsx`
- Test: `src/pages/product/ProductPage.test.jsx`

**Interfaces:**
- Consumes: `useRecordProductView` (Task 4), `RecentlyViewedStrip` (Task 7), `isStaff`, existing `useAuthStore`.

- [ ] **Step 1: Write the failing test**

In `src/pages/product/ProductPage.test.jsx`, add a test asserting the view is recorded for a logged-in customer and NOT for a guest. Match the file's existing render helper and mocks; the key assertions:

```jsx
// At top: vi.mock('../../features/personalization/hooks')
// import * as personalizationHooks from '../../features/personalization/hooks'
// import { useAuthStore } from '../../store/authStore'

it('records a product view for a logged-in customer', async () => {
  const mutate = vi.fn()
  personalizationHooks.useRecordProductView.mockReturnValue({ mutate })
  personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
  useAuthStore.setState({ token: 't', user: { name: 'Bảo', roles: ['customer'] } })

  renderProductPage('ghe-sofa') // existing helper that resolves useProduct to a product with slug 'ghe-sofa'

  await waitFor(() => expect(mutate).toHaveBeenCalledWith('ghe-sofa'))
})

it('does not record a view for a guest', async () => {
  const mutate = vi.fn()
  personalizationHooks.useRecordProductView.mockReturnValue({ mutate })
  personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
  useAuthStore.setState({ token: null, user: null })

  renderProductPage('ghe-sofa')

  await new Promise((r) => setTimeout(r, 0))
  expect(mutate).not.toHaveBeenCalled()
})
```

> Đọc `ProductPage.test.jsx` hiện có để dùng đúng helper render + cách mock `useProduct` (trả `product.id` và `product.slug`). Nếu file chưa mock `personalization/hooks`, thêm `vi.mock` như trên; `useRecentlyViewed` phải được mock để strip không gọi mạng.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/product/ProductPage.test.jsx`
Expected: FAIL — `useRecordProductView` chưa được dùng trong ProductPage.

- [ ] **Step 3: Wire into ProductPage**

In `src/pages/product/ProductPage.jsx`:

3a. Add imports near the other feature imports:

```jsx
import { useRecordProductView } from '../../features/personalization/hooks'
import { RecentlyViewedStrip } from '../../components/personalization/RecentlyViewedStrip'
```

3b. Inside the component, after `const staff = isStaff(user)` (around line 65) add:

```jsx
  const isCustomer = Boolean(token) && !staff
  const recordView = useRecordProductView()
```

3c. Add an effect that fires once per product for customers. Place it after the existing `useEffect`s that depend on `product` (around line 91):

```jsx
  useEffect(() => {
    if (!product?.id || !isCustomer) return
    recordView.mutate(productSlug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isCustomer, productSlug])
```

3d. Render the strip for customers at the very end of the returned tree, just before the final closing `</div>` of the page (after the reviews `</section>`):

```jsx
      {isCustomer && <RecentlyViewedStrip excludeSlug={productSlug} />}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/product/ProductPage.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run full FE suite + lint**

Run: `npm test -- --run && npm run lint`
Expected: PASS / clean.

- [ ] **Step 6: Commit** *(CHỜ user duyệt)*

```bash
git add src/pages/product/ProductPage.jsx src/pages/product/ProductPage.test.jsx
git commit -m "feat(fe): record views + recently-viewed strip on product page"
```

---

## Task 12: Docs sync

**Files:**
- Modify BE `docs/FE_AI_CONTEXT.md` — thêm 2 endpoint.
- Modify BE `docs/14-workflows.md` — luồng personalization.
- Modify FE `FE-TEAM-WORKFLOW.md` — feature personalization.

- [ ] **Step 1: FE_AI_CONTEXT.md** — thêm mục mô tả:
  - `POST /api/products/{slug}/view` — authed+verified, body rỗng, `204`; `404` nếu slug không active.
  - `GET /api/me/recently-viewed?limit=1..20` (default 10) — authed+verified, `{ data: Product[] }` đúng shape list `GET /products` (dedup, mới nhất trước, chỉ active).

- [ ] **Step 2: 14-workflows.md** — thêm đoạn: customer xem ProductPage → FE `POST /products/{slug}/view` (fire-and-forget) → audit_logs `product_viewed`; `GET /me/recently-viewed` dedup PHP-side (portable); admin audit list loại `product_viewed` qua `AuditLogService::BEHAVIORAL_ACTIONS`.

- [ ] **Step 3: FE-TEAM-WORKFLOW.md** — ghi feature `personalization` (api/hooks/recommend) + 4 component + gate `token && !isStaff(user)`.

- [ ] **Step 4: Commit** *(CHỜ user duyệt)*

```bash
git add docs/FE_AI_CONTEXT.md docs/14-workflows.md FE-TEAM-WORKFLOW.md
git commit -m "docs: personalization endpoints + workflow"
```

---

## Self-Review

**Spec coverage:**
- §2.1 record view → Task 1. §2.2 read → Task 2. §2.3 category suggest → Task 5 + 8. §2.4 index → Task 2 (migration). §2.5 admin filter → Task 3.
- §3.1 feature folder → Task 4. §3.2 components → Tasks 6–9. §3.3 ProductPage → Task 11. HomePage wiring → Task 10.
- §4 error handling → fire-and-forget (Task 11 effect, no error branch), null-on-empty (Tasks 7–9). §5 testing → mỗi task có test. §6 docs → Task 12.

**Placeholder scan:** không có TODO/TBD; mọi step có code/command thật.

**Type consistency:** `RecentlyViewedService::VIEW_ACTION` (Task 1) dùng lại ở Task 2; `useRecentlyViewed({ enabled, limit })` ký nhất quán Tasks 4/7/8/9; `topCategorySlug` ký nhất quán Tasks 5/8; `useInfiniteProducts(filters, { enabled })` mở rộng Task 4 dùng ở Task 8.

**Lưu ý implement:** read query cố tình KHÔNG dùng `DISTINCT ON` (dedup PHP) để chạy được trên sqlite test lẫn Postgres prod — đây là giải pháp cho rủi ro đã nêu ở spec §5.
