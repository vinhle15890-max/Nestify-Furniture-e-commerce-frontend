# Room Planner — Ảnh snapshot phòng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps dùng checkbox. Cross-repo (BE + FE).

**Goal:** Lúc Lưu phòng, chụp ảnh canvas → BE upload Cloudinary → card "Phòng của tôi" hiện ảnh phối cảnh của chính phòng đó.

**Architecture:** BE thêm cột `preview_url`/`preview_public_id` trên `room_scenes` + endpoint upload (tái dùng `MediaService::uploadRaw`/`destroyRaw`). FE chụp canvas WebGL (`preserveDrawingBuffer`), best-effort upload sau Save, card render ảnh.

**Tech Stack:** Laravel 13, Cloudinary; React 18 JSX, @react-three/fiber, canvas 2D API, TanStack Query, Vitest.

## Global Constraints

- **Migration idempotent (`Schema::hasColumn`), user chạy prod** — KHÔNG chạy migration ở đây.
- **`preview_public_id` KHÔNG serialize** (Resource chỉ trả `preview_url`).
- FormRequest validate mime/size trong `rules()`.
- Best-effort: chụp/upload lỗi KHÔNG làm hỏng Save.
- KHÔNG commit (guardrail). FE task đóng bằng lint+test; BE task đóng bằng `php -l` (sandbox không có vendor/DB) + **user chạy `--filter=RoomScene`**.
- FE không thêm dependency.

---

### Task 1 (BE): Migration + model + resource

**Files:**
- Create: `src/database/migrations/2026_07_10_000001_add_preview_to_room_scenes_table.php`
- Modify: `src/app/Models/RoomScene.php` (fillable)
- Modify: `src/app/Http/Resources/RoomSceneResource.php`

- [ ] **Step 1: Migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('room_scenes', function (Blueprint $table) {
            if (! Schema::hasColumn('room_scenes', 'preview_url')) {
                $table->text('preview_url')->nullable()->after('is_public');
            }
            if (! Schema::hasColumn('room_scenes', 'preview_public_id')) {
                $table->string('preview_public_id')->nullable()->after('preview_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('room_scenes', function (Blueprint $table) {
            foreach (['preview_url', 'preview_public_id'] as $col) {
                if (Schema::hasColumn('room_scenes', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
```

- [ ] **Step 2: Model fillable** — `RoomScene.php`:

```php
    protected $fillable = ['user_id','name','description','width','depth','height','share_token','is_public','preview_url','preview_public_id'];
```

- [ ] **Step 3: Resource** — thêm vào `RoomSceneResource::toArray` (sau `share_token`, KHÔNG thêm preview_public_id):

```php
            'preview_url' => $this->preview_url,
```

- [ ] **Step 4:** `php -l` cả 3 file → "No syntax errors". (Migration user chạy prod.)

---

### Task 2 (BE): Service + Controller + Request + Route

**Files:**
- Modify: `src/app/Services/RoomSceneService.php` (inject MediaService; `attachPreview`; cleanup trong `delete`)
- Modify: `src/app/Http/Controllers/RoomSceneController.php` (`uploadPreview`)
- Create: `src/app/Http/Requests/RoomScene/UploadScenePreviewRequest.php`
- Modify: `src/routes/api.php`
- Test: `src/tests/Feature/RoomScene/ScenePreviewTest.php`

**Interfaces:** `RoomSceneService::attachPreview(RoomScene, UploadedFile) → RoomScene`.

- [ ] **Step 1: Request** — `UploadScenePreviewRequest.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests\RoomScene;

use Illuminate\Foundation\Http\FormRequest;

class UploadScenePreviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
```

- [ ] **Step 2: Service** — inject MediaService + methods. Constructor:

```php
    public function __construct(
        private readonly CartService $cartService,
        private readonly OrderService $orderService,
        private readonly MediaService $mediaService,
    ) {}
```

Thêm method `attachPreview` (đặt cạnh `share`); sửa `delete`:

```php
    /**
     * Upload/replace the scene's preview image on Cloudinary (best-effort caller).
     * Old asset is destroyed so we never orphan previews.
     */
    public function attachPreview(RoomScene $scene, \Illuminate\Http\UploadedFile $file): RoomScene
    {
        $result = $this->mediaService->uploadRaw($file, 'image');
        if ($scene->preview_public_id) {
            $this->mediaService->destroyRaw($scene->preview_public_id);
        }
        $scene->update([
            'preview_url'       => $result['url'],
            'preview_public_id' => $result['public_id'],
        ]);

        return $scene;
    }

    public function delete(RoomScene $scene): void
    {
        if ($scene->preview_public_id) {
            $this->mediaService->destroyRaw($scene->preview_public_id);
        }
        $scene->delete();
    }
```

(MediaService cùng namespace `App\Services` → không cần `use`.)

- [ ] **Step 3: Controller** — thêm method + import. `use App\Http\Requests\RoomScene\UploadScenePreviewRequest;`

```php
    public function uploadPreview(UploadScenePreviewRequest $request, int $id): JsonResponse
    {
        $scene = $request->user()->roomScenes()->find($id);

        if (! $scene) {
            return response()->json([
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Phòng thiết kế không tồn tại.'],
            ], 404);
        }

        $scene = $this->service->attachPreview($scene, $request->file('image'));

        return response()->json(['data' => new RoomSceneResource($scene)]);
    }
```

- [ ] **Step 4: Route** — `api.php`, trong nhóm auth cạnh các route room-scenes:

```php
    Route::post('room-scenes/{id}/preview', [RoomSceneController::class, 'uploadPreview']);
```

- [ ] **Step 5: Test** — `ScenePreviewTest.php`:

```php
<?php

namespace Tests\Feature\RoomScene;

use App\Models\RoomScene;
use App\Models\User;
use App\Services\MediaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ScenePreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_uploads_preview_sets_url_and_hides_public_id(): void
    {
        $this->mock(MediaService::class, function ($m) {
            $m->shouldReceive('uploadRaw')->once()->andReturn(['url' => 'https://cdn/x.png', 'public_id' => 'pid1']);
            $m->shouldReceive('destroyRaw')->never();
        });
        $user  = User::factory()->verified()->create();
        $scene = RoomScene::factory()->create(['user_id' => $user->id]);

        $res = $this->actingAs($user)
            ->postJson("/api/room-scenes/{$scene->id}/preview", ['image' => UploadedFile::fake()->image('p.png')])
            ->assertOk()
            ->assertJsonPath('data.preview_url', 'https://cdn/x.png');
        $this->assertArrayNotHasKey('preview_public_id', $res->json('data'));
        $this->assertDatabaseHas('room_scenes', ['id' => $scene->id, 'preview_public_id' => 'pid1']);
    }

    public function test_replacing_preview_destroys_the_old_asset(): void
    {
        $this->mock(MediaService::class, function ($m) {
            $m->shouldReceive('uploadRaw')->once()->andReturn(['url' => 'https://cdn/new.png', 'public_id' => 'new']);
            $m->shouldReceive('destroyRaw')->once()->with('old');
        });
        $user  = User::factory()->verified()->create();
        $scene = RoomScene::factory()->create(['user_id' => $user->id, 'preview_public_id' => 'old', 'preview_url' => 'https://cdn/old.png']);

        $this->actingAs($user)
            ->postJson("/api/room-scenes/{$scene->id}/preview", ['image' => UploadedFile::fake()->image('p.png')])
            ->assertOk();
    }

    public function test_non_owner_cannot_upload_preview(): void
    {
        $owner = User::factory()->verified()->create();
        $other = User::factory()->verified()->create();
        $scene = RoomScene::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->postJson("/api/room-scenes/{$scene->id}/preview", ['image' => UploadedFile::fake()->image('p.png')])
            ->assertNotFound();
    }

    public function test_invalid_file_is_rejected(): void
    {
        $user  = User::factory()->verified()->create();
        $scene = RoomScene::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->postJson("/api/room-scenes/{$scene->id}/preview", ['image' => 'not-a-file'])
            ->assertStatus(422);
    }

    public function test_deleting_scene_cleans_up_preview_asset(): void
    {
        $this->mock(MediaService::class, function ($m) {
            $m->shouldReceive('destroyRaw')->once()->with('pid');
        });
        $user  = User::factory()->verified()->create();
        $scene = RoomScene::factory()->create(['user_id' => $user->id, 'preview_public_id' => 'pid']);

        $this->actingAs($user)->deleteJson("/api/room-scenes/{$scene->id}")->assertNoContent();
    }
}
```

- [ ] **Step 6:** `php -l` các file. **User chạy** `docker compose exec app php artisan test --filter=RoomScene`.

---

### Task 3 (FE): Capture util + SceneStage + RoomCanvas đăng ký

**Files:**
- Create: `src/features/roomPlanner/canvasCapture.js`
- Modify: `src/pages/roomPlanner/scene/SceneStage.jsx`
- Modify: `src/pages/roomPlanner/scene/RoomCanvas.jsx`
- Test: `src/features/roomPlanner/canvasCapture.test.js`

**Interfaces:** `registerPlannerCanvas(el)`, `unregisterPlannerCanvas(el)`, `capturePlannerPreview(maxWidth=800) → Promise<File|null>`.

- [ ] **Step 1: Test đỏ** — `canvasCapture.test.js`

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerPlannerCanvas, unregisterPlannerCanvas, capturePlannerPreview } from './canvasCapture'

describe('capturePlannerPreview', () => {
  beforeEach(() => unregisterPlannerCanvas())

  it('chưa đăng ký canvas → null', async () => {
    expect(await capturePlannerPreview()).toBeNull()
  })

  it('đăng ký canvas → trả File png', async () => {
    const drawImage = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0, height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (cb) => cb(new Blob(['x'], { type: 'image/png' })),
    })
    registerPlannerCanvas({ width: 1600, height: 900 })
    const file = await capturePlannerPreview(800)
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('room-preview.png')
    expect(drawImage).toHaveBeenCalled()
    document.createElement.mockRestore()
  })
})
```

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/features/roomPlanner/canvasCapture.test.js`

- [ ] **Step 3: Tạo `canvasCapture.js`**

```js
// Cầu nối giữa React event (bấm Lưu) và canvas WebGL của editor. Editor canvas tự
// đăng ký; capturePlannerPreview vẽ thu nhỏ lên canvas 2D rồi xuất PNG. Cần
// <Canvas gl={{ preserveDrawingBuffer: true }}> để đọc pixel sau render.
let plannerCanvas = null

export function registerPlannerCanvas(el) {
  plannerCanvas = el
}

export function unregisterPlannerCanvas(el) {
  if (el === undefined || plannerCanvas === el) plannerCanvas = null
}

export async function capturePlannerPreview(maxWidth = 800) {
  const src = plannerCanvas
  if (!src || !src.width || !src.height) return null

  const scale = Math.min(1, maxWidth / src.width)
  const w = Math.round(src.width * scale)
  const h = Math.round(src.height * scale)

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(src, 0, 0, w, h)

  const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'))
  if (!blob) return null
  return new File([blob], 'room-preview.png', { type: 'image/png' })
}
```

- [ ] **Step 4: `SceneStage.jsx`** — thêm `onRendererReady` prop + preserveDrawingBuffer:

```jsx
export function SceneStage({ room, orbitEnabled = true, onRendererReady, children }) {
```

Trong `handleCreated`, sau khi gắn listener:

```jsx
    canvas.addEventListener('webglcontextrestored', () => setContextLost(false))
    onRendererReady?.(gl)
  }
```

Canvas:

```jsx
      <Canvas gl={{ preserveDrawingBuffer: true }} onCreated={handleCreated} shadows camera={{ position: [camDistance, camDistance, camDistance], fov: 45 }}>
```

- [ ] **Step 5: `RoomCanvas.jsx`** — đăng ký canvas editor + huỷ khi unmount:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
// ...import:
import { registerPlannerCanvas, unregisterPlannerCanvas } from '../../../features/roomPlanner/canvasCapture'
// ...trong component:
  const canvasElRef = useRef(null)
  useEffect(() => () => { if (canvasElRef.current) unregisterPlannerCanvas(canvasElRef.current) }, [])
// ...SceneStage:
    <SceneStage
      room={room}
      orbitEnabled={orbitEnabled}
      onRendererReady={(gl) => { canvasElRef.current = gl.domElement; registerPlannerCanvas(gl.domElement) }}
    >
```

- [ ] **Step 6: Chạy → XANH** + lint. KHÔNG commit.

---

### Task 4 (FE): api + hook + best-effort trong handleSave

**Files:**
- Modify: `src/features/roomPlanner/api.js`
- Modify: `src/features/roomPlanner/hooks.js`
- Modify: `src/pages/roomPlanner/RoomPlannerPage.jsx`

- [ ] **Step 1: api** — `api.js`:

```js
export function uploadScenePreview(id, file) {
  const form = new FormData()
  form.append('image', file)
  return apiClient.post(`/room-scenes/${id}/preview`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
```

- [ ] **Step 2: hook** — `hooks.js` (đặt cạnh useUpdateScene):

```js
export function useUploadScenePreview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }) => roomPlannerApi.uploadScenePreview(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomScenes'] }),
  })
}
```

- [ ] **Step 3: handleSave best-effort** — `RoomPlannerPage.jsx`. Import:

```jsx
import { capturePlannerPreview } from '../../features/roomPlanner/canvasCapture'
// và thêm hook:
  const uploadPreview = useUploadScenePreview()
```

Sau `store.markSaved(id)` (cả nhánh create lẫn update — dùng biến `sceneId`), thêm:

```jsx
    // Best-effort: chụp ảnh phòng cho card "Phòng của tôi". Lỗi không đụng tới Save.
    try {
      const file = await capturePlannerPreview()
      if (file) uploadPreview.mutate({ id: sceneId, file })
    } catch { /* ignore — preview chỉ là điểm cộng */ }
```

> Đảm bảo `sceneId` có giá trị ở cả hai nhánh (update: `store.id`; create: `response.data.id`). Nếu code hiện tách 2 nhánh, đặt đoạn best-effort sau khi cả hai đã có id (ví dụ cuối hàm lưu, dùng id vừa xác định).

- [ ] **Step 4: Chạy → XANH** (suite hiện có không vỡ) + lint. KHÔNG commit.

---

### Task 5 (FE): Ảnh trên card "Phòng của tôi"

**Files:**
- Modify: `src/pages/account/MyRoomsPage.jsx`
- Test: `src/pages/account/MyRoomsPage.test.jsx`

- [ ] **Step 1: Test đỏ** (thêm vào `MyRoomsPage.test.jsx`)

```jsx
it('card hiện ảnh preview khi có preview_url', async () => {
  // mock useScenes trả 1 scene có preview_url (theo cách mock hiện có trong file test)
  // → expect <img> với src = preview_url
})
it('card dùng placeholder khi chưa có preview_url', async () => {
  // scene không preview_url → không có <img>, có BecomingRoomArt (role img hoặc svg)
})
```

> Theo đúng pattern mock `useScenes`/hooks đã có trong `MyRoomsPage.test.jsx`. Nếu file mock qua `vi.mock('../../features/roomPlanner/hooks')`, chỉ cần thêm `preview_url` vào scene fixture cho test 1 và bỏ ở test 2, rồi assert `screen.getByRole('img')` / `queryByRole('img', { name: /<tên phòng>/ })`.

- [ ] **Step 2: Chạy → ĐỎ.** `npm test -- --run src/pages/account/MyRoomsPage.test.jsx`

- [ ] **Step 3: Sửa `MyRoomsPage.jsx`** — thêm khối ảnh đầu `<li>` (trước hàng tên), import `BecomingRoomArt` đã có:

```jsx
      <div className="aspect-[16/9] overflow-hidden rounded-control bg-surface-alt">
        {scene.preview_url
          ? <img src={scene.preview_url} alt={`Ảnh phòng ${scene.name}`} loading="lazy" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center p-4"><BecomingRoomArt level={1} className="max-w-[220px]" /></div>}
      </div>
```

- [ ] **Step 4: Chạy → XANH.**

- [ ] **Step 5: Full FE suite + lint XANH.** nestify-review trên `MyRoomsPage.jsx` (ảnh + placeholder hợp DNA). KHÔNG commit.

---

## Self-Review

- **Spec coverage:** §4.1 = T1; §4.2 = T1; §4.3 = T2; §4.4 = T2 delete; §4.5 = T2 test; §5.1 = T3; §5.2 = T4; §5.3 = T5; §5.4 = T3+T5 test. Đủ.
- **Placeholder scan:** không TBD; code cụ thể (T5 test mô tả theo pattern mock hiện có — sẽ đọc file test lúc build).
- **Type consistency:** `attachPreview(RoomScene, UploadedFile)`, `uploadScenePreview(id, file)`, `{ id, file }` payload, `capturePlannerPreview()→File|null`, `registerPlannerCanvas/unregisterPlannerCanvas` khớp giữa các task. Resource trả `preview_url` (không public_id).
- **Guardrail:** migration idempotent + user prod; preview_public_id không serialize; best-effort; Checkpoint thay Commit.
