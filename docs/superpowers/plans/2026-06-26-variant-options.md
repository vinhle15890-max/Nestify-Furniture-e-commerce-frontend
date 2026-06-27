# Variant Options (Shopify-style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép admin định nghĩa Option (Màu sắc/Kích thước/Chất liệu…) rồi tự sinh ma trận biến thể; storefront cho khách chọn theo từng thuộc tính (swatch màu thật cho option màu).

**Architecture:** Lưu định nghĩa option trong cột jsonb `products.variant_options` (0 bảng mới). Mỗi `product_variant.attributes` (jsonb đã có) map `{tên option: label}`. Tên biến thể tự suy ra từ attributes. Một endpoint bulk tạo các tổ hợp còn thiếu (idempotent theo "chữ ký" attributes). Storefront render bộ chọn theo option, resolve ra variant.

**Tech Stack:** Laravel 13 (PHP 8.4, pgsql jsonb), React 18 + Vite (plain JSX), TanStack Query v5, React Hook Form + Yup, Vitest + RTL.

## Global Constraints

- **KHÔNG commit cho tới khi user yêu cầu** (quy ước cố định của user). Mỗi task kết bằng bước **stage** (`git add`) + ghi chú giữ commit; KHÔNG chạy `git commit`. Cuối plan có cổng xin phép commit.
- **Không TypeScript** ở FE — chỉ `.js`/`.jsx`. Path alias `@/` → `src/`.
- **Design tokens FE giữ nguyên** — dùng class semantic (`bg-surface`, `text-foreground`, `border-border`, `bg-accent`…), không hardcode hex (trừ hex màu do admin nhập cho swatch — đó là dữ liệu, không phải token).
- **UI copy tiếng Việt.** Icon dùng lucide-react, không emoji.
- **Chạy test BE** bằng Docker sqlite (image `nestify-furniture-e-commerce-backend-app:latest`):
  ```bash
  cd Nestify-Furniture-e-commerce-backend/src && docker run --rm --entrypoint sh \
    -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: -e CACHE_STORE=array \
    -v "$PWD":/var/www -w /var/www nestify-furniture-e-commerce-backend-app:latest \
    -c 'php artisan config:clear; php artisan route:clear; php artisan test <path>'
  ```
- **Chạy test FE:** `cd Nestify-Furniture-e-commerce-frontend && npx vitest run <path>`; trước khi xong: `npm run lint` sạch.
- **Đường dẫn gốc:** BE = `Nestify-Furniture-e-commerce-backend/src/`, FE = `Nestify-Furniture-e-commerce-frontend/`.
- **variant_options shape:** `[{ "name": string, "type": "text"|"color", "values": [{ "label": string, "hex"?: string }] }]`. `hex` bắt buộc khi `type=color`, khớp regex `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/`.
- **Chữ ký tổ hợp (signature):** nối các label theo **đúng thứ tự option** trong `variant_options`, ngăn bằng ký tự `` (không in được, tránh đụng nội dung label). Tên biến thể = nối label theo cùng thứ tự, ngăn bằng `" / "`.

---

## File Structure

**Backend** (`Nestify-Furniture-e-commerce-backend/src/`)
- `database/migrations/2026_06_27_000000_add_variant_options_to_products_table.php` — cột jsonb.
- `app/Models/Product.php` — fillable + cast.
- `app/Http/Resources/ProductResource.php` — expose `variant_options`.
- `app/Http/Requests/Product/CreateProductRequest.php`, `UpdateProductRequest.php` — validate `variant_options`.
- `app/Services/ProductService.php` — `variantSignature`, `deriveVariantName`, `assertAttributesMatchOptions`, `bulkCreateVariants`.
- `app/Http/Controllers/Admin/ProductVariantController.php` — auto name + validate attributes + `bulkStore`.
- `routes/api.php` — route bulk.
- Tests: `tests/Feature/Admin/VariantOptionsTest.php`, bổ sung `tests/Feature/Admin/VariantSkuAutogenTest.php`.

**Frontend** (`Nestify-Furniture-e-commerce-frontend/`)
- `src/lib/variantOptions.js` — pure helpers (cartesian, signature, diff, resolve).
- `src/features/admin/products/api.js` + `hooks.js` — `bulkCreateVariants` + hook.
- `src/pages/admin/products/VariantOptionsPanel.jsx` — editor option (type + color picker).
- `src/pages/admin/products/VariantMatrixGenerator.jsx` — sinh ma trận + bảng inline + gọi bulk.
- `src/pages/admin/products/AdminProductEditPage.jsx` — gắn 2 component trên.
- `src/pages/product/ProductPage.jsx` + `ProductOptions.jsx` (mới) — bộ chọn option storefront.
- Tests colocated `*.test.jsx`/`*.test.js`.

---

## Task 1: BE — cột `variant_options` + model + resource

**Files:**
- Create: `Nestify-Furniture-e-commerce-backend/src/database/migrations/2026_06_27_000000_add_variant_options_to_products_table.php`
- Modify: `app/Models/Product.php` (fillable dòng 13, casts dòng 14)
- Modify: `app/Http/Resources/ProductResource.php` (sau `attributes`)
- Test: `tests/Feature/Admin/VariantOptionsTest.php`

**Interfaces:**
- Produces: `products.variant_options` (array, default `[]`) trả về trong ProductResource dưới key `variant_options`.

- [ ] **Step 1: Viết test fail** — tạo `tests/Feature/Admin/VariantOptionsTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VariantOptionsTest extends TestCase
{
    use RefreshDatabase;

    private array $options = [
        ['name' => 'Màu sắc', 'type' => 'color', 'values' => [
            ['label' => 'Đỏ', 'hex' => '#C0392B'], ['label' => 'Xanh', 'hex' => '#2E5FCC'],
        ]],
        ['name' => 'Kích thước', 'type' => 'text', 'values' => [
            ['label' => 'S'], ['label' => 'M'],
        ]],
    ];

    public function test_update_persists_and_returns_variant_options(): void
    {
        $admin   = $this->makeSuperAdmin();
        $product = Product::factory()->create();

        $this->actingAs($admin)
            ->patchJson("/api/admin/products/{$product->id}", ['variant_options' => $this->options])
            ->assertOk()
            ->assertJsonPath('data.variant_options.0.name', 'Màu sắc')
            ->assertJsonPath('data.variant_options.0.values.0.hex', '#C0392B');

        $this->assertSame($this->options, $product->fresh()->variant_options);
    }
}
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `... php artisan test tests/Feature/Admin/VariantOptionsTest.php`
Expected: FAIL (cột `variant_options` chưa tồn tại / không trả về).

- [ ] **Step 3: Tạo migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->jsonb('variant_options')->default('[]')->after('attributes');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('variant_options');
        });
    }
};
```

- [ ] **Step 4: Model** — `app/Models/Product.php`, thêm `variant_options` vào `$fillable` và cast:

```php
    protected $fillable = ['category_id','name','slug','description','meta_title','meta_description','focus_keyword','attributes','variant_options','status'];
    protected $casts    = ['attributes' => 'array', 'variant_options' => 'array', 'status' => ProductStatus::class];
```

- [ ] **Step 5: Resource** — `app/Http/Resources/ProductResource.php`, thêm sau dòng `'attributes' => $this->attributes,`:

```php
            'variant_options' => $this->variant_options ?? [],
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `... php artisan test tests/Feature/Admin/VariantOptionsTest.php`
Expected: PASS.

- [ ] **Step 7: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-backend/src && git add database/migrations/2026_06_27_000000_add_variant_options_to_products_table.php app/Models/Product.php app/Http/Resources/ProductResource.php tests/Feature/Admin/VariantOptionsTest.php
# KHÔNG commit — chờ user cho phép
```

---

## Task 2: BE — validate `variant_options` trong Product requests

**Files:**
- Modify: `app/Http/Requests/Product/UpdateProductRequest.php`, `CreateProductRequest.php`
- Test: `tests/Feature/Admin/VariantOptionsTest.php` (thêm)

**Interfaces:**
- Consumes: route `PATCH/POST /api/admin/products` đã có.
- Produces: từ chối `variant_options` sai cấu trúc với `422 VALIDATION_FAILED`.

- [ ] **Step 1: Viết test fail** — thêm vào `VariantOptionsTest.php`:

```php
    public function test_rejects_color_option_without_hex(): void
    {
        $admin   = $this->makeSuperAdmin();
        $product = Product::factory()->create();

        $this->actingAs($admin)
            ->patchJson("/api/admin/products/{$product->id}", ['variant_options' => [
                ['name' => 'Màu sắc', 'type' => 'color', 'values' => [['label' => 'Đỏ']]],
            ]])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_accepts_valid_variant_options(): void
    {
        $admin   = $this->makeSuperAdmin();
        $product = Product::factory()->create();

        $this->actingAs($admin)
            ->patchJson("/api/admin/products/{$product->id}", ['variant_options' => $this->options])
            ->assertOk();
    }
```

- [ ] **Step 2: Chạy test, xác nhận `test_rejects_color_option_without_hex` FAIL** (hiện chưa validate → 200).

Run: `... php artisan test tests/Feature/Admin/VariantOptionsTest.php`

- [ ] **Step 3: Thêm rules** — trong `UpdateProductRequest.php` và `CreateProductRequest.php`, thêm vào mảng `rules()` (cùng kiểu với rule `attributes`):

```php
            'variant_options'                 => ['nullable', 'array'],
            'variant_options.*.name'          => ['required_with:variant_options', 'string', 'max:100'],
            'variant_options.*.type'          => ['required_with:variant_options', 'in:text,color'],
            'variant_options.*.values'        => ['required_with:variant_options', 'array', 'min:1'],
            'variant_options.*.values.*.label'=> ['required', 'string', 'max:100'],
            'variant_options.*.values.*.hex'  => ['nullable', 'regex:/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/'],
```

Và thêm validation đệ quy "hex bắt buộc khi type=color" + "label/tên duy nhất" trong `withValidator()` (thêm method nếu chưa có):

```php
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach ((array) $this->input('variant_options', []) as $i => $option) {
                $type   = $option['type'] ?? null;
                $labels = array_column($option['values'] ?? [], 'label');
                if (count($labels) !== count(array_unique($labels))) {
                    $validator->errors()->add("variant_options.$i.values", 'Các giá trị trong một thuộc tính không được trùng nhau.');
                }
                if ($type === 'color') {
                    foreach (($option['values'] ?? []) as $j => $value) {
                        if (empty($value['hex'])) {
                            $validator->errors()->add("variant_options.$i.values.$j.hex", 'Thuộc tính màu cần mã màu (hex).');
                        }
                    }
                }
            }
            $names = array_column((array) $this->input('variant_options', []), 'name');
            if (count($names) !== count(array_unique($names))) {
                $validator->errors()->add('variant_options', 'Tên thuộc tính không được trùng nhau.');
            }
        });
    }
```

> Nếu request đã có `withValidator()`, gộp khối `$validator->after(...)` vào trong, đừng khai trùng method.

- [ ] **Step 4: Chạy test, xác nhận PASS** (cả `test_rejects_color_option_without_hex` và `test_accepts_valid_variant_options`).

Run: `... php artisan test tests/Feature/Admin/VariantOptionsTest.php`

- [ ] **Step 5: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-backend/src && git add app/Http/Requests/Product/ tests/Feature/Admin/VariantOptionsTest.php
```

---

## Task 3: BE — signature, tên tự suy ra, validate attributes ↔ options

**Files:**
- Modify: `app/Services/ProductService.php` (thêm 3 method + dùng trong `createVariant`)
- Modify: `app/Http/Controllers/Admin/ProductVariantController.php` (store/update)
- Test: `tests/Feature/Admin/VariantOptionsTest.php` (thêm)

**Interfaces:**
- Produces:
  - `ProductService::variantSignature(array $attributes, array $options): string`
  - `ProductService::deriveVariantName(array $attributes, array $options): string`
  - `ProductService::assertAttributesMatchOptions(array $attributes, array $options): void` (throws `ValidationException` khi lệch)
- Consumes: `Product::$variant_options`, `createVariant` (Task 1).

- [ ] **Step 1: Viết test fail** — thêm vào `VariantOptionsTest.php`:

```php
    public function test_variant_name_is_derived_from_attributes_in_option_order(): void
    {
        $admin   = $this->makeSuperAdmin();
        $product = Product::factory()->create(['variant_options' => $this->options]);

        $this->actingAs($admin)
            ->postJson("/api/admin/products/{$product->id}/variants", [
                'attributes'     => ['Kích thước' => 'S', 'Màu sắc' => 'Đỏ'], // cố tình sai thứ tự
                'price'          => 1000,
                'stock_quantity' => 5,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Đỏ / S'); // theo thứ tự option, không theo thứ tự gửi lên
    }

    public function test_variant_attributes_must_match_defined_options(): void
    {
        $admin   = $this->makeSuperAdmin();
        $product = Product::factory()->create(['variant_options' => $this->options]);

        $this->actingAs($admin)
            ->postJson("/api/admin/products/{$product->id}/variants", [
                'attributes'     => ['Màu sắc' => 'Tím', 'Kích thước' => 'S'], // 'Tím' không có
                'price'          => 1000,
                'stock_quantity' => 5,
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** (name hiện lấy từ client / không validate).

Run: `... php artisan test tests/Feature/Admin/VariantOptionsTest.php`

- [ ] **Step 3: Thêm method vào `ProductService`** (đầu file đảm bảo `use Illuminate\Validation\ValidationException;`):

```php
    private const SIG_SEP = "\x01";

    /** Chữ ký tổ hợp: nối label theo đúng thứ tự option. */
    public function variantSignature(array $attributes, array $options): string
    {
        $parts = [];
        foreach ($options as $option) {
            $parts[] = (string) ($attributes[$option['name']] ?? '');
        }
        return implode(self::SIG_SEP, $parts);
    }

    /** Tên biến thể tự suy ra = nối label theo thứ tự option, ngăn bằng " / ". */
    public function deriveVariantName(array $attributes, array $options): string
    {
        $parts = [];
        foreach ($options as $option) {
            if (isset($attributes[$option['name']]) && $attributes[$option['name']] !== '') {
                $parts[] = $attributes[$option['name']];
            }
        }
        return implode(' / ', $parts);
    }

    /** Mỗi key attributes phải là 1 option, value phải nằm trong tập label khai báo. */
    public function assertAttributesMatchOptions(array $attributes, array $options): void
    {
        $allowed = [];
        foreach ($options as $option) {
            $allowed[$option['name']] = array_column($option['values'], 'label');
        }
        foreach ($attributes as $name => $label) {
            if (! array_key_exists($name, $allowed) || ! in_array($label, $allowed[$name], true)) {
                throw ValidationException::withMessages([
                    'attributes' => "Thuộc tính \"{$name}: {$label}\" không khớp tùy chọn sản phẩm.",
                ]);
            }
        }
    }
```

- [ ] **Step 4: Dùng trong `createVariant`** — sửa `ProductService::createVariant` để tự set name khi product có options:

```php
    public function createVariant(int $productId, array $data): ProductVariant
    {
        $product = Product::findOrFail($productId);
        $options = $product->variant_options ?? [];

        if (! empty($options) && ! empty($data['attributes'])) {
            $this->assertAttributesMatchOptions($data['attributes'], $options);
            $data['name'] = $this->deriveVariantName($data['attributes'], $options);
        }

        if (empty($data['sku'])) {
            $data['sku'] = $this->generateSku($product);
        }

        $variant = $product->variants()->create($data);
        Log::info('ProductService: variant created', ['product_id' => $productId, 'variant_id' => $variant->id]);

        return $variant;
    }
```

- [ ] **Step 5: Controller cho phép name optional khi có options** — `ProductVariantController::store`, đổi rule `name` thành `nullable` và thêm `attributes` đã có. Rule mới cho store:

```php
            'sku'            => ['nullable', 'string', 'max:100', 'unique:product_variants,sku'],
            'name'           => ['nullable', 'string', 'max:255'],
            'price'          => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'attributes'     => ['nullable', 'array'],
            'model_3d_url'   => ['nullable', 'string', 'url', 'max:500'],
```

> Khi product KHÔNG có options, `name` vẫn nên có — thêm guard trong controller: nếu `empty($options)` và `empty($data['name'])` → `ValidationException` "Vui lòng nhập tên phiên bản." Giữ hành vi cũ.

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `... php artisan test tests/Feature/Admin/VariantOptionsTest.php`
Đồng thời chạy `tests/Feature/Admin/VariantSkuAutogenTest.php` để chắc không vỡ:
`... php artisan test tests/Feature/Admin/VariantSkuAutogenTest.php tests/Feature/Admin/VariantOptionsTest.php`

- [ ] **Step 7: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-backend/src && git add app/Services/ProductService.php app/Http/Controllers/Admin/ProductVariantController.php tests/Feature/Admin/VariantOptionsTest.php
```

---

## Task 4: BE — endpoint bulk tạo ma trận tổ hợp

**Files:**
- Modify: `app/Services/ProductService.php` (`bulkCreateVariants`)
- Modify: `app/Http/Controllers/Admin/ProductVariantController.php` (`bulkStore`)
- Modify: `routes/api.php` (route trong group `manage_products`)
- Test: `tests/Feature/Admin/VariantOptionsTest.php` (thêm)

**Interfaces:**
- Produces: `POST /api/admin/products/{id}/variants/bulk` → `201 { data: [ProductVariantResource] }`. Bỏ qua tổ hợp đã tồn tại (idempotent).
- Consumes: `variantSignature`, `createVariant` (Task 3).

- [ ] **Step 1: Viết test fail** — thêm:

```php
    public function test_bulk_creates_missing_combinations_and_skips_existing(): void
    {
        $admin   = $this->makeSuperAdmin();
        $product = Product::factory()->create(['variant_options' => $this->options]);

        // Đã có sẵn 1 tổ hợp Đỏ/S
        $this->actingAs($admin)->postJson("/api/admin/products/{$product->id}/variants", [
            'attributes' => ['Màu sắc' => 'Đỏ', 'Kích thước' => 'S'], 'price' => 1000, 'stock_quantity' => 1,
        ])->assertCreated();

        // Bulk gửi cả 4 tổ hợp (Đỏ/S, Đỏ/M, Xanh/S, Xanh/M)
        $payload = ['variants' => []];
        foreach (['Đỏ', 'Xanh'] as $color) {
            foreach (['S', 'M'] as $size) {
                $payload['variants'][] = [
                    'attributes' => ['Màu sắc' => $color, 'Kích thước' => $size],
                    'price' => 2000, 'stock_quantity' => 3,
                ];
            }
        }

        $this->actingAs($admin)
            ->postJson("/api/admin/products/{$product->id}/variants/bulk", $payload)
            ->assertCreated();

        // Tổng đúng 4 (không nhân đôi Đỏ/S)
        $this->assertCount(4, $product->fresh()->variants);
        // Đỏ/S giữ giá cũ 1000 (skip), không bị ghi đè 2000
        $this->assertDatabaseHas('product_variants', ['name' => 'Đỏ / S', 'price' => 1000]);
    }
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** (route bulk chưa có → 404/405).

- [ ] **Step 3: `ProductService::bulkCreateVariants`:**

```php
    /**
     * Tạo các tổ hợp còn thiếu (idempotent theo signature). Trả về toàn bộ variants của product.
     * @param  array<int,array{attributes:array,price:numeric,stock_quantity:int,sku?:?string}>  $rows
     */
    public function bulkCreateVariants(int $productId, array $rows): \Illuminate\Support\Collection
    {
        $product = Product::findOrFail($productId);
        $options = $product->variant_options ?? [];

        return DB::transaction(function () use ($product, $options, $rows) {
            $existing = $product->variants()->get()
                ->map(fn ($v) => $this->variantSignature($v->attributes ?? [], $options))
                ->all();

            foreach ($rows as $row) {
                $attributes = $row['attributes'] ?? [];
                $sig = $this->variantSignature($attributes, $options);
                if (in_array($sig, $existing, true)) {
                    continue; // đã có → bỏ qua
                }
                $this->createVariant($product->id, [
                    'attributes'     => $attributes,
                    'price'          => $row['price'],
                    'stock_quantity' => $row['stock_quantity'],
                    'sku'            => $row['sku'] ?? null,
                ]);
                $existing[] = $sig;
            }

            return $product->fresh()->variants;
        });
    }
```

> Đảm bảo `use Illuminate\Support\Facades\DB;` đã có ở đầu `ProductService` (đã dùng ở `create`).

- [ ] **Step 4: Controller `bulkStore`** — thêm method vào `ProductVariantController`:

```php
    public function bulkStore(Request $request, int $productId): JsonResponse
    {
        $data = $request->validate([
            'variants'                  => ['required', 'array', 'min:1'],
            'variants.*.attributes'     => ['required', 'array'],
            'variants.*.price'          => ['required', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['required', 'integer', 'min:0'],
            'variants.*.sku'            => ['nullable', 'string', 'max:100'],
        ]);

        $product = Product::find($productId);
        if (! $product) {
            return response()->json(['error' => ['code' => 'NOT_FOUND', 'message' => 'Sản phẩm không tồn tại.']], 404);
        }

        foreach ($data['variants'] as $row) {
            $this->service->assertAttributesMatchOptions($row['attributes'], $product->variant_options ?? []);
        }

        $variants = $this->service->bulkCreateVariants($productId, $data['variants']);

        return response()->json(['data' => ProductVariantResource::collection($variants)], 201);
    }
```

> Thêm `use App\Models\Product;` và `use Illuminate\Http\Request;` nếu chưa có. `$this->service` là `ProductService` đã inject trong controller (kiểm tra constructor; nếu chưa inject thì thêm).

- [ ] **Step 5: Route** — `routes/api.php`, trong group `check.permission:manage_products`, **trước** dòng `Route::post('products/{id}/variants', ...)`:

```php
        Route::post('products/{id}/variants/bulk', [AdminProductVariantController::class, 'bulkStore']);
```

- [ ] **Step 6: Chạy test, xác nhận PASS** + chạy lại full file.

Run: `... php artisan test tests/Feature/Admin/VariantOptionsTest.php`

- [ ] **Step 7: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-backend/src && git add app/Services/ProductService.php app/Http/Controllers/Admin/ProductVariantController.php routes/api.php tests/Feature/Admin/VariantOptionsTest.php
```

---

## Task 5: FE — pure helpers `variantOptions.js`

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/lib/variantOptions.js`
- Test: `src/lib/variantOptions.test.js`

**Interfaces:**
- Produces:
  - `cartesianVariants(options): Array<Record<string,string>>` — mọi tổ hợp `{tên option: label}`.
  - `variantSignature(attributes, options): string` — khớp BE (sep `""`).
  - `missingCombinations(options, variants): Array<Record<string,string>>` — tổ hợp chưa có biến thể.
  - `resolveVariant(selected, variants, options): variant|null` — tìm variant khớp lựa chọn.

- [ ] **Step 1: Viết test fail** — `src/lib/variantOptions.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { cartesianVariants, variantSignature, missingCombinations, resolveVariant } from './variantOptions'

const options = [
  { name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#f00' }, { label: 'Xanh', hex: '#00f' }] },
  { name: 'Kích thước', type: 'text', values: [{ label: 'S' }, { label: 'M' }] },
]

describe('variantOptions', () => {
  it('cartesianVariants sinh đủ tổ hợp', () => {
    expect(cartesianVariants(options)).toHaveLength(4)
    expect(cartesianVariants(options)[0]).toEqual({ 'Màu sắc': 'Đỏ', 'Kích thước': 'S' })
  })

  it('signature không phụ thuộc thứ tự key đầu vào', () => {
    const a = variantSignature({ 'Kích thước': 'S', 'Màu sắc': 'Đỏ' }, options)
    const b = variantSignature({ 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }, options)
    expect(a).toBe(b)
  })

  it('missingCombinations loại tổ hợp đã có', () => {
    const variants = [{ attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' } }]
    const missing = missingCombinations(options, variants)
    expect(missing).toHaveLength(3)
  })

  it('resolveVariant tìm đúng biến thể', () => {
    const variants = [
      { id: 1, attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' } },
      { id: 2, attributes: { 'Màu sắc': 'Xanh', 'Kích thước': 'M' } },
    ]
    expect(resolveVariant({ 'Màu sắc': 'Xanh', 'Kích thước': 'M' }, variants, options)?.id).toBe(2)
    expect(resolveVariant({ 'Màu sắc': 'Xanh', 'Kích thước': 'S' }, variants, options)).toBeNull()
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/lib/variantOptions.test.js`
Expected: FAIL (module chưa tồn tại).

- [ ] **Step 3: Implement** — `src/lib/variantOptions.js`:

```js
const SIG_SEP = ''

// Mọi tổ hợp {tên option: label} theo thứ tự option.
export function cartesianVariants(options) {
  if (!Array.isArray(options) || options.length === 0) return []
  return options.reduce(
    (acc, option) =>
      acc.flatMap((combo) => option.values.map((v) => ({ ...combo, [option.name]: v.label }))),
    [{}],
  )
}

// Chữ ký nối label theo thứ tự option — khớp BE.
export function variantSignature(attributes, options) {
  return options.map((option) => String(attributes?.[option.name] ?? '')).join(SIG_SEP)
}

// Tổ hợp chưa có biến thể.
export function missingCombinations(options, variants) {
  const existing = new Set((variants ?? []).map((v) => variantSignature(v.attributes ?? {}, options)))
  return cartesianVariants(options).filter((combo) => !existing.has(variantSignature(combo, options)))
}

// Tìm variant khớp lựa chọn hiện tại; null nếu không có.
export function resolveVariant(selected, variants, options) {
  const target = variantSignature(selected, options)
  return (variants ?? []).find((v) => variantSignature(v.attributes ?? {}, options) === target) ?? null
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/lib/variantOptions.test.js`

- [ ] **Step 5: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/lib/variantOptions.js src/lib/variantOptions.test.js
```

---

## Task 6: FE — API + hook bulk

**Files:**
- Modify: `src/features/admin/products/api.js`
- Modify: `src/features/admin/products/hooks.js`

**Interfaces:**
- Produces: `bulkCreateVariants(productId, variants)` (api) + `useBulkCreateVariants()` (hook trả mutation, invalidate `['admin','products']`).

- [ ] **Step 1: api.js** — thêm sau `createVariant`:

```js
export function bulkCreateVariants(productId, variants) {
  return apiClient.post(`/admin/products/${productId}/variants/bulk`, { variants })
}
```

- [ ] **Step 2: hooks.js** — thêm hook (theo mẫu `useCreateVariant`):

```js
export function useBulkCreateVariants() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, variants }) => productsApi.bulkCreateVariants(productId, variants),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}
```

> Kiểm tra `productsApi`, `useMutation`, `useQueryClient` đã import sẵn ở đầu `hooks.js` (đã dùng cho các hook khác).

- [ ] **Step 3: Lint** — `npm run lint` sạch.

- [ ] **Step 4: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/features/admin/products/api.js src/features/admin/products/hooks.js
```

---

## Task 7: FE — Panel "Tùy chọn" (option editor + color picker)

**Files:**
- Create: `src/pages/admin/products/VariantOptionsPanel.jsx`
- Test: `src/pages/admin/products/VariantOptionsPanel.test.jsx`

**Interfaces:**
- Consumes: `value: Array<option>`, `onChange(nextOptions)`.
- Produces: component controlled — render danh sách option (tên + chọn type text/màu) + values; option màu hiện `<input type=color>` cho mỗi value.

- [ ] **Step 1: Viết test fail** — `VariantOptionsPanel.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VariantOptionsPanel } from './VariantOptionsPanel'

describe('VariantOptionsPanel', () => {
  it('thêm một thuộc tính mới qua onChange', async () => {
    const onChange = vi.fn()
    render(<VariantOptionsPanel value={[]} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm thuộc tính' }))

    expect(onChange).toHaveBeenCalledWith([
      { name: '', type: 'text', values: [] },
    ])
  })

  it('hiển thị color picker khi type=color', () => {
    render(
      <VariantOptionsPanel
        value={[{ name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#C0392B' }] }]}
        onChange={() => {}}
      />,
    )
    expect(screen.getByDisplayValue('#C0392B')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/pages/admin/products/VariantOptionsPanel.test.jsx`

- [ ] **Step 3: Implement** — `VariantOptionsPanel.jsx` (dùng primitives sẵn có; tham khảo Panel/Input/Button trong admin):

```jsx
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'

// Editor controlled cho products.variant_options.
// value: [{ name, type:'text'|'color', values:[{label, hex?}] }]
export function VariantOptionsPanel({ value, onChange }) {
  const options = value ?? []

  const update = (next) => onChange(next)
  const patchOption = (i, patch) => update(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))

  const addOption = () => update([...options, { name: '', type: 'text', values: [] }])
  const removeOption = (i) => update(options.filter((_, idx) => idx !== i))

  const addValue = (i) =>
    patchOption(i, { values: [...options[i].values, options[i].type === 'color' ? { label: '', hex: '#000000' } : { label: '' }] })
  const patchValue = (i, j, patch) =>
    patchOption(i, { values: options[i].values.map((v, idx) => (idx === j ? { ...v, ...patch } : v)) })
  const removeValue = (i, j) => patchOption(i, { values: options[i].values.filter((_, idx) => idx !== j) })

  return (
    <div className="flex flex-col gap-5">
      {options.map((option, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Tên thuộc tính"
                value={option.name}
                onChange={(e) => patchOption(i, { name: e.target.value })}
                placeholder="vd: Màu sắc"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Loại</label>
              <select
                aria-label={`Loại thuộc tính ${i + 1}`}
                value={option.type}
                onChange={(e) => patchOption(i, { type: e.target.value })}
                className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="text">Chữ</option>
                <option value="color">Màu sắc</option>
              </select>
            </div>
            <Button type="button" variant="secondary" aria-label="Xóa thuộc tính" onClick={() => removeOption(i)}>
              <Trash2 size={16} />
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {option.values.map((v, j) => (
              <div key={j} className="flex items-center gap-2">
                {option.type === 'color' && (
                  <input
                    type="color"
                    aria-label={`Màu giá trị ${j + 1}`}
                    value={v.hex ?? '#000000'}
                    onChange={(e) => patchValue(i, j, { hex: e.target.value })}
                    className="h-9 w-12 rounded-control border border-border"
                  />
                )}
                <input
                  aria-label={`Giá trị ${j + 1}`}
                  value={v.label}
                  onChange={(e) => patchValue(i, j, { label: e.target.value })}
                  placeholder="vd: Đỏ"
                  className="flex-1 rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="button" aria-label="Xóa giá trị" onClick={() => removeValue(i, j)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addValue(i)}
              className="inline-flex w-fit items-center gap-1.5 text-sm text-foreground hover:text-accent"
            >
              <Plus size={15} /> Thêm giá trị
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addOption} className="w-fit">
        <Plus size={16} /> Thêm thuộc tính
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/pages/admin/products/VariantOptionsPanel.test.jsx`

- [ ] **Step 5: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/pages/admin/products/VariantOptionsPanel.jsx src/pages/admin/products/VariantOptionsPanel.test.jsx
```

---

## Task 8: FE — Sinh ma trận + gắn vào trang sửa sản phẩm

**Files:**
- Create: `src/pages/admin/products/VariantMatrixGenerator.jsx`
- Test: `src/pages/admin/products/VariantMatrixGenerator.test.jsx`
- Modify: `src/pages/admin/products/AdminProductEditPage.jsx` (gắn `VariantOptionsPanel` + `VariantMatrixGenerator`)

**Interfaces:**
- Consumes: `options`, `variants`, `productId`, helper `missingCombinations` (Task 5), `useBulkCreateVariants` (Task 6).
- Produces: bảng tổ hợp còn thiếu + ô "giá gốc" + nút "Tạo biến thể"; cảnh báo khi >50 tổ hợp.

- [ ] **Step 1: Viết test fail** — `VariantMatrixGenerator.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VariantMatrixGenerator } from './VariantMatrixGenerator'
import * as api from '../../../features/admin/products/api'

vi.mock('../../../features/admin/products/api')

const options = [
  { name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#f00' }] },
  { name: 'Kích thước', type: 'text', values: [{ label: 'S' }, { label: 'M' }] },
]

function renderGen(props) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <VariantMatrixGenerator productId={7} options={options} variants={[]} {...props} />
    </QueryClientProvider>,
  )
}

describe('VariantMatrixGenerator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gọi bulk với các tổ hợp còn thiếu', async () => {
    api.bulkCreateVariants.mockResolvedValue({ data: [] })
    renderGen()

    await userEvent.type(screen.getByLabelText('Giá gốc'), '1500')
    await userEvent.click(screen.getByRole('button', { name: /Tạo .* biến thể/ }))

    expect(api.bulkCreateVariants).toHaveBeenCalledWith(7, [
      { attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }, price: 1500, stock_quantity: 0 },
      { attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'M' }, price: 1500, stock_quantity: 0 },
    ])
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/pages/admin/products/VariantMatrixGenerator.test.jsx`

- [ ] **Step 3: Implement** — `VariantMatrixGenerator.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { useToastStore } from '../../../store/toastStore'
import { useBulkCreateVariants } from '../../../features/admin/products/hooks'
import { missingCombinations } from '../../../lib/variantOptions'

export function VariantMatrixGenerator({ productId, options, variants, onCreated }) {
  const addToast = useToastStore((s) => s.addToast)
  const bulkCreate = useBulkCreateVariants()
  const [basePrice, setBasePrice] = useState('')

  const missing = useMemo(() => missingCombinations(options ?? [], variants ?? []), [options, variants])
  const optionNames = (options ?? []).map((o) => o.name)

  const ready = (options ?? []).length > 0 && (options ?? []).every((o) => o.name && o.values.length > 0)

  const handleGenerate = async () => {
    if (missing.length > 50 && !window.confirm(`Sẽ tạo ${missing.length} biến thể. Tiếp tục?`)) return
    const price = Number(basePrice) || 0
    try {
      const res = await bulkCreate.mutateAsync({
        productId,
        variants: missing.map((attributes) => ({ attributes, price, stock_quantity: 0 })),
      })
      addToast({ title: `Đã tạo ${missing.length} biến thể.`, variant: 'success' })
      onCreated?.(res.data)
    } catch (error) {
      addToast({ title: 'Không thể tạo biến thể.', description: error.message, variant: 'error' })
    }
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Thêm thuộc tính và giá trị để sinh biến thể.</p>
  }

  if (missing.length === 0) {
    return <p className="text-sm text-muted-foreground">Mọi tổ hợp đã có biến thể.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>{optionNames.map((n) => <th key={n} className="px-3 py-2">{n}</th>)}</tr>
          </thead>
          <tbody>
            {missing.map((combo, idx) => (
              <tr key={idx} className="border-t border-border">
                {optionNames.map((n) => <td key={n} className="px-3 py-2 text-foreground">{combo[n]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-end gap-3">
        <div className="w-40">
          <Input label="Giá gốc" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </div>
        <Button type="button" onClick={handleGenerate} disabled={bulkCreate.isPending}>
          Tạo {missing.length} biến thể
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/pages/admin/products/VariantMatrixGenerator.test.jsx`

- [ ] **Step 5: Gắn vào `AdminProductEditPage.jsx`** — import 2 component, thêm một Panel "Biến thể theo thuộc tính" ở khu vực biến thể. `variant_options` lưu vào state form sản phẩm và gửi kèm khi update product (qua `toProductPayload`/`updateProduct`). Tối thiểu:

```jsx
import { VariantOptionsPanel } from './VariantOptionsPanel'
import { VariantMatrixGenerator } from './VariantMatrixGenerator'
// ... trong component, sau khi đã có `product`:
// const [variantOptions, setVariantOptions] = useState(product?.variant_options ?? [])
// Lưu: gọi updateProduct({ id, variant_options: variantOptions, ...payload }) trong onSubmit hiện có.
// Render:
<section className="...">
  <h3 className="font-display text-lg text-foreground">Thuộc tính biến thể</h3>
  <VariantOptionsPanel value={variantOptions} onChange={setVariantOptions} />
  <VariantMatrixGenerator productId={product.id} options={variantOptions} variants={product.variants ?? []} onCreated={refetch} />
</section>
```

> Đọc `AdminProductEditPage.jsx` trước để đặt đúng chỗ (khu vực biến thể bên phải) và dùng đúng cách lưu/`refetch` hiện có. `toProductPayload` (trong `productForm.js`) cần thêm `variant_options` để gửi lên BE.

- [ ] **Step 6: Cập nhật `productForm.js`** — trong `toProductPayload(values)` thêm `variant_options: values.variant_options ?? []` (và thêm field vào schema nếu schema strip field lạ).

- [ ] **Step 7: Chạy test liên quan + lint**

Run: `npx vitest run src/pages/admin/products/ && npm run lint`
Expected: PASS, lint sạch. (Cập nhật `AdminProductEditPage.test.jsx` nếu render mới làm hỏng — mock `VariantMatrixGenerator`/`VariantOptionsPanel` nếu cần, theo cách đã mock `RichTextEditor`.)

- [ ] **Step 8: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/pages/admin/products/VariantMatrixGenerator.jsx src/pages/admin/products/VariantMatrixGenerator.test.jsx src/pages/admin/products/AdminProductEditPage.jsx src/pages/admin/products/productForm.js
```

---

## Task 9: FE — Storefront: bộ chọn option (swatch + nút)

**Files:**
- Create: `src/pages/product/ProductOptions.jsx`
- Test: `src/pages/product/ProductOptions.test.jsx`
- Modify: `src/pages/product/ProductPage.jsx` (dùng `ProductOptions` khi có `variant_options`, fallback hàng nút cũ)

**Interfaces:**
- Consumes: `options` (`product.variant_options`), `variants`, `selected`, `onSelect(optionName, label)`, helpers `resolveVariant`/`variantSignature`.
- Produces: `ProductOptions` render mỗi option 1 hàng; option màu = swatch hex; tổ hợp không khả dụng/hết hàng → disabled.

- [ ] **Step 1: Viết test fail** — `ProductOptions.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductOptions } from './ProductOptions'

const options = [
  { name: 'Màu sắc', type: 'color', values: [{ label: 'Đỏ', hex: '#C0392B' }, { label: 'Xanh', hex: '#2E5FCC' }] },
  { name: 'Kích thước', type: 'text', values: [{ label: 'S' }, { label: 'M' }] },
]
const variants = [
  { id: 1, attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }, available_stock: 3 },
  { id: 2, attributes: { 'Màu sắc': 'Đỏ', 'Kích thước': 'M' }, available_stock: 0 },
]

it('chọn swatch màu gọi onSelect', async () => {
  const onSelect = vi.fn()
  render(<ProductOptions options={options} variants={variants} selected={{}} onSelect={onSelect} />)
  await userEvent.click(screen.getByRole('button', { name: 'Đỏ' }))
  expect(onSelect).toHaveBeenCalledWith('Màu sắc', 'Đỏ')
})

it('disable giá trị dẫn tới tổ hợp hết hàng/không tồn tại', () => {
  render(<ProductOptions options={options} variants={variants} selected={{ 'Màu sắc': 'Đỏ' }} onSelect={() => {}} />)
  // Đỏ/M hết hàng → nút "M" disabled
  expect(screen.getByRole('button', { name: 'M' })).toBeDisabled()
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/pages/product/ProductOptions.test.jsx`

- [ ] **Step 3: Implement** — `ProductOptions.jsx`:

```jsx
import { variantSignature } from '../../lib/variantOptions'

// Tập signature của các biến thể CÒN HÀNG.
function inStockSignatures(variants, options) {
  const set = new Set()
  for (const v of variants ?? []) {
    if ((v.available_stock ?? 0) > 0) set.add(variantSignature(v.attributes ?? {}, options))
  }
  return set
}

export function ProductOptions({ options, variants, selected, onSelect }) {
  const stock = inStockSignatures(variants, options)

  // 1 value có khả dụng không: tồn tại ÍT NHẤT 1 biến thể còn hàng khớp lựa chọn hiện tại + value này.
  const isAvailable = (optionName, label) => {
    const probe = { ...selected, [optionName]: label }
    for (const sig of stock) {
      const ok = options.every((o) => {
        const want = probe[o.name]
        return want == null || sig.split('')[options.indexOf(o)] === want
      })
      if (ok) return true
    }
    return false
  }

  return (
    <div className="flex flex-col gap-5">
      {options.map((option) => (
        <div key={option.name}>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{option.name}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((v) => {
              const active = selected[option.name] === v.label
              const available = isAvailable(option.name, v.label)
              return option.type === 'color' ? (
                <button
                  key={v.label}
                  type="button"
                  aria-label={v.label}
                  title={v.label}
                  disabled={!available}
                  onClick={() => onSelect(option.name, v.label)}
                  className={`h-9 w-9 rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-30 ${
                    active ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-border'
                  }`}
                  style={{ backgroundColor: v.hex }}
                />
              ) : (
                <button
                  key={v.label}
                  type="button"
                  disabled={!available}
                  onClick={() => onSelect(option.name, v.label)}
                  className={`rounded-control border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-30 ${
                    active ? 'border-foreground bg-surface-alt' : 'border-border hover:border-border-strong'
                  }`}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/pages/product/ProductOptions.test.jsx`

- [ ] **Step 5: Tích hợp vào `ProductPage.jsx`** — khi `product.variant_options?.length`, thay hàng nút variant phẳng bằng:

```jsx
// state: const [selectedOptions, setSelectedOptions] = useState({})
// const hasOptions = (product?.variant_options ?? []).length > 0
// const selectedVariant = hasOptions
//   ? resolveVariant(selectedOptions, variants, product.variant_options)
//   : variants.find((v) => v.id === selectedVariantId) ?? variants[0]
{hasOptions ? (
  <ProductOptions
    options={product.variant_options}
    variants={variants}
    selected={selectedOptions}
    onSelect={(name, label) => setSelectedOptions((prev) => ({ ...prev, [name]: label }))}
  />
) : (
  /* giữ nguyên hàng nút variant cũ */
)}
```

Thêm `import { ProductOptions } from './ProductOptions'` và `import { resolveVariant } from '../../lib/variantOptions'`. Nút "Thêm vào giỏ" disabled khi `hasOptions && !selectedVariant` (chưa chọn đủ). Giữ guard staff (`token && staff`) như hiện tại.

- [ ] **Step 6: Chạy test ProductPage + lint** — cập nhật `ProductPage.test.jsx` nếu cần (product mock có thể thêm `variant_options: []` để giữ nhánh fallback cho test cũ).

Run: `npx vitest run src/pages/product/ && npm run lint`

- [ ] **Step 7: Stage (giữ commit)**

```bash
cd Nestify-Furniture-e-commerce-frontend && git add src/pages/product/ProductOptions.jsx src/pages/product/ProductOptions.test.jsx src/pages/product/ProductPage.jsx
```

---

## Task 10: Docs + ERD + chạy full suite

**Files:**
- Modify: `Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md`
- Modify: `Diagrams/NestifyERD.puml`
- (spec đã có) `Nestify-Furniture-e-commerce-frontend/docs/superpowers/specs/2026-06-26-variant-options-design.md`

- [ ] **Step 1: FE_AI_CONTEXT.md** — mục Products: thêm `variant_options` vào ProductResource (shape `[{name,type,values:[{label,hex?}]}]`); ghi `variant.attributes` map `{tên option: label}`, `name` tự suy ra; thêm endpoint `POST /admin/products/{id}/variants/bulk` (request `variants: [{attributes, price, stock_quantity, sku?}]`, idempotent theo tổ hợp, `201 [ProductVariantResource]`).

- [ ] **Step 2: ERD** — `Diagrams/NestifyERD.puml`, trong entity `products`, sau dòng `attributes : jsonb <<GIN>>`:

```
    variant_options : jsonb <<[{name,type:text|color,values:[{label,hex?}]}]>>
```

- [ ] **Step 3: Chạy FULL suite 2 phía**

```bash
# BE
cd Nestify-Furniture-e-commerce-backend/src && docker run --rm --entrypoint sh -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: -e CACHE_STORE=array -v "$PWD":/var/www -w /var/www nestify-furniture-e-commerce-backend-app:latest -c 'php artisan config:clear; php artisan route:clear; php artisan test'
# FE
cd ../../Nestify-Furniture-e-commerce-frontend && npm run lint && npx vitest run
```
Expected: BE chỉ còn `AdminHealthTest` đỏ (cần Redis, môi trường — bỏ qua); FE all pass.

- [ ] **Step 4: Stage (giữ commit)**

```bash
cd "Nestify-Furniture-e-commerce-backend" && git add docs/FE_AI_CONTEXT.md
cd "../Nestify-Furniture-e-commerce-frontend" && git add docs/superpowers/
# ERD nằm ngoài 2 repo git (thư mục Diagrams ở gốc) — không stage; nhắc user.
```

---

## Self-Review (đã rà)

- **Spec coverage:** data model (T1), validate options (T2), signature/name/attributes-match (T3), bulk (T4), FE helpers (T5), api/hook (T6), option editor + swatch (T7), matrix generate (T8), storefront selectors + fallback + swatch (T9), docs/ERD (T10). Tương thích ngược: fallback flat ở T9, generator chỉ-thêm ở T4. ✓
- **Placeholder:** không có TODO trống — mọi step có code thật. Các chỗ "đọc file trước khi đặt" (T8 step 5, T9 step 5) là tích hợp vào file lớn sẵn có, kèm code mẫu cụ thể.
- **Type consistency:** `variantSignature(attributes, options)`, `resolveVariant(selected, variants, options)`, `missingCombinations(options, variants)`, `bulkCreateVariants(productId, variants)` dùng nhất quán FE/BE; sep signature `""` khớp 2 phía.
