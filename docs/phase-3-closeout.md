# Phase 3 closeout

Ngày lập: 2026-07-20. Tài liệu này không ghi nhận việc chạy migration production.

## Guest draft security and transport

- Liên kết chuyển thiết bị có dạng `/room-planner#draft=<64 ký tự>`. Token nằm trong URL fragment, không nằm trong query string hoặc path.
- Khi trang đích mở, Planner kiểm tra đúng định dạng 64 ký tự, chuyển token vào `sessionStorage` của tab hiện tại và thay URL ngay để bỏ fragment trước khi tải bản nháp.
- Các API resume/update/claim dùng URL cố định và gửi token bằng header `X-Room-Draft-Token`. Token không xuất hiện trong API access URL mặc định.
- `Referrer-Policy: no-referrer` được đặt ở document level. Theo cơ chế URL chuẩn, fragment cũng không được gửi trong HTTP request hoặc `Referer`.
- Claim được giới hạn đồng thời 5 lần/phút cho mỗi token hash và 20 lần/phút cho mỗi IP. Global API limiter vẫn áp dụng bên ngoài hai giới hạn này.
- Token do backend tạo bằng `Str::random(64)`, chỉ nhận `[A-Za-z0-9]{64}` và sống tối đa 30 ngày. Chỉ SHA-256 hash được lưu trong database; claim thành công là one-shot.

Rủi ro còn lại: liên kết đã sao chép vẫn là bearer secret. Nó có thể được lưu bởi clipboard manager, browser autocomplete/history của lần điều hướng đầu tiên, hoặc bị người nhận chia sẻ tiếp. UI nói rõ bất kỳ ai có link đều mở được bản nháp và chỉ nên gửi link cho thiết bị của chính người dùng. Không tải tài nguyên third-party trên trang Planner; tuy nhiên bảo mật vẫn phụ thuộc HTTPS và cấu hình reverse proxy không log request headers nhạy cảm.

## Production migration cutover

### Thứ tự

1. Snapshot/backup database và xác nhận migration `2026_07_08_000001_add_room_scene_id_to_cart_items_table.php` đã chạy.
2. Chạy `2026_07_20_000001_add_room_evidence_to_order_items.php`.
3. Chạy `2026_07_20_000002_create_room_drafts_table.php`.
4. Kiểm tra schema: hai cột nullable trên `order_items`, FK `ON DELETE SET NULL`, bảng `room_drafts`, unique index `token_hash`, index `expires_at`.
5. Chuyển traffic sang backend mới; smoke-test review → cart → order và create → resume → claim draft.
6. Deploy frontend mới sau khi backend smoke test qua.

Hai migration 000001 và 000002 không phụ thuộc trực tiếp vào nhau; thứ tự trên theo chronology và giúp cô lập lỗi. Backend mới **không được nhận traffic trước migration**: order snapshot giả định hai cột tồn tại và draft routes giả định bảng tồn tại. Không cần feature flag nếu dùng expand-first deploy/migration job trước khi chuyển traffic. Nếu hạ tầng không hỗ trợ bước này, phải thêm hai server-side feature flag trước deploy; không được dựa vào việc ẩn UI ở frontend.

### Backfill

- Đơn hàng cũ: không backfill. Trước thay đổi, order không lưu đủ bằng chứng room provenance để khôi phục đáng tin cậy; giữ `room_scene_id` và `room_snapshot` là `null` trung thực hơn suy đoán.
- Cart cũ đã có `room_scene_id`: không cần backfill. Khi người dùng checkout sau migration, snapshot action sẽ sao chép room id/name/preview hiện tại vào order item mới.
- Guest draft cũ: không tồn tại server-side trước tính năng này, nên không có dữ liệu cần chuyển. Local draft hiện có vẫn có thể mở cùng thiết bị và được lưu thành server draft ở lần Save tiếp theo.

### Failure và rollback

- Nếu migration dừng giữa chừng: không chuyển traffic; kiểm tra schema thực tế, sửa nguyên nhân và chạy lại. Cả hai `up()` đều có guard để rerun an toàn với column/table đã tạo.
- Ưu tiên forward-fix. Không chạy `down()` khi backend/FE mới đang phục vụ traffic.
- Nếu buộc rollback release: trước tiên đưa frontend và backend về phiên bản không đọc/ghi schema mới, sau đó mới rollback migration theo thứ tự ngược `000002` → `000001`.
- Rollback `000002` xóa mọi guest draft chưa claim; rollback `000001` xóa room provenance đã snapshot trên order item. Phải export/backup dữ liệu này trước rollback nếu đã có traffic ghi mới.

## Bundle tracking

### Kết quả đo

| Build | Chunk | Minified | Gzip | So với ngưỡng 500 kB |
|---|---|---:|---:|---:|
| Trước Phase 3 (`308781c`) | `SkeletonUtils` | 912.03 kB | 247.60 kB | +412.03 kB |
| Sau closeout | `SkeletonUtils` | 912.03 kB | 247.60 kB | +412.03 kB |
| Trước Phase 3 | `RoomPlannerPage` | 73.95 kB | 20.14 kB | dưới ngưỡng |
| Kết thúc Phase 3 (`f7562c6`) | `RoomPlannerPage` | 83.66 kB | 22.87 kB | dưới ngưỡng |
| Sau closeout | `RoomPlannerPage` | 86.86 kB | 23.72 kB | dưới ngưỡng |

Chunk duy nhất vượt 500 kB là `SkeletonUtils`, chứa phần dependency 3D và đã có cùng kích thước trước Phase 3; Phase 3 không làm chunk vượt-ngưỡng này lớn thêm. Code Phase 3 tăng route chunk Planner khoảng 9.71 kB minified / 2.73 kB gzip; closeout tăng tổng chênh lệch so với baseline lên khoảng 12.91 kB / 3.58 kB.

Follow-up được theo dõi với tên **PERF-PLANNER-01 — Split 3D runtime below the 500 kB warning threshold** trong `docs/TASKS.md`.
