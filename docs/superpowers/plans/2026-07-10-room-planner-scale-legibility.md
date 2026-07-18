# Room Planner — Tỉ lệ phòng đọc được — Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans. Thuần FE, không dep mới, KHÔNG commit (task đóng bằng lint+test).

### Task 1: HUD `ScaleLegend`
**Files:** Create `src/pages/roomPlanner/ScaleLegend.jsx` + `ScaleLegend.test.jsx`; Modify `RoomPlannerPage.jsx`.

- [ ] **Test đỏ** — `ScaleLegend.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScaleLegend } from './ScaleLegend'

describe('ScaleLegend', () => {
  it('hiện kích thước phòng + 1 ô = 1 m', () => {
    render(<ScaleLegend room={{ width: 4, depth: 5, height: 2.8 }} />)
    expect(screen.getByText(/Phòng 4 × 5 × 2\.8 m/)).toBeInTheDocument()
    expect(screen.getByText(/1 ô = 1 m/)).toBeInTheDocument()
  })
})
```
- [ ] Chạy → ĐỎ.
- [ ] **Tạo `ScaleLegend.jsx`:**
```jsx
// Chú thích tỉ lệ luôn hiện trong editor: kích thước phòng + "1 ô = 1 m" (lưới ô 1m).
// pointer-events-none để không cản thao tác canvas.
export function ScaleLegend({ room }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 rounded-control border border-border bg-surface/85 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
      Phòng {room.width} × {room.depth} × {room.height} m · 1 ô = 1 m
    </div>
  )
}
```
- [ ] **RoomPlannerPage.jsx:** import + render trong `<main>` (nơi có `<RoomCanvas />`), sau canvas:
```jsx
import { ScaleLegend } from './ScaleLegend'
// trong <main className="relative ..."> :
            {store.status === 'ready' && <RoomCanvas />}
            {store.status === 'ready' && <ScaleLegend room={store.room} />}
```
- [ ] Chạy → XANH. Lint.

### Task 2: Lưới đúng hình chữ nhật (`Room.jsx`)
**Files:** Modify `src/pages/roomPlanner/scene/Room.jsx`.

- [ ] **Sửa `Room.jsx`:** thêm import `Grid` từ drei; thay `<gridHelper .../>` bằng:
```jsx
import { Grid } from '@react-three/drei'
// ...thay dòng gridHelper:
      <Grid
        args={[width, depth]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={1}
        cellColor="#C9C4B8"
        sectionSize={0}
        sectionColor="#C9C4B8"
        infiniteGrid={false}
        fadeDistance={40}
        fadeStrength={1}
      />
```
> Nếu `sectionSize={0}` gây lỗi chia 0, đặt `sectionSize={Math.max(width, depth)}` (section trùng biên, vô hại). cellColor/sectionColor cùng `unbuilt` để lưới đồng nhất.
- [ ] Chạy full suite (SceneStage mock Canvas → không vỡ) + lint XANH.
- [ ] **nestify-review** `Room.jsx` + `ScaleLegend.jsx`: chỉ `unbuilt`/semantic token, không màu cấm.
- [ ] 👁 User kiểm hình: lưới khít trong tường, ô 1m; HUD hiện kích thước.

## Self-Review
Spec §giải-pháp 1 = Task 2; 2 = Task 1; test = Task 1. Guardrail: không commit.
