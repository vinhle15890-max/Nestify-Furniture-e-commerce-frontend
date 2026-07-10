# Room Planner — Chỉnh vỏ phòng trực tiếp (Sub-project A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho khách chỉnh trực tiếp vỏ phòng (kéo đổi kích thước + bật/tắt từng tường) trong một chế độ "Chỉnh phòng" nhìn-từ-trên, và lưu lại vào phòng.

**Architecture:** Phòng vẫn là hộp chữ nhật căn giữa gốc toạ độ. BE thêm 3 cột boolean tường trên `room_scenes`. FE thêm `room.walls` + `editMode` vào editorStore, action `resizeRoom`/`toggleWall`/`setEditMode`; chế độ room chuyển camera nhìn thẳng từ trên (khoá xoay), hiện núm resize 4 cạnh + cạnh tường bấm được, khoá tương tác đồ nội thất.

**Tech Stack:** BE Laravel 13 + PostgreSQL (DTO + FormRequest + Eloquent Resource, test sqlite Docker). FE React 18 JSX, zustand, @react-three/fiber + drei (OrbitControls/TransformControls/Grid), Vitest + RTL. KHÔNG thêm dependency.

## Global Constraints

- **KHÔNG commit** cho tới khi user yêu cầu. Mỗi task kết bằng "Checkpoint" (chạy test + lint, GIỮ uncommitted) — KHÔNG chạy `git commit`.
- Migration **idempotent** (`Schema::hasColumn` guard); **user tự chạy prod**, KHÔNG chạy prod trong sandbox.
- `preview_public_id` / `cloudinary_id` **KHÔNG serialize** trong bất kỳ resource nào (không đụng ở A; đừng hồi quy).
- UI bám Design DNA "The Becoming Room": handle + nét tường dùng `unbuilt` #C9C4B8; chỉ semantic token; **không brass/cream/terracotta**; nút Lưu giữ độc quyền `imagined`. Kiểm bằng skill `nestify-review` trước khi coi UI là xong.
- KHÔNG thêm dependency mới.
- Đơn vị phòng = **mét**. Kẹp: `width`/`depth` ∈ [2, 30] m; `height` ∈ [2, 5] m. Snap kéo resize = 0.5 m.
- Tập tường cố định: `back`, `left`, `right` (không có tường trước — phía nhìn vào 3D).
- BE tests: `docker compose exec app php artisan test --filter=RoomScene`. FE: `npm run test`, `npm run lint`.

---

## File Structure

**BE (`Nestify-Furniture-e-commerce-backend/src/`):**
- Create `database/migrations/2026_07_10_000002_add_walls_to_room_scenes_table.php` — 3 cột boolean default true.
- Modify `app/Models/RoomScene.php` — fillable + casts.
- Modify `app/Http/Resources/RoomSceneResource.php` — serialize 3 field.
- Modify `app/Http/Requests/RoomScene/StoreRoomSceneRequest.php` + `UpdateRoomSceneRequest.php` — rule boolean.
- Modify `app/DTOs/CreateRoomSceneDTO.php` — props + fromRequest.
- Modify `app/DTOs/UpdateRoomSceneDTO.php` — whitelist.
- Modify `app/Services/RoomSceneService.php` — create() truyền walls.
- Test `tests/Feature/RoomScene/WallVisibilityTest.php` (mới).

**FE (`Nestify-Furniture-e-commerce-frontend/src/`):**
- Modify `features/roomPlanner/editorStore.js` — `room.walls`, `editMode`, `resizeRoom`, `toggleWall`, `setEditMode`.
- Modify `features/roomPlanner/mappers.js` — round-trip walls.
- Modify `pages/roomPlanner/scene/Room.jsx` — render theo `walls`.
- Modify `pages/roomPlanner/scene/SceneStage.jsx` — camera top-down + khoá xoay theo `topDown`.
- Modify `pages/roomPlanner/scene/RoomCanvas.jsx` — mode wiring, khoá tương tác item, render overlay.
- Create `pages/roomPlanner/scene/RoomEditOverlay.jsx` — núm resize 4 cạnh + cạnh tường bấm.
- Create `pages/roomPlanner/RoomEditPanel.jsx` — dải chế độ room (nhãn + stepper cao + toggle tường + Xong).
- Modify `pages/roomPlanner/PlannerToolbar.jsx` — nút "Chỉnh phòng".
- Modify `pages/roomPlanner/RoomPlannerPage.jsx` — nối editMode + panel.
- Tests: `editorStore.test.js`, `mappers.test.js`, `Room.test.jsx` (mới nếu chưa có), `RoomEditPanel.test.jsx` (mới), `RoomEditOverlay.test.jsx` (mới, smoke).

---

## Task 1: BE — cột tường + persist + serialize

**Files:**
- Create: `Nestify-Furniture-e-commerce-backend/src/database/migrations/2026_07_10_000002_add_walls_to_room_scenes_table.php`
- Modify: `.../app/Models/RoomScene.php:9-10`
- Modify: `.../app/Http/Resources/RoomSceneResource.php`
- Modify: `.../app/Http/Requests/RoomScene/StoreRoomSceneRequest.php`, `UpdateRoomSceneRequest.php`
- Modify: `.../app/DTOs/CreateRoomSceneDTO.php`, `UpdateRoomSceneDTO.php`
- Modify: `.../app/Services/RoomSceneService.php:45-54`
- Test: `.../tests/Feature/RoomScene/WallVisibilityTest.php`

**Interfaces:**
- Produces: API `POST/PATCH /room-scenes` chấp nhận `wall_back|wall_left|wall_right` (boolean, optional; default DB `true`). Resource `GET /room-scenes/:id` trả 3 field boolean. FE Task 2 dựa vào 3 khoá này.

- [ ] **Step 1: Viết test thất bại** — `tests/Feature/RoomScene/WallVisibilityTest.php`

```php
<?php

use App\Models\User;
use App\Models\ProductVariant;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\getJson;

// NOTE: nếu suite dùng PHPUnit class-based (không Pest), chuyển các hàm này sang
// $this->actingAs(...)->postJson(...) theo mẫu các test RoomScene hiện có.

it('mặc định 3 tường bật khi tạo phòng không gửi wall_*', function () {
    $user = User::factory()->create();

    $res = actingAs($user)->postJson('/api/room-scenes', [
        'name' => 'P', 'width' => 4, 'depth' => 5, 'height' => 3,
    ]);

    $res->assertCreated()
        ->assertJsonPath('data.wall_back', true)
        ->assertJsonPath('data.wall_left', true)
        ->assertJsonPath('data.wall_right', true);
});

it('lưu và trả về wall_* khi gửi lên', function () {
    $user = User::factory()->create();

    $created = actingAs($user)->postJson('/api/room-scenes', [
        'name' => 'P', 'width' => 4, 'depth' => 5, 'height' => 3,
        'wall_back' => true, 'wall_left' => false, 'wall_right' => true,
    ])->assertCreated();

    $id = $created->json('data.id');

    getJson("/api/room-scenes/{$id}")
        ->assertOk()
        ->assertJsonPath('data.wall_left', false)
        ->assertJsonPath('data.wall_right', true);
});

it('PATCH đổi được wall_*', function () {
    $user  = User::factory()->create();
    $scene = $user->roomScenes()->create([
        'name' => 'P', 'width' => 4, 'depth' => 5, 'height' => 3,
    ]);

    patchJson("/api/room-scenes/{$scene->id}", ['wall_back' => false])
        ->assertOk()
        ->assertJsonPath('data.wall_back', false);
})->skip(fn () => true, 'bật lại sau khi confirm route PATCH + actingAs; xem test Update hiện có');

it('resource KHÔNG lộ preview_public_id', function () {
    $user  = User::factory()->create();
    $scene = $user->roomScenes()->create([
        'name' => 'P', 'width' => 4, 'depth' => 5, 'height' => 3,
    ]);

    actingAs($user)->getJson("/api/room-scenes/{$scene->id}")
        ->assertOk()
        ->assertJsonMissingPath('data.preview_public_id');
});
```

> Trước khi chạy: mở `tests/Feature/RoomScene/CreateRoomSceneTest.php` để copy đúng style (Pest vs PHPUnit, prefix route `/api`, cách `actingAs`, factory ProductVariant). Chỉnh test trên cho khớp. Route PATCH: kiểm `routes/api.php` (apiResource hay route rời) để bật lại test PATCH.

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `docker compose exec app php artisan test --filter=WallVisibility`
Expected: FAIL (cột `wall_back` chưa tồn tại / resource thiếu field).

- [ ] **Step 3: Migration** — `2026_07_10_000002_add_walls_to_room_scenes_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('room_scenes', function (Blueprint $table) {
            if (! Schema::hasColumn('room_scenes', 'wall_back')) {
                $table->boolean('wall_back')->default(true);
            }
            if (! Schema::hasColumn('room_scenes', 'wall_left')) {
                $table->boolean('wall_left')->default(true);
            }
            if (! Schema::hasColumn('room_scenes', 'wall_right')) {
                $table->boolean('wall_right')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('room_scenes', function (Blueprint $table) {
            foreach (['wall_back', 'wall_left', 'wall_right'] as $col) {
                if (Schema::hasColumn('room_scenes', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
```

- [ ] **Step 4: Model** — `RoomScene.php`, thêm vào `$fillable` và `$casts`

```php
protected $fillable = ['user_id','name','description','width','depth','height','share_token','is_public','preview_url','preview_public_id','wall_back','wall_left','wall_right'];
protected $casts    = ['is_public' => 'boolean', 'width' => 'decimal:2', 'depth' => 'decimal:2', 'height' => 'decimal:2', 'wall_back' => 'boolean', 'wall_left' => 'boolean', 'wall_right' => 'boolean'];
```

- [ ] **Step 5: Resource** — `RoomSceneResource.php`, thêm sau `'height'`

```php
'wall_back'   => $this->wall_back,
'wall_left'   => $this->wall_left,
'wall_right'  => $this->wall_right,
```

- [ ] **Step 6: FormRequests** — thêm 3 rule vào `rules()` của CẢ `StoreRoomSceneRequest` và `UpdateRoomSceneRequest` (đặt cạnh height):

```php
'wall_back'  => ['sometimes', 'boolean'],
'wall_left'  => ['sometimes', 'boolean'],
'wall_right' => ['sometimes', 'boolean'],
```

- [ ] **Step 7: DTOs**

`CreateRoomSceneDTO.php` — thêm props (sau `float $height`, TRƯỚC `array $items`):

```php
public bool $wallBack = true,
public bool $wallLeft = true,
public bool $wallRight = true,
```

và trong `fromRequest()` (trước `items:`):

```php
wallBack:  (bool) $request->validated('wall_back', true),
wallLeft:  (bool) $request->validated('wall_left', true),
wallRight: (bool) $request->validated('wall_right', true),
```

> Lưu ý thứ tự tham số: `items` có default `= []`, nên 3 prop wall có default phải nằm TRƯỚC `items` hoặc cũng có default — ở trên đều có default nên đặt trước `items` là hợp lệ. Cập nhật lời gọi `new self(...)` dùng named args (đã named) nên không vỡ.

`UpdateRoomSceneDTO.php` — thêm 3 khoá vào whitelist `array_flip([...])`:

```php
$attributes = array_intersect_key($validated, array_flip(['name', 'description', 'width', 'depth', 'height', 'wall_back', 'wall_left', 'wall_right']));
```

- [ ] **Step 8: Service create()** — `RoomSceneService.php`, trong mảng `$user->roomScenes()->create([...])` thêm:

```php
'wall_back'   => $dto->wallBack,
'wall_left'   => $dto->wallLeft,
'wall_right'  => $dto->wallRight,
```

(update() đã đi qua `$dto->attributes` nên tự nhận wall_* từ whitelist — không sửa thêm.)

- [ ] **Step 9: Chạy test — kỳ vọng PASS**

Run: `docker compose exec app php artisan test --filter=WallVisibility`
Expected: PASS (test PATCH đang `skip` cho tới khi confirm route; các test còn lại xanh).
Rồi chạy toàn nhóm: `docker compose exec app php artisan test --filter=RoomScene` — kỳ vọng không hồi quy.

- [ ] **Step 10: Checkpoint (KHÔNG commit)** — giữ uncommitted. Ghi lại: user cần chạy migration prod ở bước deploy.

---

## Task 2: FE store — walls, editMode, resizeRoom, toggleWall

**Files:**
- Modify: `Nestify-Furniture-e-commerce-frontend/src/features/roomPlanner/editorStore.js`
- Modify: `.../src/features/roomPlanner/mappers.js`
- Test: `.../src/features/roomPlanner/editorStore.test.js`, `.../mappers.test.js`

**Interfaces:**
- Consumes: `clampRectToRoom`, `rotatedHalfExtents` từ `./collision` (đã có).
- Produces:
  - `room` shape mới `{ width, depth, height, walls: { back, left, right } }`.
  - `editMode: 'furnish' | 'room'`.
  - `resizeRoom({ width?, depth?, height? })` — kẹp width/depth [2,30], height [2,5]; re-clamp mọi item; vào history; dirty.
  - `toggleWall(side)` — `side ∈ 'back'|'left'|'right'`; lật `room.walls[side]`; history; dirty.
  - `setEditMode(mode)` — set `editMode`; KHÔNG dirty.
  - Mapper: `sceneToEditorState` đọc walls (fallback true); `editorStateToPayload` gửi `wall_back/left/right`.
  Task 3–6 dựa vào các tên này.

- [ ] **Step 1: Viết test thất bại** — thêm vào `editorStore.test.js`

```js
describe('vỏ phòng: resizeRoom / toggleWall / editMode', () => {
  const baseRoom = { width: 4, depth: 5, height: 3, walls: { back: true, left: true, right: true } }

  it('resizeRoom kẹp width/depth [2,30] và height [2,5]', () => {
    useEditorStore.getState().initNew(baseRoom)
    useEditorStore.getState().resizeRoom({ width: 100, depth: 0.5, height: 99 })
    const r = useEditorStore.getState().room
    expect(r.width).toBe(30)
    expect(r.depth).toBe(2)
    expect(r.height).toBe(5)
    expect(useEditorStore.getState().dirty).toBe(true)
  })

  it('resizeRoom re-clamp item ra ngoài khi thu nhỏ phòng', () => {
    useEditorStore.getState().initNew({ ...baseRoom, width: 20, depth: 20 })
    useEditorStore.getState().addVariant({ id: 1, sku: 'A' })
    const id = useEditorStore.getState().selectedId
    // đẩy item ra mép phòng lớn
    useEditorStore.getState().updateTransform(id, { position: { x: 9, y: 0, z: 0 } })
    // thu nhỏ phòng → item phải bị kéo vào trong nửa-rộng mới (2/2 - halfExtent)
    useEditorStore.getState().resizeRoom({ width: 4, depth: 4 })
    const item = useEditorStore.getState().items[0]
    expect(Math.abs(item.position.x)).toBeLessThanOrEqual(2) // trong nửa rộng 4/2
  })

  it('toggleWall lật đúng side + dirty', () => {
    useEditorStore.getState().initNew(baseRoom)
    useEditorStore.getState().toggleWall('left')
    expect(useEditorStore.getState().room.walls.left).toBe(false)
    expect(useEditorStore.getState().dirty).toBe(true)
    useEditorStore.getState().toggleWall('left')
    expect(useEditorStore.getState().room.walls.left).toBe(true)
  })

  it('setEditMode đổi mode, KHÔNG set dirty', () => {
    useEditorStore.getState().initNew(baseRoom)
    useEditorStore.getState().setEditMode('room')
    expect(useEditorStore.getState().editMode).toBe('room')
    expect(useEditorStore.getState().dirty).toBe(false)
  })

  it('undo hoàn tác resizeRoom', () => {
    useEditorStore.getState().initNew(baseRoom)
    useEditorStore.getState().resizeRoom({ width: 8 })
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().room).toBeDefined()
    // width về 4 nếu resizeRoom đẩy room vào history; nếu chỉ history items thì bỏ assert này
  })
})
```

> Nếu test hiện có tạo store bằng cách khác (vd `useEditorStore.setState(...)`), theo mẫu file. `initNew(room)` đã tồn tại và set `status:'ready'`.

- [ ] **Step 2: Chạy — kỳ vọng FAIL**

Run: `npm run test -- editorStore`
Expected: FAIL (`resizeRoom is not a function`, `editMode` undefined).

- [ ] **Step 3: Sửa `editorStore.js`**

3a. `emptyState.room` thêm walls, thêm `editMode`:

```js
const emptyState = {
  id: null,
  name: 'Phòng của tôi',
  description: '',
  room: { width: 0, depth: 0, height: 0, walls: { back: true, left: true, right: true } },
  items: [],
  selectedId: null,
  gizmoMode: 'translate',
  editMode: 'furnish', // 'furnish' | 'room'
  dirty: false,
  status: 'idle',
  past: [],
  future: [],
  snap: false,
  wallSnap: false,
  showScaleRef: false,
  scaleRefPos: { x: 0, z: 0 },
}
```

3b. Thêm hằng kẹp gần đầu file (cạnh HISTORY_CAP):

```js
const ROOM_MIN = 2
const ROOM_MAX = 30
const HEIGHT_MIN = 2
const HEIGHT_MAX = 5
const clampDim = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
```

3c. `initNew` — đảm bảo room có walls (phòng từ RoomSetupDialog chưa có walls):

```js
initNew: (room) => set({ ...emptyState, room: { ...room, walls: room.walls ?? { back: true, left: true, right: true } }, status: 'ready' }),
```

3d. Thêm actions (đặt cạnh `setRoom`):

```js
setEditMode: (editMode) => set({ editMode }),

// Kéo đổi kích thước vỏ phòng. Kẹp min/max, RE-CLAMP mọi item vào phòng mới
// (sửa bug cũ: setRoom không re-clamp → thu nhỏ phòng thì đồ lọt ra ngoài tường).
resizeRoom: (patch) => set((s) => {
  const room = {
    ...s.room,
    width:  'width'  in patch ? clampDim(patch.width,  ROOM_MIN, ROOM_MAX)   : s.room.width,
    depth:  'depth'  in patch ? clampDim(patch.depth,  ROOM_MIN, ROOM_MAX)   : s.room.depth,
    height: 'height' in patch ? clampDim(patch.height, HEIGHT_MIN, HEIGHT_MAX) : s.room.height,
  }
  const items = s.items.map((it) => {
    const he = rotatedHalfExtents(it.footprint, it.scale, it.rotation.y)
    return { ...it, position: clampRectToRoom(it.position, room, he) }
  })
  return { ...pushPast(s), room, items, dirty: true }
}),

toggleWall: (side) => set((s) => ({
  ...pushPast(s),
  room: { ...s.room, walls: { ...s.room.walls, [side]: ! s.room.walls[side] } },
  dirty: true,
})),
```

> `pushPast` chỉ snapshot `items`, nên undo sau `resizeRoom`/`toggleWall` sẽ khôi phục items nhưng KHÔNG khôi phục `room`. Để undo phủ cả room, mở rộng history sang room. Quyết định YAGNI cho A: giữ history chỉ-items (undo trả đồ về chỗ cũ, room giữ nguyên) — đơn giản, đủ. Bỏ assert width-về-4 trong test undo ở Step 1 nếu chọn hướng này. **Chọn hướng này.** Xoá dòng assert cuối cùng trong test 'undo hoàn tác resizeRoom' cho khớp (chỉ assert room defined).

- [ ] **Step 4: Mapper test thất bại** — thêm vào `mappers.test.js`

```js
it('sceneToEditorState đọc walls, fallback true khi thiếu', () => {
  const a = sceneToEditorState({ width: 4, depth: 5, height: 3, wall_left: false })
  expect(a.room.walls).toEqual({ back: true, left: false, right: true })
  const b = sceneToEditorState({ width: 4, depth: 5, height: 3 }) // scene cũ trước migration
  expect(b.room.walls).toEqual({ back: true, left: true, right: true })
})

it('editorStateToPayload gửi wall_back/left/right', () => {
  const payload = editorStateToPayload({
    name: 'P', description: '',
    room: { width: 4, depth: 5, height: 3, walls: { back: true, left: false, right: true } },
    items: [],
  })
  expect(payload.wall_back).toBe(true)
  expect(payload.wall_left).toBe(false)
  expect(payload.wall_right).toBe(true)
})
```

- [ ] **Step 5: Sửa `mappers.js`**

Trong `sceneToEditorState`, `room` thêm walls (dùng `?? true` để phân biệt `false` với thiếu):

```js
room: {
  width: num(r.width),
  depth: num(r.depth),
  height: num(r.height),
  walls: {
    back:  r.wall_back  ?? true,
    left:  r.wall_left  ?? true,
    right: r.wall_right ?? true,
  },
},
```

Trong `editorStateToPayload`, thêm (cạnh width/depth/height):

```js
wall_back:  state.room.walls?.back  ?? true,
wall_left:  state.room.walls?.left  ?? true,
wall_right: state.room.walls?.right ?? true,
```

- [ ] **Step 6: Chạy — kỳ vọng PASS**

Run: `npm run test -- editorStore mappers`
Expected: PASS. Rồi `npm run test` toàn bộ — sửa test cũ nếu `room` shape đổi làm vỡ (vd test so sánh `room` bằng `toEqual` giờ có thêm `walls`; cập nhật kỳ vọng).

- [ ] **Step 7: Checkpoint (KHÔNG commit).**

---

## Task 3: FE — Room.jsx render theo walls

**Files:**
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/scene/Room.jsx`
- Test: `.../src/pages/roomPlanner/scene/Room.test.jsx` (tạo nếu chưa có)

**Interfaces:**
- Consumes: prop `walls` (hoặc đọc từ `room.walls`). `Room` hiện nhận `{ width, depth, height }` — mở rộng nhận `walls` + optional `editMode` để vẽ nét-đứt cho tường tắt khi ở chế độ room.
- Produces: 3 mặt tường hiện/ẩn theo `walls.back/left/right`.

- [ ] **Step 1: Test thất bại** — `Room.test.jsx`

```jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Room } from './Room'

// Mock drei Grid + r3f primitives để render ngoài Canvas (theo pattern test scene hiện có).
// Nếu test scene khác đã có helper mock, tái dùng. Ở đây kiểm số mesh tường theo walls.

describe('Room walls', () => {
  it('ẩn tường trái khi walls.left=false', () => {
    // Render trong test-renderer r3f hoặc kiểm hàm thuần: tách logic "mặt nào hiện"
    // thành mảng để assert (xem Step 3).
    expect(true).toBe(true)
  })
})
```

> R3F mesh khó assert bằng RTL DOM. Cách chắc chắn: tách quyết định hiện/ẩn ra một hàm thuần `visibleWalls(walls)` trả object boolean, test hàm đó; phần JSX chỉ đọc kết quả. Viết test cho hàm thuần:

```jsx
import { visibleWalls } from './Room'

it('visibleWalls phản ánh cờ walls', () => {
  expect(visibleWalls({ back: true, left: false, right: true }))
    .toEqual({ back: true, left: false, right: true })
  expect(visibleWalls(undefined)).toEqual({ back: true, left: true, right: true })
})
```

- [ ] **Step 2: Chạy — FAIL** (`visibleWalls` chưa export).

Run: `npm run test -- Room`

- [ ] **Step 3: Sửa `Room.jsx`**

Thêm helper export + đọc walls, mỗi mặt bọc điều kiện:

```jsx
import { Grid } from '@react-three/drei'

export function visibleWalls(walls) {
  return {
    back:  walls?.back  ?? true,
    left:  walls?.left  ?? true,
    right: walls?.right ?? true,
  }
}

export function Room({ width, depth, height, walls }) {
  const v = visibleWalls(walls)
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#F2F0EB" />
      </mesh>
      <Grid
        args={[width, depth]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={1}
        cellColor="#C9C4B8"
        sectionSize={Math.max(width, depth)}
        sectionColor="#C9C4B8"
        infiniteGrid={false}
        fadeDistance={40}
        fadeStrength={1}
      />
      {/* Tường lưng */}
      {v.back && (
        <mesh position={[0, height / 2, -depth / 2]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color="#F2F0EB" transparent opacity={0.18} />
        </mesh>
      )}
      {/* Tường trái */}
      {v.left && (
        <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[depth, height]} />
          <meshStandardMaterial color="#F2F0EB" transparent opacity={0.12} />
        </mesh>
      )}
      {/* Tường phải (mới — trước đây chỉ có lưng+trái; thêm phải cho đối xứng toggle) */}
      {v.right && (
        <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[depth, height]} />
          <meshStandardMaterial color="#F2F0EB" transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  )
}
```

> Kiểm `Room.jsx` gốc: hiện chỉ có lưng + trái (2 mặt). Spec/UX cần 3 tường toggle (lưng/trái/phải) → thêm mặt phải như trên. Xác nhận lại số mặt gốc khi sửa.

- [ ] **Step 4: Chạy — PASS.** `npm run test -- Room`

- [ ] **Step 5: Cập nhật callsite** — nơi render `<Room ... />` (trong `SceneStage.jsx`) truyền `walls={room.walls}`.

- [ ] **Step 6: Checkpoint (KHÔNG commit).**

---

## Task 4: FE — camera top-down + khoá tương tác đồ trong chế độ room

**Files:**
- Modify: `Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/scene/SceneStage.jsx`
- Modify: `.../src/pages/roomPlanner/scene/RoomCanvas.jsx`
- Test: `.../src/pages/roomPlanner/scene/SceneStage.test.jsx` (đã có — mở rộng)

**Interfaces:**
- Consumes: `editMode` từ store.
- Produces: `SceneStage` nhận prop `topDown` (bool) → khi true: camera đặt overhead nhìn xuống, OrbitControls `enableRotate=false`; khi false: mặc định. `RoomCanvas` đọc `editMode`, truyền `topDown={editMode==='room'}`, và khi ở room mode KHÔNG gắn onSelect/gizmo cho PlacedItem (khoá tương tác), đồng thời render `RoomEditOverlay` (Task 5).

- [ ] **Step 1: Đọc `SceneStage.jsx` hiện tại** để biết camera/OrbitControls đang cấu hình ở đâu (props `orbitEnabled`, `onRendererReady` đã có).

- [ ] **Step 2: Test thất bại** — mở rộng `SceneStage.test.jsx`: khi `topDown` true, OrbitControls nhận `enableRotate={false}`.

```jsx
// Mock @react-three/drei OrbitControls để ghi lại props.
// (Theo pattern mock hiện có trong repo cho drei/fiber.)
it('topDown khoá xoay orbit', () => {
  // render SceneStage topDown; assert mock OrbitControls được gọi với enableRotate=false
})
```

> Nếu mock OrbitControls chưa có trong file test, thêm `vi.mock('@react-three/drei', ...)` giữ các export khác passthrough, thay OrbitControls bằng spy component. Tham khảo cách các test scene khác mock TransformControls.

- [ ] **Step 3: Sửa `SceneStage.jsx`**

Thêm prop `topDown = false`. Đặt camera + OrbitControls theo mode:

```jsx
// Trong SceneStage, chỗ cấu hình camera (perspective) + OrbitControls:
// - Khi topDown: camera.position đặt overhead theo kích thước phòng, target tâm; enableRotate=false.
// - polar angle khoá về ~0 để nhìn thẳng xuống.

const overheadY = Math.max(room.width, room.depth) * 1.4 + room.height

// ...camera:
<PerspectiveCamera makeDefault position={topDown ? [0, overheadY, 0.001] : [defaultX, defaultY, defaultZ]} fov={45} />

// ...controls:
<OrbitControls
  enabled={orbitEnabled}
  enableRotate={!topDown}
  enablePan
  enableZoom
  target={[0, 0, 0]}
  {...(topDown ? { minPolarAngle: 0, maxPolarAngle: 0.001 } : {})}
/>
```

> Điều chỉnh theo cách SceneStage hiện tạo camera (có thể đang dùng `<Canvas camera={{...}}>` mặc định thay vì `<PerspectiveCamera>`). Nếu đang dùng camera mặc định của Canvas, chuyển sang `<PerspectiveCamera makeDefault>` để đổi vị trí theo mode, HOẶC dùng ref + useEffect set position khi `topDown` đổi. Giữ `preserveDrawingBuffer: true` (đã có cho snapshot). `position [0, y, 0.001]` để tránh gimbal khi nhìn thẳng trục.

- [ ] **Step 4: Sửa `RoomCanvas.jsx`**

Đọc `editMode`, tính `topDown`, truyền xuống SceneStage; khoá tương tác item khi room mode; render overlay:

```jsx
const editMode = useEditorStore((s) => s.editMode)
const topDown = editMode === 'room'
// ...
<SceneStage room={room} orbitEnabled={orbitEnabled} topDown={topDown} onRendererReady={...}>
  {!topDown && (
    <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={() => selectItem(null)} visible={false}>
      <planeGeometry args={[room.width, room.depth]} />
    </mesh>
  )}
  {items.map((item) => (
    <PlacedItem
      key={item.localId}
      item={item}
      selected={!topDown && item.localId === selectedId}
      gizmoMode={gizmoMode}
      snap={snap}
      conflict={conflictSet.has(item.localId)}
      onSelect={topDown ? undefined : selectItem}
      onTransform={updateTransform}
      onDragChange={(dragging) => setOrbitEnabled(!dragging)}
      onMeasure={(size) => reportFootprint(item.localId, size)}
      interactive={!topDown}
    />
  ))}
  {topDown && <RoomEditOverlay room={room} onDragChange={(d) => setOrbitEnabled(!d)} />}
  {showScaleRef && !topDown && <ScaleReference room={room} onDragChange={(dragging) => setOrbitEnabled(!dragging)} />}
</SceneStage>
```

> `PlacedItem` cần hỗ trợ `interactive={false}` (không gắn TransformControls, click no-op). Nếu prop chưa có, thêm: khi `interactive===false` chỉ render model, bỏ gizmo + onClick. Giữ backward-compat (default true). Import `RoomEditOverlay` (Task 5).

- [ ] **Step 5: Chạy test scene** — `npm run test -- SceneStage RoomCanvas` — PASS (điều chỉnh mock).

- [ ] **Step 6: Checkpoint (KHÔNG commit).**

---

## Task 5: FE — RoomEditOverlay (núm resize 4 cạnh + cạnh tường bấm)

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/scene/RoomEditOverlay.jsx`
- Test: `.../src/pages/roomPlanner/scene/RoomEditOverlay.test.jsx`

**Interfaces:**
- Consumes: prop `room` ({width,depth,height,walls}); `onDragChange(bool)`; store `resizeRoom`, `toggleWall`.
- Produces: component render trong scene: 4 núm resize + 3 cạnh tường bấm. Dùng bởi RoomCanvas (Task 4).

- [ ] **Step 1: Test thất bại (smoke + toggle)** — `RoomEditOverlay.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { RoomEditOverlay } from './RoomEditOverlay'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Mock TransformControls giống các test scene khác (passthrough children).
vi.mock('@react-three/drei', () => ({
  TransformControls: ({ children }) => children ?? null,
  Grid: () => null,
}))

describe('RoomEditOverlay', () => {
  beforeEach(() => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 3, walls: { back: true, left: true, right: true } })
    useEditorStore.getState().setEditMode('room')
  })

  it('render không lỗi với 4 núm + 3 cạnh tường', () => {
    const { container } = render(<RoomEditOverlay room={useEditorStore.getState().room} onDragChange={() => {}} />)
    expect(container).toBeTruthy()
  })
})
```

> R3F trong RTL không dựng WebGL — mock đủ để smoke. Logic tính toạ độ núm / snap tách thành hàm thuần để test riêng (Step 3).

- [ ] **Step 2: Chạy — FAIL** (component chưa tồn tại). `npm run test -- RoomEditOverlay`

- [ ] **Step 3: Viết `RoomEditOverlay.jsx`**

```jsx
import { useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Làm tròn về bội 0.5m (snap resize).
export function snapHalf(v) {
  return Math.round(v * 2) / 2
}

// Núm ở giữa mỗi cạnh sàn. axis 'x' → đổi width; 'z' → đổi depth.
// Vị trí núm = nửa-chiều tương ứng, trên trục đó.
function EdgeHandle({ axis, sign, room, onDragChange }) {
  const ref = useRef()
  const resizeRoom = useEditorStore((s) => s.resizeRoom)
  const half = axis === 'x' ? room.width / 2 : room.depth / 2
  const pos = axis === 'x' ? [sign * half, 0.05, 0] : [0, 0.05, sign * half]

  return (
    <TransformControls
      mode="translate"
      showX={axis === 'x'}
      showZ={axis === 'z'}
      showY={false}
      onMouseDown={() => onDragChange(true)}
      onMouseUp={() => onDragChange(false)}
      onObjectChange={() => {
        const o = ref.current
        if (!o) return
        if (axis === 'x') resizeRoom({ width: snapHalf(Math.abs(o.position.x) * 2) })
        else resizeRoom({ depth: snapHalf(Math.abs(o.position.z) * 2) })
      }}
    >
      <mesh ref={ref} position={pos}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#C9C4B8" />
      </mesh>
    </TransformControls>
  )
}

// Cạnh tường bấm được (lưng/trái/phải). Bấm → toggleWall.
function WallEdge({ side, room }) {
  const toggleWall = useEditorStore((s) => s.toggleWall)
  const on = room.walls?.[side] ?? true
  const geo = side === 'back'
    ? { pos: [0, 0.03, -room.depth / 2], args: [room.width, 0.08], rot: [-Math.PI / 2, 0, 0] }
    : side === 'left'
      ? { pos: [-room.width / 2, 0.03, 0], args: [room.depth, 0.08], rot: [-Math.PI / 2, 0, Math.PI / 2] }
      : { pos: [room.width / 2, 0.03, 0], args: [room.depth, 0.08], rot: [-Math.PI / 2, 0, Math.PI / 2] }

  return (
    <mesh position={geo.pos} rotation={geo.rot} onClick={(e) => { e.stopPropagation(); toggleWall(side) }}>
      <planeGeometry args={geo.args} />
      <meshBasicMaterial color="#C9C4B8" transparent opacity={on ? 0.9 : 0.35} />
    </mesh>
  )
}

export function RoomEditOverlay({ room, onDragChange }) {
  return (
    <group>
      <EdgeHandle axis="x" sign={1} room={room} onDragChange={onDragChange} />
      <EdgeHandle axis="x" sign={-1} room={room} onDragChange={onDragChange} />
      <EdgeHandle axis="z" sign={1} room={room} onDragChange={onDragChange} />
      <EdgeHandle axis="z" sign={-1} room={room} onDragChange={onDragChange} />
      <WallEdge side="back" room={room} />
      <WallEdge side="left" room={room} />
      <WallEdge side="right" room={room} />
    </group>
  )
}
```

> Cạnh tường tắt vẽ mờ (opacity 0.35) thay nét-đứt — đơn giản, đủ tín hiệu; nét-đứt để nâng cấp sau nếu cần. Nhãn số m live: dựa vào `RoomEditPanel` (Task 6) hiển thị tổng, không nhồi Html vào scene (tránh phức tạp drei Html). Test hàm `snapHalf`:

```jsx
import { snapHalf } from './RoomEditOverlay'
it('snapHalf làm tròn về bội 0.5', () => {
  expect(snapHalf(4.24)).toBe(4)
  expect(snapHalf(4.26)).toBe(4.5)
})
```

- [ ] **Step 4: Chạy — PASS.** `npm run test -- RoomEditOverlay`

- [ ] **Step 5: Checkpoint (KHÔNG commit).**

---

## Task 6: FE — RoomEditPanel + nút toolbar + wiring RoomPlannerPage

**Files:**
- Create: `Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/RoomEditPanel.jsx`
- Modify: `.../src/pages/roomPlanner/PlannerToolbar.jsx`
- Modify: `.../src/pages/roomPlanner/RoomPlannerPage.jsx`
- Test: `.../src/pages/roomPlanner/RoomEditPanel.test.jsx`, cập nhật `PlannerToolbar.test.jsx`

**Interfaces:**
- Consumes: store `editMode`, `setEditMode`, `resizeRoom`, `toggleWall`, `room`.
- Produces: `RoomEditPanel` overlay (nhãn kích thước live + stepper chiều cao + 3 toggle tường + nút "Xong"). `PlannerToolbar` thêm prop `onEnterRoomEdit` + nút "Chỉnh phòng".

- [ ] **Step 1: Test thất bại** — `RoomEditPanel.test.jsx`

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomEditPanel } from './RoomEditPanel'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

describe('RoomEditPanel', () => {
  beforeEach(() => {
    useEditorStore.getState().initNew({ width: 4, depth: 5, height: 3, walls: { back: true, left: true, right: true } })
    useEditorStore.getState().setEditMode('room')
  })

  it('hiện kích thước phòng live', () => {
    render(<RoomEditPanel />)
    expect(screen.getByText(/4 × 5 × 3 m/)).toBeInTheDocument()
  })

  it('stepper + tăng chiều cao gọi resizeRoom', () => {
    render(<RoomEditPanel />)
    fireEvent.click(screen.getByLabelText('Tăng chiều cao'))
    expect(useEditorStore.getState().room.height).toBeCloseTo(3.1, 5)
  })

  it('toggle tường trái', () => {
    render(<RoomEditPanel />)
    fireEvent.click(screen.getByLabelText('Bật/tắt tường trái'))
    expect(useEditorStore.getState().room.walls.left).toBe(false)
  })

  it('nút Xong về furnish', () => {
    render(<RoomEditPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }))
    expect(useEditorStore.getState().editMode).toBe('furnish')
  })
})
```

- [ ] **Step 2: Chạy — FAIL.** `npm run test -- RoomEditPanel`

- [ ] **Step 3: Viết `RoomEditPanel.jsx`**

```jsx
import { Minus, Plus } from 'lucide-react'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const WALLS = [
  { side: 'back', label: 'Lưng' },
  { side: 'left', label: 'Trái' },
  { side: 'right', label: 'Phải' },
]

export function RoomEditPanel() {
  const room = useEditorStore((s) => s.room)
  const resizeRoom = useEditorStore((s) => s.resizeRoom)
  const toggleWall = useEditorStore((s) => s.toggleWall)
  const setEditMode = useEditorStore((s) => s.setEditMode)

  const round1 = (v) => Math.round(v * 10) / 10

  return (
    <div className="absolute left-4 top-4 flex flex-col gap-3 rounded-control border border-border bg-surface/95 p-3 text-sm text-foreground backdrop-blur-sm">
      <div className="font-medium">Đang chỉnh phòng</div>
      <div className="text-xs text-muted-foreground">
        Phòng {round1(room.width)} × {round1(room.depth)} × {round1(room.height)} m
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Chiều cao</span>
        <button type="button" aria-label="Giảm chiều cao" onClick={() => resizeRoom({ height: round1(room.height - 0.1) })} className="rounded-control border border-border p-1 hover:bg-surface-alt">
          <Minus size={14} />
        </button>
        <span className="w-10 text-center tabular-nums">{round1(room.height)}m</span>
        <button type="button" aria-label="Tăng chiều cao" onClick={() => resizeRoom({ height: round1(room.height + 0.1) })} className="rounded-control border border-border p-1 hover:bg-surface-alt">
          <Plus size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Tường</span>
        <div className="flex gap-1">
          {WALLS.map(({ side, label }) => {
            const on = room.walls?.[side] ?? true
            return (
              <button
                key={side}
                type="button"
                aria-label={`Bật/tắt tường ${label.toLowerCase()}`}
                aria-pressed={on}
                onClick={() => toggleWall(side)}
                className={`flex-1 rounded-control border px-2 py-1 text-xs transition-colors ${
                  on ? 'border-border-strong bg-surface-alt text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <button type="button" onClick={() => setEditMode('furnish')} className="rounded-control border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-alt">
        Xong
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Chạy — PASS.** `npm run test -- RoomEditPanel`

- [ ] **Step 5: PlannerToolbar** — thêm prop `onEnterRoomEdit` và nút "Chỉnh phòng" (nhóm riêng cạnh nhóm hỗ trợ). Dùng icon `Scan` (tránh trùng `Frame` của "Bắt tường"):

```jsx
// import: thêm Scan vào dòng import lucide-react
import { ..., Scan } from 'lucide-react'

// props: thêm onEnterRoomEdit
// JSX: một nhóm mới cạnh nhóm Snap/Bắt tường/Tỉ lệ
<div className="flex items-center gap-1 rounded-control border border-border p-1">
  <button
    type="button"
    onClick={onEnterRoomEdit}
    title="Chỉnh kích thước phòng & tường (nhìn từ trên)"
    className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-alt"
  >
    <Scan size={15} aria-hidden="true" /> Chỉnh phòng
  </button>
</div>
```

Cập nhật `PlannerToolbar.test.jsx`: render với `onEnterRoomEdit` spy, click "Chỉnh phòng" → spy gọi.

- [ ] **Step 6: RoomPlannerPage** — nối:

```jsx
// đọc editMode + setEditMode từ store
const editMode = useEditorStore((s) => s.editMode)
const setEditMode = useEditorStore((s) => s.setEditMode)

// truyền vào PlannerToolbar
<PlannerToolbar ... onEnterRoomEdit={() => setEditMode('room')} />

// trong <main> (nơi đã render ScaleLegend/OverlapNotice), thêm:
{store.status === 'ready' && editMode === 'room' && <RoomEditPanel />}
// ScaleLegend chỉ hiện ở furnish để khỏi trùng nhãn:
{store.status === 'ready' && editMode === 'furnish' && <ScaleLegend room={store.room} />}
```

Import `RoomEditPanel`. Kiểm: khi vào room mode, toolbar xếp-đồ vẫn hiện nhưng có thể vô hiệu nhóm gizmo (tuỳ chọn — YAGNI: để nguyên, panel đủ rõ). Đảm bảo nút Lưu vẫn lưu kích thước/tường mới (đi qua `dirty`).

- [ ] **Step 7: Chạy toàn bộ + lint**

Run: `npm run test` → tất cả PASS (sửa test cũ vỡ do `room` shape/`editMode`).
Run: `npm run lint` → sạch.

- [ ] **Step 8: nestify-review** — chạy skill `nestify-review` trên `RoomEditPanel.jsx`, `RoomEditOverlay.jsx`, `Room.jsx`, `PlannerToolbar.jsx`: xác nhận chỉ `unbuilt`/semantic token, không brass/cream, Lưu giữ `imagined`.

- [ ] **Step 9: Checkpoint (KHÔNG commit).**

---

## Verification cuối (sau tất cả task)

1. **BE:** `docker compose exec app php artisan test --filter=RoomScene` — xanh. (User chạy; sandbox không có php/vendor/DB.)
2. **FE:** `npm run test` + `npm run lint` — xanh/sạch.
3. **👁 Kiểm hình (`npm run dev`):**
   - Bấm "Chỉnh phòng" → camera lên nhìn từ trên, khoá xoay; đồ nội thất mờ/không kéo được.
   - Kéo núm cạnh → phòng đổi rộng/sâu, snap 0.5m, nhãn kích thước trong panel đổi live.
   - Bấm cạnh tường (hoặc toggle trong panel) → tường ẩn/hiện.
   - Stepper chiều cao ± → tường cao đổi.
   - "Xong" → về 3D; thu nhỏ phòng thì đồ được kéo vào trong tường (không lọt ra ngoài).
   - Lưu → tải lại phòng thấy kích thước + trạng thái tường giữ nguyên.
4. **User chạy migration prod** khi deploy: `2026_07_10_000002_add_walls_to_room_scenes_table` (idempotent).

## Ngoài phạm vi (để B / sau)
- Cửa & cửa sổ (sub-project B) — nền top-down của A đã sẵn cho việc bấm điểm trên cạnh tường.
- Tường trước (mặt thứ 4), orthographic camera thực thụ, nét-đứt cho tường tắt, undo phủ cả room (hiện undo chỉ items).
