# Room Planner — Tỉ lệ phòng đọc được (lưới đúng + HUD chú thích)

**Date:** 2026-07-10 · **Repo:** FE (thuần FE, không BE, không dep mới — `Grid` có sẵn trong drei 9.114).

## Vấn đề (UX, user báo)
"1 ô là kích thước sao?" — editor **không cho biết tỉ lệ**: (1) không hiển thị kích thước phòng lẫn "1 ô = 1m";
(2) lưới là **hình vuông cạnh max(rộng,sâu)** → tràn ra ngoài tường ở phòng chữ nhật (vd 4×6 → lưới 6×6).

## Mục tiêu
Người dùng nhìn vào biết ngay: phòng bao nhiêu mét, 1 ô = 1m, và lưới **khít đúng** hình phòng.

## Giải pháp
1. **Lưới đúng (`Room.jsx`):** thay `gridHelper(max,max)` bằng drei `<Grid args={[width, depth]} cellSize={1}
   cellColor="#C9C4B8" sectionColor="#C9C4B8" infiniteGrid={false} fadeDistance={40} fadeStrength={1} />`
   tại y≈0.01 → lưới chữ nhật rộng×sâu, ô 1m, khít trong tường. (`unbuilt` #C9C4B8 = trạng thái outline/possibility.)
   Giữ 2 mảng tường + sàn như cũ.
2. **HUD (`ScaleLegend.jsx` mới):** div overlay góc dưới-trái canvas, `pointer-events-none`, semantic token,
   nội dung **"Phòng {W} × {D} × {H} m · 1 ô = 1 m"**. Render trong `<main>` của RoomPlannerPage (đè canvas).

## Ràng buộc
Thuần FE; semantic token cho HUD, hex mirror token cho 3D; không đổi đơn vị (mét); ô lẻ ở mép chấp nhận.
KHÔNG commit.

## Test
- `ScaleLegend.test.jsx`: render với room → hiện đúng "Phòng 4 × 5 × 2.8 m · 1 ô = 1 m".
- Lưới: SceneStage mock Canvas nên không vỡ; kiểm bằng mắt (user).

## Không làm
Nhãn số đo 3D trên cạnh phòng; đổi đơn vị; center-axes emerging (bỏ nhấn mạnh, dùng unbuilt đồng nhất — nestify-review chốt).
