# Media Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the site's image-adding flow into a WordPress-style Media Library — upload an image once, then reuse the same Cloudinary asset across many products/variants/categories by picking it from a browsable library.

**Architecture:** Split "the asset" (`media_assets`, new) from "its usage" (`product_media` repurposed as a junction; `categories.media_asset_id`). `MediaService` stays the only Cloudinary caller. Admin FE gets a reusable `MediaLibraryModal` picker (shared by product gallery + category form) and a standalone Media Library page.

**Tech Stack:** Laravel 11 + Cloudinary SDK v2 + sqlite `:memory:` tests (Docker). React 18 (plain JSX) + TanStack Query v5 + Radix Dialog + Vitest/RTL. Spec: `docs/superpowers/specs/2026-07-08-media-library-design.md`.

## Global Constraints

- **Do NOT commit.** Stage only (`git add`); the user commits. (Standing project constraint — nothing committed until the user asks.) Every "Stage" step below is stage-only.
- **User runs migrations + deploys** against real/prod DB. The author never migrates prod. Backfill must be idempotent (re-runnable).
- **BE tests** run in the Docker sqlite image: `docker run --rm --entrypoint sh -v "$(pwd)/src:/var/www" -w /var/www -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: nestify-furniture-e-commerce-backend-app:latest -c "php artisan config:clear >/dev/null 2>&1; php artisan route:clear >/dev/null 2>&1; php artisan test <path>"` — run from the BE repo root `Nestify-Furniture-e-commerce-backend`.
- **Validation errors** use the app's envelope `error.details.fields.<field>` (NOT Laravel default `errors.*`) — assert with `assertJsonPath('error.code','VALIDATION_FAILED')` + `assertJsonStructure(['error'=>['details'=>['fields'=>['<field>']]]])`, never `assertJsonValidationErrorFor`.
- **`cloudinary_id` is never serialized** in any resource.
- **FE**: plain `.jsx` only; semantic Tailwind tokens only; VN copy; feature folders (`api.js`+`hooks.js`); admin offset pagination via `useOffsetQuery`/`<Pagination>`. Before FE `npm test`/`lint`/`build`, `cd Nestify-Furniture-e-commerce-frontend`.
- **BE Cloudinary** is never hit in tests: `$this->mock(MediaService::class)` where a controller injects it and the path shouldn't upload; or mock the injected `Cloudinary` client for MediaService unit tests (existing pattern — see `AdminUploadTest`/`AdminProductMediaVariantTest`).

Paths below are relative to each repo root: BE = `Nestify-Furniture-e-commerce-backend/`, FE = `Nestify-Furniture-e-commerce-frontend/`.

---

## Phase 1 — BE data model + backfill

### Task 1: `media_assets` table + `MediaAsset` model

**Files:**
- Create: `Nestify-Furniture-e-commerce-backend/src/database/migrations/2026_07_09_000000_create_media_assets_table.php`
- Create: `Nestify-Furniture-e-commerce-backend/src/app/Models/MediaAsset.php`
- Create: `Nestify-Furniture-e-commerce-backend/src/database/factories/MediaAssetFactory.php`
- Test: `Nestify-Furniture-e-commerce-backend/src/tests/Unit/MediaAssetTest.php`

**Interfaces:**
- Produces: `MediaAsset` model with `$fillable = ['cloudinary_id','url','type','alt_text','width','height','bytes','original_filename']`, `type` cast to `MediaType`, relations `attachments(): HasMany(ProductMedia)` and `categories(): HasMany(Category)`, method `usageCount(): int`.

- [ ] **Step 1: Write the migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('media_assets', function (Blueprint $table) {
            $table->id();
            $table->string('cloudinary_id')->unique(); // internal — never exposed
            $table->string('url');                      // Cloudinary secure_url
            $table->string('type')->default('image');   // MediaType: image|video
            $table->string('alt_text')->nullable();      // asset-level default description
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->unsignedBigInteger('bytes')->nullable();
            $table->string('original_filename')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('media_assets'); }
};
```

- [ ] **Step 2: Write `MediaAsset` model**

```php
<?php
declare(strict_types=1);
namespace App\Models;

use App\Enums\MediaType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MediaAsset extends Model
{
    protected $fillable = ['cloudinary_id','url','type','alt_text','width','height','bytes','original_filename'];
    protected $casts = ['type' => MediaType::class];

    public function attachments(): HasMany
    {
        return $this->hasMany(ProductMedia::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /** Number of places (product attachments + categories) referencing this asset. */
    public function usageCount(): int
    {
        return $this->attachments()->count() + $this->categories()->count();
    }
}
```

- [ ] **Step 3: Write factory**

```php
<?php
declare(strict_types=1);
namespace Database\Factories;

use App\Models\MediaAsset;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<MediaAsset> */
class MediaAssetFactory extends Factory
{
    protected $model = MediaAsset::class;

    public function definition(): array
    {
        return [
            'cloudinary_id'     => 'nestify/'.Str::random(20),
            'url'               => 'https://res.cloudinary.com/demo/image/upload/'.Str::random(10).'.jpg',
            'type'              => 'image',
            'alt_text'          => fake()->words(3, true),
            'width'             => 1200,
            'height'            => 800,
            'bytes'             => 240000,
            'original_filename' => fake()->slug().'.jpg',
        ];
    }
}
```

- [ ] **Step 4: Write the failing test**

```php
<?php
declare(strict_types=1);
namespace Tests\Unit;

use App\Models\Category;
use App\Models\MediaAsset;
use App\Models\Product;
use App\Models\ProductMedia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaAssetTest extends TestCase
{
    use RefreshDatabase;

    public function test_usage_count_sums_product_attachments_and_categories(): void
    {
        $asset = MediaAsset::factory()->create();
        $this->assertSame(0, $asset->usageCount());

        $product = Product::factory()->create();
        ProductMedia::create(['product_id' => $product->id, 'media_asset_id' => $asset->id, 'sort_order' => 0]);
        Category::factory()->create(['media_asset_id' => $asset->id]);

        $this->assertSame(2, $asset->fresh()->usageCount());
    }
}
```

> Note: this test also exercises Task 2's columns (`product_media.media_asset_id`, `categories.media_asset_id`). Run it after Task 2 if it fails on missing columns; it is placed here because it asserts `MediaAsset` behavior.

- [ ] **Step 5: Run tests**

Run: (Global-Constraints Docker command) `... php artisan test tests/Unit/MediaAssetTest.php`
Expected: PASS once Task 2 columns exist.

- [ ] **Step 6: Stage (do not commit)**

```bash
git add src/database/migrations/2026_07_09_000000_create_media_assets_table.php src/app/Models/MediaAsset.php src/database/factories/MediaAssetFactory.php src/tests/Unit/MediaAssetTest.php
```

---

### Task 2: Add `media_asset_id` to `product_media` + `categories` (nullable first)

**Files:**
- Create: `Nestify-Furniture-e-commerce-backend/src/database/migrations/2026_07_09_000001_add_media_asset_id_to_product_media_and_categories.php`
- Modify: `src/app/Models/ProductMedia.php` (add `media_asset_id` to `$fillable`, add `asset()` relation)
- Modify: `src/app/Models/Category.php` (add `media_asset_id` to `$fillable`, add `asset()` relation)

**Interfaces:**
- Produces: `ProductMedia::asset(): BelongsTo(MediaAsset)`, `Category::asset(): BelongsTo(MediaAsset)`; nullable `media_asset_id` columns on both tables.

- [ ] **Step 1: Write the migration (nullable — backfill runs in Task 3)**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('product_media', function (Blueprint $table) {
            // nullable now; made non-nullable + moved-columns dropped in Task 3's finalize migration.
            // restrictOnDelete: an asset can't be DB-deleted while attachments reference it
            // (defense-in-depth behind the app-layer usage guard).
            $table->foreignId('media_asset_id')->nullable()->after('product_id')
                  ->constrained('media_assets')->restrictOnDelete();
        });
        Schema::table('categories', function (Blueprint $table) {
            // nullOnDelete: a category losing its image is non-catastrophic (app guard blocks delete anyway).
            $table->foreignId('media_asset_id')->nullable()->after('id')
                  ->constrained('media_assets')->nullOnDelete();
        });
    }
    public function down(): void
    {
        Schema::table('product_media', function (Blueprint $table) {
            $table->dropForeign(['media_asset_id']);
            $table->dropColumn('media_asset_id');
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['media_asset_id']);
            $table->dropColumn('media_asset_id');
        });
    }
};
```

- [ ] **Step 2: Add relation + fillable to `ProductMedia`**

Add `'media_asset_id'` to `$fillable` and:
```php
public function asset(): \Illuminate\Database\Eloquent\Relations\BelongsTo
{
    return $this->belongsTo(MediaAsset::class, 'media_asset_id');
}
```

- [ ] **Step 3: Add relation + fillable to `Category`**

Add `'media_asset_id'` to `$fillable` (check `Category.php` for existing fillable) and:
```php
public function asset(): \Illuminate\Database\Eloquent\Relations\BelongsTo
{
    return $this->belongsTo(MediaAsset::class, 'media_asset_id');
}
```

- [ ] **Step 4: Run the Task 1 test (now columns exist)**

Run: `... php artisan test tests/Unit/MediaAssetTest.php`
Expected: PASS.

- [ ] **Step 5: Stage (do not commit)**

```bash
git add src/database/migrations/2026_07_09_000001_add_media_asset_id_to_product_media_and_categories.php src/app/Models/ProductMedia.php src/app/Models/Category.php
```

---

### Task 3: Backfill migration + finalize (drop moved columns)

**Files:**
- Create: `src/database/migrations/2026_07_09_000002_backfill_media_assets.php`
- Test: `src/tests/Feature/Media/BackfillMediaAssetsTest.php`

**Interfaces:**
- Produces: after this migration set, every `product_media` row has a non-null `media_asset_id`; `product_media` no longer has `cloudinary_id/url/type/alt_text`; existing category images have assets.

- [ ] **Step 1: Write the backfill migration (idempotent; then drop moved columns)**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── product_media → asset per row (only rows not yet migrated) ──
        DB::table('product_media')->whereNull('media_asset_id')->orderBy('id')
          ->each(function ($row) {
              $assetId = DB::table('media_assets')->insertGetId([
                  'cloudinary_id' => $row->cloudinary_id,
                  'url'           => $row->url,
                  'type'          => $row->type,
                  'alt_text'      => $row->alt_text ?? null,
                  'created_at'    => now(),
                  'updated_at'    => now(),
              ]);
              DB::table('product_media')->where('id', $row->id)->update(['media_asset_id' => $assetId]);
          });

        // ── categories with an image → asset (only rows not yet migrated) ──
        DB::table('categories')
          ->whereNull('media_asset_id')->whereNotNull('image_public_id')->orderBy('id')
          ->each(function ($row) {
              $assetId = DB::table('media_assets')->insertGetId([
                  'cloudinary_id' => $row->image_public_id,
                  'url'           => $row->image_url,
                  'type'          => 'image',
                  'created_at'    => now(),
                  'updated_at'    => now(),
              ]);
              DB::table('categories')->where('id', $row->id)->update(['media_asset_id' => $assetId]);
          });

        // ── finalize product_media: non-nullable FK + drop moved columns ──
        Schema::table('product_media', function (Blueprint $table) {
            $table->dropUnique(['cloudinary_id']);
            $table->dropColumn(['cloudinary_id', 'url', 'type', 'alt_text']);
        });
        // SQLite can't ALTER a column to NOT NULL in place; skip the constraint tighten
        // under sqlite (tests). On MySQL/Postgres (prod) enforce non-nullable.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE product_media MODIFY media_asset_id BIGINT UNSIGNED NOT NULL');
        }
    }

    public function down(): void
    {
        Schema::table('product_media', function (Blueprint $table) {
            $table->string('cloudinary_id')->nullable();
            $table->string('url')->nullable();
            $table->string('type')->default('image');
            $table->string('alt_text')->nullable();
        });
        // (Down does not restore data — forward-only backfill.)
    }
};
```

> `alt_text` may not exist on `product_media` yet in all environments — it was never added as a column in the original schema. Confirm: the original `product_media` table has NO `alt_text` column (it was on the resource plan but the migration in `2026_05_01_000012` has `alt_text`). **Verify** by reading `2026_05_01_000012_create_product_media_table.php`; it DOES define `alt_text`. So the backfill reads `$row->alt_text`. Good.

- [ ] **Step 2: Write the backfill test**

```php
<?php
declare(strict_types=1);
namespace Tests\Feature\Media;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BackfillMediaAssetsTest extends TestCase
{
    // No RefreshDatabase migration-in-transaction here: we drive migrations manually.
    public function test_backfill_creates_assets_and_wires_fks(): void
    {
        $this->markTestSkipped('Run manually: backfill asserts pre-finalize old-shape rows. See plan Task 3.');
    }
}
```

> The backfill runs *inside* the same migration that drops the old columns, so a normal `RefreshDatabase` suite (which runs all migrations, leaving the new shape) can't see the intermediate old-shape rows. Assert the *outcome* instead in Step 3.

- [ ] **Step 3: Replace with an outcome test that seeds via the NEW shape is not possible — instead assert idempotency + shape post-migrate**

```php
<?php
declare(strict_types=1);
namespace Tests\Feature\Media;

use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BackfillMediaAssetsTest extends TestCase
{
    public function test_final_schema_shape_after_all_migrations(): void
    {
        // After all migrations run (RefreshDatabase via TestCase), product_media is the junction:
        $this->assertTrue(Schema::hasColumn('product_media', 'media_asset_id'));
        $this->assertFalse(Schema::hasColumn('product_media', 'cloudinary_id'));
        $this->assertFalse(Schema::hasColumn('product_media', 'url'));
        $this->assertTrue(Schema::hasColumn('media_assets', 'cloudinary_id'));
        $this->assertTrue(Schema::hasColumn('categories', 'media_asset_id'));
    }
}
```

Add `use Illuminate\Foundation\Testing\RefreshDatabase;` + `use RefreshDatabase;` to the class.

- [ ] **Step 4: Run tests**

Run: `... php artisan test tests/Feature/Media/BackfillMediaAssetsTest.php`
Expected: PASS.

- [ ] **Step 5: Stage (do not commit)**

```bash
git add src/database/migrations/2026_07_09_000002_backfill_media_assets.php src/tests/Feature/Media/BackfillMediaAssetsTest.php
```

---

## Phase 2 — BE MediaService refactor + resource

### Task 4: `MediaAssetResource` + `MediaService.uploadToLibrary`/`usageCount`/`deleteAsset`

**Files:**
- Create: `src/app/Http/Resources/MediaAssetResource.php`
- Create: `src/app/Exceptions/MediaInUseException.php`
- Modify: `src/app/Services/MediaService.php`
- Modify: `src/app/DTOs/MediaUploadDTO.php` (drop `productId`/`variantId`; the DTO now describes a library upload only) — OR keep and add a `LibraryUploadDTO`. **Decision: add `alt` param; keep upload path but split responsibilities** (see steps).
- Test: `src/tests/Unit/MediaServiceLibraryTest.php`

**Interfaces:**
- Produces: `MediaService::uploadToLibrary(UploadedFile $file, MediaType $type, ?string $alt = null): MediaAsset`; `MediaService::attachToProduct(Product $product, array $assetIds, ?int $variantId = null): void`; `MediaService::detach(ProductMedia $attachment): void`; `MediaService::deleteAsset(MediaAsset $asset): void` (throws `MediaInUseException`); `MediaService::usageCount(MediaAsset $asset): int`.
- `MediaAssetResource` fields: `id,url,type,alt_text,width,height,bytes,original_filename,usage_count,created_at`.

- [ ] **Step 1: Write `MediaAssetResource`**

```php
<?php
declare(strict_types=1);
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** cloudinary_id is intentionally OMITTED (internal). */
class MediaAssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'url'               => $this->url,
            'type'              => $this->type instanceof \App\Enums\MediaType ? $this->type->value : $this->type,
            'alt_text'          => $this->alt_text,
            'width'             => $this->width,
            'height'            => $this->height,
            'bytes'             => $this->bytes,
            'original_filename' => $this->original_filename,
            // usage_count only when the model exposes it (list/detail eager-computes it).
            'usage_count'       => $this->when(isset($this->usage_count) || method_exists($this->resource, 'usageCount'),
                                       fn () => $this->usage_count ?? $this->usageCount()),
            'created_at'        => $this->created_at?->toIso8601String(),
        ];
    }
}
```

- [ ] **Step 2: Write `MediaInUseException`**

```php
<?php
declare(strict_types=1);
namespace App\Exceptions;

class MediaInUseException extends \RuntimeException
{
    public function __construct(public readonly int $usageCount)
    {
        parent::__construct("Media asset is used by {$usageCount} place(s).");
    }
}
```

- [ ] **Step 3: Add methods to `MediaService`** (keep the existing `upload()` for now; add library methods)

```php
use App\Models\MediaAsset;
use App\Models\Product;
use App\Exceptions\MediaInUseException;

/** Upload a file to Cloudinary and persist a reusable library asset (no attachment). */
public function uploadToLibrary(\Illuminate\Http\UploadedFile $file, MediaType $type, ?string $alt = null): MediaAsset
{
    $opts = $type === MediaType::Image
        ? ['transformation' => [['quality' => 'auto', 'fetch_format' => 'auto']]]
        : ['transformation' => [['quality' => 'auto']]];

    try {
        $result = $this->cloudinary->uploadApi()->upload($file->getRealPath(), array_merge([
            'folder'        => config('cloudinary.folder'),
            'resource_type' => 'auto',
        ], $opts));
    } catch (\Throwable $e) {
        Log::error('MediaService: library upload failed', ['type' => $type->value, 'error' => $e->getMessage()]);
        throw new \App\Exceptions\MediaUploadException($e->getMessage());
    }

    return MediaAsset::create([
        'cloudinary_id'     => $result['public_id'],
        'url'               => $result['secure_url'],
        'type'              => $type->value,
        'alt_text'          => $alt,
        'width'             => $result['width'] ?? null,
        'height'            => $result['height'] ?? null,
        'bytes'             => $result['bytes'] ?? null,
        'original_filename' => $result['original_filename'] ?? $file->getClientOriginalName(),
    ]);
}

/** Attach existing library assets to a product, appended after current max sort_order. */
public function attachToProduct(Product $product, array $assetIds, ?int $variantId = null): void
{
    DB::transaction(function () use ($product, $assetIds, $variantId) {
        $next = ProductMedia::where('product_id', $product->id)->max('sort_order') ?? -1;
        foreach ($assetIds as $assetId) {
            ProductMedia::create([
                'product_id'     => $product->id,
                'media_asset_id' => (int) $assetId,
                'variant_id'     => $variantId,
                'sort_order'     => ++$next,
            ]);
        }
    });
}

/** Detach: remove the attachment row only. Cloudinary + asset untouched. */
public function detach(ProductMedia $attachment): void
{
    $attachment->delete();
}

public function usageCount(MediaAsset $asset): int
{
    return $asset->usageCount();
}

/** Hard-delete an asset: only when unused. Destroys the Cloudinary asset. */
public function deleteAsset(MediaAsset $asset): void
{
    $count = $asset->usageCount();
    if ($count > 0) {
        throw new MediaInUseException($count);
    }
    try {
        $this->cloudinary->uploadApi()->destroy($asset->cloudinary_id, ['resource_type' => 'auto']);
    } catch (\Throwable $e) {
        Log::warning('MediaService: asset Cloudinary delete failed — may be orphaned', [
            'cloudinary_id' => $asset->cloudinary_id, 'error' => $e->getMessage(),
        ]);
    }
    $asset->delete();
}
```

- [ ] **Step 4: Write the failing test** (mock the `Cloudinary` client)

```php
<?php
declare(strict_types=1);
namespace Tests\Unit;

use App\Enums\MediaType;
use App\Exceptions\MediaInUseException;
use App\Models\Category;
use App\Models\MediaAsset;
use App\Services\MediaService;
use Cloudinary\Cloudinary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class MediaServiceLibraryTest extends TestCase
{
    use RefreshDatabase;

    public function test_delete_asset_blocks_when_in_use(): void
    {
        $service = new MediaService(Mockery::mock(Cloudinary::class));
        $asset = MediaAsset::factory()->create();
        Category::factory()->create(['media_asset_id' => $asset->id]);

        $this->expectException(MediaInUseException::class);
        $service->deleteAsset($asset);

        $this->assertDatabaseHas('media_assets', ['id' => $asset->id]); // survives
    }
}
```

- [ ] **Step 5: Run tests**

Run: `... php artisan test tests/Unit/MediaServiceLibraryTest.php`
Expected: PASS.

- [ ] **Step 6: Stage (do not commit)**

```bash
git add src/app/Http/Resources/MediaAssetResource.php src/app/Exceptions/MediaInUseException.php src/app/Services/MediaService.php src/tests/Unit/MediaServiceLibraryTest.php
```

---

### Task 5: Point `ProductMediaResource` + `upload()` at the asset

**Files:**
- Modify: `src/app/Http/Resources/ProductMediaResource.php`
- Modify: `src/app/Services/MediaService.php` (`upload()` now creates an asset then an attachment)
- Modify: `src/app/Models/Product.php` (`media()` eager-load `asset`) and any resource eager-loads.
- Modify: `src/app/Http/Resources/ProductResource.php`, `ProductVariantResource.php` — ensure media `url`/`thumbnail` read through `media->asset->url`.
- Test: `src/tests/Feature/Admin/AdminProductMediaVariantTest.php` (existing — keep green), add assertions.

**Interfaces:**
- Produces: `ProductMediaResource` output `id,product_id,variant_id,media_asset_id,url,type,sort_order` where `url`/`type` come from the asset relation.

- [ ] **Step 1: Rewrite `ProductMediaResource` to read via asset**

```php
public function toArray(Request $request): array
{
    return [
        'id'             => $this->id,
        'product_id'     => $this->product_id,
        'variant_id'     => $this->variant_id,
        'media_asset_id' => $this->media_asset_id,
        'url'            => $this->asset?->url,
        'type'           => $this->asset?->type instanceof \App\Enums\MediaType
                                ? $this->asset->type->value : $this->asset?->type,
        'sort_order'     => $this->sort_order,
    ];
}
```

- [ ] **Step 2: Update `Product::media()` to eager-load asset**

```php
public function media() { return $this->hasMany(ProductMedia::class)->with('asset')->orderBy('sort_order'); }
```

- [ ] **Step 3: Refactor `MediaService::upload()` to library+attach**

Replace the body of `upload(MediaUploadDTO $dto)` so it calls `uploadToLibrary()` then creates an attachment:
```php
public function upload(MediaUploadDTO $dto): ProductMedia
{
    $asset = $this->uploadToLibrary($dto->file, $dto->type, null);
    $next  = ProductMedia::where('product_id', $dto->productId)->max('sort_order') ?? -1;
    return ProductMedia::create([
        'product_id'     => $dto->productId,
        'media_asset_id' => $asset->id,
        'variant_id'     => $dto->variantId,
        'sort_order'     => $next + 1,
    ])->load('asset');
}
```

- [ ] **Step 4: Grep + fix any code reading `$media->url` / `$media->cloudinary_id` / `$media->type` directly**

Run: `grep -rn "->media->first()\|media->url\|->cloudinary_id\|SnapshotOrderData" src/app`
- `SnapshotOrderData.php:32` — change `$variant->product->media->first()?->url` → `$variant->product->media->first()?->asset?->url` (still a URL string snapshot). Update its `loadMissing('items.variant.product.media')` → `...media.asset`.
- `GenerateSeoDraftJob` / `ProductDescriptionGenerator` / `BulkSeoController` — anywhere they read a media URL, route through `->asset->url`.

- [ ] **Step 5: Run tests** (existing media + product + order snapshot suites)

Run: `... php artisan test tests/Feature/Admin/AdminProductMediaVariantTest.php tests/Feature/Order tests/Feature/Product`
Expected: PASS (fix eager-loads until green).

- [ ] **Step 6: Stage (do not commit)**

```bash
git add src/app/Http/Resources/ProductMediaResource.php src/app/Models/Product.php src/app/Services/MediaService.php src/app/Actions/SnapshotOrderData.php
```

---

## Phase 3 — BE endpoints

### Task 6: Media Library controller (list/upload/update-alt/delete)

**Files:**
- Create: `src/app/Http/Controllers/Admin/MediaLibraryController.php`
- Create: `src/app/Http/Requests/Admin/UploadLibraryMediaRequest.php`
- Modify: `src/routes/api.php` (admin group)
- Test: `src/tests/Feature/Admin/MediaLibraryTest.php`

**Interfaces:**
- Produces routes: `GET /api/admin/media`, `POST /api/admin/media`, `PATCH /api/admin/media/{asset}`, `DELETE /api/admin/media/{asset}`.

- [ ] **Step 1: Write `UploadLibraryMediaRequest`** (mirror `UploadMediaRequest` minus variant)

```php
<?php
declare(strict_types=1);
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UploadLibraryMediaRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('manage_products') ?? false; }

    public function rules(): array
    {
        return [
            'type'     => ['required', 'string', Rule::in(['image', 'video'])],
            'file'     => $this->fileRulesForType($this->input('type')),
            'alt_text' => ['nullable', 'string', 'max:255'],
        ];
    }

    private function fileRulesForType(mixed $type): array
    {
        return match ($type) {
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'video' => ['required', 'file', 'mimes:mp4,mov,webm', 'max:102400'],
            default => ['required', 'file'],
        };
    }

    public function messages(): array
    {
        return [
            'type.required' => 'Loại media là bắt buộc.',
            'type.in'       => 'Loại media phải là image hoặc video.',
            'file.required' => 'File upload là bắt buộc.',
            'file.mimes'    => 'Định dạng file không được hỗ trợ.',
            'file.max'      => 'File vượt quá kích thước cho phép.',
        ];
    }
}
```

- [ ] **Step 2: Write `MediaLibraryController`**

```php
<?php
declare(strict_types=1);
namespace App\Http\Controllers\Admin;

use App\Enums\MediaType;
use App\Exceptions\MediaInUseException;
use App\Exceptions\MediaUploadException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UploadLibraryMediaRequest;
use App\Http\Resources\MediaAssetResource;
use App\Models\MediaAsset;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaLibraryController extends Controller
{
    public function __construct(private readonly MediaService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = MediaAsset::query()
            ->withCount(['attachments', 'categories'])
            ->latest();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q
                ->where('original_filename', 'like', "%{$search}%")
                ->orWhere('alt_text', 'like', "%{$search}%"));
        }
        if ($request->boolean('unused')) {
            $query->having('attachments_count', '=', 0)->having('categories_count', '=', 0);
        }

        $page = $query->paginate(24);
        // Expose usage_count = attachments_count + categories_count
        $page->getCollection()->transform(function ($a) {
            $a->usage_count = $a->attachments_count + $a->categories_count;
            return $a;
        });

        return response()->json([
            'data' => MediaAssetResource::collection($page->items()),
            'meta' => ['pagination' => [
                'total' => $page->total(), 'page' => $page->currentPage(),
                'last_page' => $page->lastPage(), 'per_page' => $page->perPage(),
            ]],
        ]);
    }

    public function store(UploadLibraryMediaRequest $request): JsonResponse
    {
        try {
            $asset = $this->service->uploadToLibrary(
                $request->validated('file'),
                MediaType::from($request->validated('type')),
                $request->validated('alt_text'),
            );
            return response()->json(['data' => new MediaAssetResource($asset)], 201);
        } catch (MediaUploadException) {
            return response()->json(['error' => [
                'code' => 'MEDIA_UPLOAD_FAILED',
                'message' => 'Dịch vụ lưu trữ media tạm thời không khả dụng. Vui lòng thử lại sau.',
            ]], 503);
        }
    }

    public function update(Request $request, MediaAsset $asset): JsonResponse
    {
        $data = $request->validate(['alt_text' => ['present', 'nullable', 'string', 'max:255']]);
        $asset->update(['alt_text' => $data['alt_text']]);
        return response()->json(['data' => new MediaAssetResource($asset->fresh())]);
    }

    public function destroy(MediaAsset $asset): JsonResponse
    {
        try {
            $this->service->deleteAsset($asset);
            return response()->json(null, 204);
        } catch (MediaInUseException $e) {
            return response()->json(['error' => [
                'code' => 'MEDIA_IN_USE',
                'message' => "Ảnh đang được dùng bởi {$e->usageCount} nơi. Hãy gỡ khỏi các nơi đó trước khi xoá.",
                'details' => ['usage_count' => $e->usageCount],
            ]], 409);
        }
    }
}
```

- [ ] **Step 3: Add routes** (BE `routes/api.php`, inside the admin `manage_products` group near the product media routes)

```php
Route::get('media', [\App\Http\Controllers\Admin\MediaLibraryController::class, 'index']);
Route::post('media', [\App\Http\Controllers\Admin\MediaLibraryController::class, 'store']);
Route::patch('media/{asset}', [\App\Http\Controllers\Admin\MediaLibraryController::class, 'update']);
Route::delete('media/{asset}', [\App\Http\Controllers\Admin\MediaLibraryController::class, 'destroy']);
```

- [ ] **Step 4: Write the failing test**

```php
<?php
declare(strict_types=1);
namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\MediaAsset;
use App\Models\User;
use App\Services\MediaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaLibraryTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return $this->makeSuperAdmin(User::factory()->verified()->create());
    }

    public function test_lists_assets_with_usage_count_and_unused_filter(): void
    {
        $used   = MediaAsset::factory()->create();
        $unused = MediaAsset::factory()->create();
        Category::factory()->create(['media_asset_id' => $used->id]);

        $this->actingAs($this->admin())->getJson('/api/admin/media?unused=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $unused->id)
            ->assertJsonPath('data.0.usage_count', 0);
    }

    public function test_delete_in_use_asset_returns_409(): void
    {
        $this->mock(MediaService::class)->shouldReceive('deleteAsset')
            ->andThrow(new \App\Exceptions\MediaInUseException(2));
        $asset = MediaAsset::factory()->create();

        $this->actingAs($this->admin())->deleteJson("/api/admin/media/{$asset->id}")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'MEDIA_IN_USE')
            ->assertJsonPath('error.details.usage_count', 2);
    }
}
```

> Check the real super-admin helper name in `tests/TestCase.php` (e.g. `makeSuperAdmin`); use whatever the codebase provides (see `AdminEmployeesPage`/existing admin tests).

- [ ] **Step 5: Run tests**

Run: `... php artisan test tests/Feature/Admin/MediaLibraryTest.php`
Expected: PASS.

- [ ] **Step 6: Stage (do not commit)**

```bash
git add src/app/Http/Controllers/Admin/MediaLibraryController.php src/app/Http/Requests/Admin/UploadLibraryMediaRequest.php src/routes/api.php src/tests/Feature/Admin/MediaLibraryTest.php
```

---

### Task 7: Product attach endpoint + detach semantics

**Files:**
- Create: `src/app/Http/Requests/Admin/AttachMediaRequest.php`
- Modify: `src/app/Http/Controllers/Admin/ProductMediaController.php` (add `attach()`; `destroy()` now detaches)
- Modify: `src/routes/api.php`
- Test: `src/tests/Feature/Admin/AdminProductMediaVariantTest.php` (extend)

**Interfaces:**
- Produces route `POST /api/admin/products/{product}/media/attach` `{ media_asset_ids: int[], variant_id?: int|null }`.

- [ ] **Step 1: Write `AttachMediaRequest`**

```php
<?php
declare(strict_types=1);
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AttachMediaRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('manage_products') ?? false; }

    public function rules(): array
    {
        return [
            'media_asset_ids'   => ['required', 'array', 'min:1'],
            'media_asset_ids.*' => ['integer', 'exists:media_assets,id'],
            'variant_id'        => ['nullable', 'integer',
                Rule::exists('product_variants', 'id')->where('product_id', $this->route('product')?->id)],
        ];
    }

    public function messages(): array
    {
        return [
            'media_asset_ids.required' => 'Chọn ít nhất một ảnh.',
            'media_asset_ids.*.exists' => 'Ảnh không tồn tại trong thư viện.',
            'variant_id.exists'        => 'Phiên bản không thuộc sản phẩm này.',
        ];
    }
}
```

- [ ] **Step 2: Add `attach()` to `ProductMediaController`; `destroy()` uses `detach()`**

```php
public function attach(\App\Http\Requests\Admin\AttachMediaRequest $request, Product $product): JsonResponse
{
    $variantId = $request->validated('variant_id');
    $this->service->attachToProduct(
        $product,
        $request->validated('media_asset_ids'),
        $variantId !== null ? (int) $variantId : null,
    );
    $media = $product->media()->orderBy('sort_order')->get();
    return response()->json(['data' => ProductMediaResource::collection($media)]);
}
```
In `destroy()`, replace `$this->service->delete($media)` with `$this->service->detach($media)`.

- [ ] **Step 3: Add route** (BEFORE the `{media}` wildcard, like `reorder`)

```php
Route::post('products/{product}/media/attach', [ProductMediaController::class, 'attach']);
```

- [ ] **Step 4: Write the failing test** (add to `AdminProductMediaVariantTest`)

```php
public function test_attach_existing_assets_appends_and_tags_variant(): void
{
    $product = \App\Models\Product::factory()->create();
    $variant = \App\Models\ProductVariant::factory()->create(['product_id' => $product->id]);
    $a1 = \App\Models\MediaAsset::factory()->create();
    $a2 = \App\Models\MediaAsset::factory()->create();

    $this->actingAs($this->admin())->postJson("/api/admin/products/{$product->id}/media/attach", [
        'media_asset_ids' => [$a1->id, $a2->id],
        'variant_id'      => $variant->id,
    ])->assertOk()->assertJsonCount(2, 'data');

    $this->assertDatabaseHas('product_media', ['product_id' => $product->id, 'media_asset_id' => $a1->id, 'variant_id' => $variant->id]);
}

public function test_detach_removes_attachment_but_keeps_asset(): void
{
    $product = \App\Models\Product::factory()->create();
    $asset   = \App\Models\MediaAsset::factory()->create();
    $m = \App\Models\ProductMedia::create(['product_id' => $product->id, 'media_asset_id' => $asset->id, 'sort_order' => 0]);

    $this->actingAs($this->admin())->deleteJson("/api/admin/products/{$product->id}/media/{$m->id}")->assertNoContent();

    $this->assertDatabaseMissing('product_media', ['id' => $m->id]);
    $this->assertDatabaseHas('media_assets', ['id' => $asset->id]);
}
```

> The existing `AdminProductMediaVariantTest` mocks `MediaService` in `setUp`. `attach`/`detach` call the real service methods (no Cloudinary), so either (a) un-mock for these tests, or (b) mock `attachToProduct`/`detach` to no-op and assert differently. Recommended: give this test its own class `AdminMediaAttachTest` WITHOUT the service mock (attach/detach don't touch Cloudinary). Put the two tests there.

- [ ] **Step 5: Run tests**

Run: `... php artisan test tests/Feature/Admin/AdminMediaAttachTest.php`
Expected: PASS.

- [ ] **Step 6: Stage (do not commit)**

```bash
git add src/app/Http/Requests/Admin/AttachMediaRequest.php src/app/Http/Controllers/Admin/ProductMediaController.php src/routes/api.php src/tests/Feature/Admin/AdminMediaAttachTest.php
```

---

### Task 8: Category `media_asset_id` + retire `uploadRaw` path

**Files:**
- Modify: `src/app/Http/Requests/Admin/*` category store/update requests (add `media_asset_id`)
- Modify: `src/app/Services/CategoryService.php` (set `media_asset_id`; stop calling `uploadRaw`/`destroyRaw`)
- Modify: `src/app/Http/Resources/CategoryResource.php` (`image_url` reads via `asset`)
- Test: `src/tests/Feature/Admin/*CategoryTest*` (extend)

**Interfaces:**
- Produces: category create/update accept `media_asset_id` (nullable, exists); `CategoryResource.image_url` = `$this->asset?->url ?? $this->image_url`.

- [ ] **Step 1: Read the current category request/service/resource** to match exact class names.

Run: `grep -rn "image_url\|image_public_id\|uploadRaw\|media_asset" src/app/Http/Requests/Admin src/app/Services/CategoryService.php src/app/Http/Resources/CategoryResource.php`

- [ ] **Step 2: Add `media_asset_id` rule to category store + update requests**

```php
'media_asset_id' => ['nullable', 'integer', 'exists:media_assets,id'],
```

- [ ] **Step 3: In `CategoryService`, set `media_asset_id` on create/update; delete the `uploadRaw`/`destroyRaw` calls**

Replace image-handling with: `$data['media_asset_id'] = $dto->mediaAssetId;` (thread it through the DTO). Keep `image_url`/`image_public_id` untouched (read-only legacy).

- [ ] **Step 4: `CategoryResource` reads through asset**

```php
'image_url' => $this->asset?->url ?? $this->image_url,
```
Ensure the controller eager-loads `asset` on categories.

- [ ] **Step 5: Write the failing test**

```php
public function test_category_image_set_from_library_asset(): void
{
    $asset = \App\Models\MediaAsset::factory()->create(['url' => 'https://cdn/x.jpg']);
    // ... create category via admin endpoint with media_asset_id => $asset->id ...
    // assert CategoryResource.image_url === 'https://cdn/x.jpg'
}
```
(Fill in with the real category create endpoint + admin auth, matching existing category tests.)

- [ ] **Step 6: Run tests**

Run: `... php artisan test tests/Feature/Admin` (category + media suites)
Expected: PASS.

- [ ] **Step 7: Stage (do not commit)**

```bash
git add src/app/Http/Requests/Admin src/app/Services/CategoryService.php src/app/Http/Resources/CategoryResource.php src/tests/Feature/Admin
```

---

## Phase 4 — FE feature module + shared components + picker

### Task 9: `features/admin/media` api + hooks

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/features/admin/media/api.js`
- Create: `src/features/admin/media/hooks.js`
- Modify: `src/features/admin/products/api.js` + `hooks.js` (add `attachMedia` + `useAttachMedia`)
- Test: `src/features/admin/media/hooks.test.jsx` (optional — light)

**Interfaces:**
- Produces: `listMedia(params)`, `uploadMedia(formData)`, `updateMediaAlt(id, alt_text)`, `deleteMedia(id)`; hooks `useMediaLibrary(params)` (offset), `useUploadMedia()`, `useUpdateMediaAsset()`, `useDeleteMediaAsset()`; `productsApi.attachMedia(productId, { media_asset_ids, variant_id })` + `useAttachMedia()`.

- [ ] **Step 1: Write `api.js`**

```js
import { apiClient } from '../../../lib/apiClient'

export function listMedia(params) {
  return apiClient.get('/admin/media', { params })
}
export function uploadMedia(formData) {
  return apiClient.post('/admin/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export function updateMediaAlt(id, alt_text) {
  return apiClient.patch(`/admin/media/${id}`, { alt_text })
}
export function deleteMedia(id) {
  return apiClient.delete(`/admin/media/${id}`)
}
```

- [ ] **Step 2: Write `hooks.js`** (offset pagination via `useOffsetQuery`; check its signature in `src/lib/pagination.js`)

```js
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOffsetQuery } from '../../../lib/pagination'
import * as mediaApi from './api'

export function useMediaLibrary(params) {
  return useOffsetQuery(['admin', 'media', params], (p) => mediaApi.listMedia({ ...params, ...p }))
}
export function useUploadMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => mediaApi.uploadMedia(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })
}
export function useUpdateMediaAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, alt_text }) => mediaApi.updateMediaAlt(id, alt_text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })
}
export function useDeleteMediaAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => mediaApi.deleteMedia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] }),
  })
}
```

> Adjust `useMediaLibrary` to the real `useOffsetQuery` signature (read `src/lib/pagination.js` first — it may take `(key, queryFn)` returning `{ data, page, setPage, ... }`).

- [ ] **Step 3: Add `attachMedia` to products api + `useAttachMedia` hook**

`api.js`:
```js
export function attachMedia(productId, { media_asset_ids, variant_id = null }) {
  return apiClient.post(`/admin/products/${productId}/media/attach`, { media_asset_ids, variant_id })
}
```
`hooks.js`:
```js
export function useAttachMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, mediaAssetIds, variantId = null }) =>
      productsApi.attachMedia(productId, { media_asset_ids: mediaAssetIds, variant_id: variantId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}
```

- [ ] **Step 4: Stage (do not commit)**

```bash
git add src/features/admin/media/api.js src/features/admin/media/hooks.js src/features/admin/products/api.js src/features/admin/products/hooks.js
```

---

### Task 10: `MediaGrid` + `MediaUploadDropzone` shared components

**Files:**
- Create: `src/features/admin/media/MediaGrid.jsx`
- Create: `src/features/admin/media/MediaUploadDropzone.jsx`
- Test: `src/features/admin/media/MediaGrid.test.jsx`

**Interfaces:**
- Produces: `<MediaGrid items selectedIds multiple onToggle attachedAssetIds />` (renders thumbnails with usage badges + selection checkboxes); `<MediaUploadDropzone accept onUploaded />` (file input → `useUploadMedia` → calls `onUploaded(asset)`).

- [ ] **Step 1: Write `MediaGrid`**

```jsx
import { CheckCircle2 } from 'lucide-react'

export function MediaGrid({ items = [], selectedIds = [], onToggle, attachedAssetIds = [] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {items.map((asset) => {
        const selected = selectedIds.includes(asset.id)
        const attached = attachedAssetIds.includes(asset.id)
        return (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => !attached && onToggle(asset)}
              aria-pressed={selected}
              disabled={attached}
              className={`relative block aspect-square w-full overflow-hidden rounded-control border ${
                selected ? 'border-foreground ring-2 ring-ring' : 'border-border'
              } ${attached ? 'opacity-40' : 'hover:border-border-strong'}`}
            >
              <img src={asset.url} alt={asset.alt_text ?? ''} className="h-full w-full object-cover" />
              {selected && <CheckCircle2 size={18} className="absolute right-1 top-1 text-foreground" aria-hidden="true" />}
              {asset.usage_count > 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 py-0.5 text-[10px] text-surface">
                  {asset.usage_count} nơi
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: Write `MediaUploadDropzone`**

```jsx
import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useUploadMedia } from './hooks'
import { Spinner } from '../../../components/Spinner'

export function MediaUploadDropzone({ accept = 'image/*', onUploaded }) {
  const inputRef = useRef(null)
  const upload = useUploadMedia()
  const [error, setError] = useState(null)

  async function handleFiles(files) {
    setError(null)
    for (const file of files) {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      try {
        const res = await upload.mutateAsync(fd)
        onUploaded?.(res.data)
      } catch (e) {
        setError(e?.message ?? 'Tải lên thất bại.')
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong p-8 text-center">
      <Upload size={24} className="text-muted-foreground" aria-hidden="true" />
      <button type="button" onClick={() => inputRef.current?.click()} className="text-sm font-medium text-foreground underline">
        Chọn ảnh để tải lên
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden"
             onChange={(e) => handleFiles(Array.from(e.target.files ?? []))} />
      {upload.isPending && <Spinner label="Đang tải lên" />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Write the failing test for `MediaGrid`**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MediaGrid } from './MediaGrid'

describe('MediaGrid', () => {
  it('toggles selection and marks attached items disabled', async () => {
    const onToggle = vi.fn()
    render(<MediaGrid
      items={[{ id: 1, url: 'a.jpg', alt_text: 'A', usage_count: 2 }, { id: 2, url: 'b.jpg', usage_count: 0 }]}
      selectedIds={[2]} attachedAssetIds={[1]} onToggle={onToggle} />)

    expect(screen.getByText('2 nơi')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()            // attached
    await userEvent.click(buttons[1])
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/admin/media/MediaGrid.test.jsx`
Expected: PASS.

- [ ] **Step 5: Stage (do not commit)**

```bash
git add src/features/admin/media/MediaGrid.jsx src/features/admin/media/MediaUploadDropzone.jsx src/features/admin/media/MediaGrid.test.jsx
```

---

### Task 11: `MediaLibraryModal` picker

**Files:**
- Create: `src/features/admin/media/MediaLibraryModal.jsx`
- Test: `src/features/admin/media/MediaLibraryModal.test.jsx`

**Interfaces:**
- Produces: `<MediaLibraryModal open onClose multiple accept attachedAssetIds onSelect />`. `onSelect(assets[])` fires with the chosen asset objects; single-select passes a 1-item array.

- [ ] **Step 1: Write `MediaLibraryModal`** (Radix Dialog + two tabs)

```jsx
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useMediaLibrary } from './hooks'
import { MediaGrid } from './MediaGrid'
import { MediaUploadDropzone } from './MediaUploadDropzone'
import { SearchInput } from '../../../components/SearchInput'
import { Pagination } from '../../../components/Pagination'
import { Button } from '../../../components/Button'
import { EmptyState } from '../../../components/EmptyState'

export function MediaLibraryModal({ open, onClose, multiple = true, accept = 'image/*', attachedAssetIds = [], onSelect }) {
  const [tab, setTab] = useState('library')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([]) // asset objects
  const { data, page, setPage, lastPage, isLoading } = useMediaLibrary({ search })

  const items = data?.data ?? []

  function toggle(asset) {
    setSelected((prev) => {
      if (prev.some((a) => a.id === asset.id)) return prev.filter((a) => a.id !== asset.id)
      return multiple ? [...prev, asset] : [asset]
    })
  }

  function confirm() {
    onSelect(selected)
    setSelected([])
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(48rem,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-border bg-surface p-6 text-ink shadow-card">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl text-foreground">Thư viện ảnh</Dialog.Title>
            <Dialog.Close aria-label="Đóng" className="text-muted-foreground hover:text-foreground"><X size={20} /></Dialog.Close>
          </div>

          <div className="mt-4 flex gap-2 border-b border-border">
            <button type="button" onClick={() => setTab('library')} aria-pressed={tab === 'library'}
              className={`px-3 py-2 text-sm ${tab === 'library' ? 'border-b-2 border-foreground text-foreground' : 'text-muted-foreground'}`}>Thư viện</button>
            <button type="button" onClick={() => setTab('upload')} aria-pressed={tab === 'upload'}
              className={`px-3 py-2 text-sm ${tab === 'upload' ? 'border-b-2 border-foreground text-foreground' : 'text-muted-foreground'}`}>Tải lên</button>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {tab === 'library' ? (
              <>
                <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên/mô tả ảnh" />
                <div className="mt-4">
                  {isLoading ? null : items.length === 0
                    ? <EmptyState title="Chưa có ảnh nào." />
                    : <MediaGrid items={items} selectedIds={selected.map((a) => a.id)} multiple={multiple}
                        attachedAssetIds={attachedAssetIds} onToggle={toggle} />}
                </div>
                {lastPage > 1 && <div className="mt-4"><Pagination page={page} lastPage={lastPage} onPageChange={setPage} /></div>}
              </>
            ) : (
              <MediaUploadDropzone accept={accept} onUploaded={(asset) => { toggle(asset); setTab('library') }} />
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Huỷ</Button>
            <Button type="button" variant="primary" onClick={confirm} disabled={selected.length === 0}>
              Chọn {selected.length > 0 ? `(${selected.length})` : ''}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

> Verify exact prop APIs of `SearchInput`, `Pagination`, `EmptyState`, `Button` (read those components). Adjust `useMediaLibrary` destructuring to the real `useOffsetQuery` return shape.

- [ ] **Step 2: Write the failing test** (mock the media api)

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MediaLibraryModal } from './MediaLibraryModal'
import * as mediaApi from './api'

vi.mock('./api')

function renderModal(props = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MediaLibraryModal open multiple onClose={() => {}} onSelect={props.onSelect ?? (() => {})} />
    </QueryClientProvider>,
  )
}

describe('MediaLibraryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mediaApi.listMedia.mockResolvedValue({
      data: [{ id: 1, url: 'a.jpg', alt_text: 'Sofa', usage_count: 0 }],
      meta: { pagination: { total: 1, page: 1, last_page: 1, per_page: 24 } },
    })
  })

  it('selects an asset and fires onSelect with it', async () => {
    const onSelect = vi.fn()
    renderModal({ onSelect })
    const tile = await screen.findByRole('button', { name: /sofa/i })
    await userEvent.click(tile)
    await userEvent.click(screen.getByRole('button', { name: /chọn/i }))
    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ id: 1 })])
  })
})
```

> The tile's accessible name may derive from the `<img alt>`; if the query fails, target by alt text via `within`. Adjust to the real `useOffsetQuery` shape so `data.data` resolves.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/admin/media/MediaLibraryModal.test.jsx`
Expected: PASS.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add src/features/admin/media/MediaLibraryModal.jsx src/features/admin/media/MediaLibraryModal.test.jsx
```

---

## Phase 5 — Wire consumers

### Task 12: Product edit page uses the picker

**Files:**
- Modify: `src/pages/admin/products/AdminProductEditPage.jsx`
- Test: `src/pages/admin/products/AdminProductEditPage.test.jsx` (extend)

- [ ] **Step 1: Read the current media section** of `AdminProductEditPage.jsx` (the direct-upload input + media cards + per-card variant dropdown from #7).

- [ ] **Step 2: Replace the direct-upload input with a "Thêm ảnh" button + `MediaLibraryModal`**

```jsx
// state
const [pickerOpen, setPickerOpen] = useState(false)
const attachMedia = useAttachMedia()
const attachedIds = (product.media ?? []).map((m) => m.media_asset_id)

async function handleAttach(assets) {
  await attachMedia.mutateAsync({ productId: product.id, mediaAssetIds: assets.map((a) => a.id) })
  // refetch/refresh product media (invalidate ['admin','products'] already done by hook) — re-read product
}

// JSX
<Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>Thêm ảnh</Button>
<MediaLibraryModal open={pickerOpen} onClose={() => setPickerOpen(false)} multiple
  attachedAssetIds={attachedIds} onSelect={handleAttach} />
```
Keep the existing per-card variant dropdown, reorder, and "Gỡ" (delete → detach) controls. Rename the delete button label to "Gỡ".

- [ ] **Step 3: Write the failing test**

```jsx
it('opens the media picker and attaches selected library assets', async () => {
  // mock productsApi.attachMedia + mediaApi.listMedia
  // render edit page, click "Thêm ảnh", pick a tile, click "Chọn"
  // assert attachMedia called with { productId, media_asset_ids: [<id>] }
})
```
(Fill with the page's existing render harness + mocks, matching the #7 test in the same file.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/pages/admin/products/AdminProductEditPage.test.jsx`
Expected: PASS.

- [ ] **Step 5: Stage (do not commit)**

```bash
git add src/pages/admin/products/AdminProductEditPage.jsx src/pages/admin/products/AdminProductEditPage.test.jsx
```

---

### Task 13: Category form uses the picker

**Files:**
- Modify: `src/pages/admin/categories/AdminCategoriesPage.jsx` (or the category form component)
- Test: `src/pages/admin/categories/AdminCategoriesPage.test.jsx`

- [ ] **Step 1: Read the current category image field**, then replace its upload with `<MediaLibraryModal multiple={false} …>`; on select set form `media_asset_id` + preview thumbnail; submit sends `media_asset_id`. Show "Đổi ảnh" / "Gỡ" (set null).

- [ ] **Step 2: Write the failing test** — pick an asset → assert the create/update payload includes `media_asset_id`.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/pages/admin/categories/AdminCategoriesPage.test.jsx`
Expected: PASS.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add src/pages/admin/categories/AdminCategoriesPage.jsx src/pages/admin/categories/AdminCategoriesPage.test.jsx
```

---

### Task 14: Standalone Media Library page + nav + route

**Files:**
- Create: `src/pages/admin/media/AdminMediaLibraryPage.jsx`
- Modify: `src/app/router.jsx` (lazy route `media`)
- Modify: `src/pages/admin/AdminLayout.jsx` (nav item "Thư viện ảnh")
- Test: `src/pages/admin/media/AdminMediaLibraryPage.test.jsx`

**Interfaces:**
- Produces: route `/admin/media` → `AdminMediaLibraryPage`.

- [ ] **Step 1: Write `AdminMediaLibraryPage`** (reuses `MediaGrid` + search/filter/pagination + upload + delete/edit-alt)

```jsx
import { useState } from 'react'
import { Images } from 'lucide-react'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import { SearchInput } from '../../../components/SearchInput'
import { Pagination } from '../../../components/Pagination'
import { EmptyState } from '../../../components/EmptyState'
import { MediaGrid } from '../../../features/admin/media/MediaGrid'
import { MediaUploadDropzone } from '../../../features/admin/media/MediaUploadDropzone'
import { useMediaLibrary, useDeleteMediaAsset } from '../../../features/admin/media/hooks'
import { useToastStore } from '../../../store/toastStore'

export function AdminMediaLibraryPage() {
  const [search, setSearch] = useState('')
  const { data, page, setPage, lastPage, isLoading } = useMediaLibrary({ search })
  const del = useDeleteMediaAsset()
  const addToast = useToastStore((s) => s.addToast)
  const items = data?.data ?? []

  function handleDelete(asset) {
    del.mutate(asset.id, {
      onError: (e) => addToast({
        title: 'Không thể xoá ảnh.',
        description: e?.details?.usage_count != null
          ? `Ảnh đang được dùng bởi ${e.details.usage_count} nơi.` : e?.message,
        variant: 'error',
      }),
    })
  }

  return (
    <div>
      <PageHeader title="Thư viện ảnh" icon={Images} />
      <Panel><MediaUploadDropzone onUploaded={() => {}} /></Panel>
      <Panel>
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm ảnh" />
        <div className="mt-4">
          {isLoading ? null : items.length === 0
            ? <EmptyState title="Chưa có ảnh nào." />
            : <MediaGrid items={items} selectedIds={[]} onToggle={handleDelete} />}
        </div>
        {lastPage > 1 && <div className="mt-4"><Pagination page={page} lastPage={lastPage} onPageChange={setPage} /></div>}
      </Panel>
    </div>
  )
}
```

> Adjust to real primitive prop APIs. For MVP, `onToggle` on the page triggers delete; if you prefer an explicit per-tile delete/edit menu, add it — but keep it minimal.

- [ ] **Step 2: Add lazy route** in `src/app/router.jsx`

```js
const AdminMediaLibraryPage = named(() => import('../pages/admin/media/AdminMediaLibraryPage'), 'AdminMediaLibraryPage')
// ...in the admin children:
{ path: 'media', element: lazyPage(<AdminMediaLibraryPage />) },
```

- [ ] **Step 3: Add nav item** in `AdminLayout.jsx` (catalog group, after products)

```js
{ to: '/admin/media', label: 'Thư viện ảnh', icon: Images },
```
(import `Images` from `lucide-react`.)

- [ ] **Step 4: Write the failing test** — renders list, delete-in-use shows the blocked toast.

- [ ] **Step 5: Run tests + lint + build**

Run: `npx vitest run src/pages/admin/media/AdminMediaLibraryPage.test.jsx && npm run lint && npm run build`
Expected: PASS / clean / exit 0.

- [ ] **Step 6: Stage (do not commit)**

```bash
git add src/pages/admin/media/AdminMediaLibraryPage.jsx src/app/router.jsx src/pages/admin/AdminLayout.jsx src/pages/admin/media/AdminMediaLibraryPage.test.jsx
```

---

## Phase 6 — Docs + full verification

### Task 15: Sync docs + full-suite verification

**Files:**
- Modify: `Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md`
- Modify: `docs/superpowers/specs/2026-07-08-media-library-design.md` (mark BUILT if any deviations)

- [ ] **Step 1: Update `FE_AI_CONTEXT.md`** — add: `GET/POST/PATCH/DELETE /api/admin/media` (+ `MediaAssetResource` shape, `usage_count`, `409 MEDIA_IN_USE`), `POST products/{product}/media/attach`, product `DELETE …/media/{media}` now detaches, `ProductMediaResource.media_asset_id`, category `media_asset_id` (+ `image_url` reads via asset).

- [ ] **Step 2: Run the full BE suite**

Run: `... php artisan test` (from BE root, Docker sqlite)
Expected: all green.

- [ ] **Step 3: Run the full FE suite + build**

Run: `cd Nestify-Furniture-e-commerce-frontend && npm run lint && npx vitest run && npm run build`
Expected: lint clean, all tests pass, build exit 0.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add docs/
```

- [ ] **Step 5: Report to user** — summarize what to run: the three migrations (`create_media_assets`, `add_media_asset_id…`, `backfill_media_assets`) against prod (backfill is idempotent), then deploy BE, then FE. Nothing committed — awaiting user.

---

## Self-Review notes (author)

- **Spec coverage:** data model (T1–T3), MediaService refactor (T4–T5), library API (T6), attach/detach (T7), category (T8), FE module (T9), shared components (T10), picker (T11), product wire (T12), category wire (T13), standalone page (T14), docs (T15). All spec sections mapped.
- **Known verification points flagged inline** (real signatures the executor must confirm before coding): `useOffsetQuery` shape (`src/lib/pagination.js`); `SearchInput`/`Pagination`/`EmptyState`/`PageHeader`/`Panel`/`Button` prop APIs; the super-admin test helper name; the exact category request/service/resource class names; whether `product_media` legacy `alt_text` column exists (it does per `2026_05_01_000012`).
- **Sqlite caveat:** the finalize step of T3 can't `MODIFY … NOT NULL` under sqlite — guarded by a driver check so tests pass while prod (MySQL) enforces non-null.
