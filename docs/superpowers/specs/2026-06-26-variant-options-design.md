# Quản lý biến thể theo Option (Shopify-style) + swatch màu

**Date:** 2026-06-26 · **Status:** Approved — chờ lập plan

## Bối cảnh & vấn đề

Quản lý biến thể hiện tại: mỗi `product_variant` chỉ có `name` tự do (vd "Đỏ - Size L"),
`price`, `stock_quantity`, `sku`. Cột `product_variants.attributes` (jsonb) **đã tồn tại** và BE
**đã nhận/lưu/trả** nó (ProductVariantController validate `attributes => array`,
ProductVariantResource trả `attributes`) — nhưng **không có UI** nào nhập nó, và không có khái
niệm "loại thuộc tính". Hệ quả: admin phải tạo nhiều biến thể phẳng, không tách được theo Màu /
Kích thước / Chất liệu, không gom nhóm.

`products.attributes` (jsonb) đang dùng cho **lọc catalog** (`brand`, `wood_type` trong
`ProductService`) → KHÔNG dùng chỗ này để chứa định nghĩa option.

## Quyết định (đã chốt với user)

1. **Mô hình:** Shopify-style — admin định nghĩa Option (Màu sắc: Đỏ/Xanh; Kích thước: S/M/L),
   hệ thống **tự sinh ma trận** tổ hợp; mỗi tổ hợp là 1 biến thể có giá/kho/SKU riêng.
2. **Phạm vi:** cả **admin** (editor option + ma trận) lẫn **storefront** (khách chọn theo từng
   thuộc tính thay vì hàng nút tên phẳng).
3. **Lưu schema:** **cột jsonb `variant_options` trên `products`** (0 bảng mới). Không giới hạn
   số option. Option có **type** (`text` | `color`); option màu mang **hex** cho swatch thật.

## Data model

### `products.variant_options` (jsonb mới, default `[]`)
```jsonc
[
  { "name": "Màu sắc", "type": "color",
    "values": [ {"label":"Đỏ","hex":"#C0392B"}, {"label":"Xanh","hex":"#2E5FCC"} ] },
  { "name": "Kích thước", "type": "text",
    "values": [ {"label":"S"}, {"label":"M"}, {"label":"L"} ] }
]
```
- Không cap số option. `name` duy nhất, non-empty. `type ∈ {text, color}` (mặc định `text`).
- `values[].label` duy nhất trong 1 option, non-empty. Nếu `type=color` → `values[].hex` bắt buộc,
  là mã hex hợp lệ (`#RGB`/`#RRGGBB`). `type=text` → bỏ qua hex.
- Thứ tự phần tử = thứ tự hiển thị.

### `product_variants.attributes` (jsonb, đã có)
- Map theo **label**: `{"Màu sắc":"Đỏ","Kích thước":"S"}`. Key = `option.name`, value = `value.label`.
- Hex KHÔNG lưu ở đây (tra từ `variant_options` theo label) → không trùng dữ liệu, `variant_snapshot` vẫn đọc được.

### `product_variants.name` (đã có)
- Thôi nhập tay khi product có options → **tự suy ra** = join các label theo thứ tự option, ngăn
  bằng `" / "` → `"Đỏ / S"`. Vẫn lưu vào cột `name` (storefront + variant_snapshot dùng). Biến
  thể cũ giữ name tự do.

**Chữ ký tổ hợp (signature):** chuỗi xác định 1 tổ hợp = nối label theo thứ tự option. Dùng để
diff (FE) và chống trùng (BE) khi sinh ma trận.

## Backend

- **Migration:** `add_variant_options_to_products_table` — `jsonb variant_options default '[]'`
  `after('attributes')`. (pgsql jsonb; sqlite test fallback như các migration khác.)
- **Product model:** thêm `variant_options` vào `$fillable`; cast `'variant_options' => 'array'`.
- **ProductResource:** trả `variant_options` (sau `attributes`).
- **Create/UpdateProductRequest:** rule `variant_options` (nullable|array); validate đệ quy: mỗi
  item `name` (required string), `type` (in:text,color), `values` (array ≥1), `values.*.label`
  (required string), `values.*.hex` (required_if type=color, regex hex). Message tiếng Việt. Bỏ
  mọi giới hạn `max:3`.
- **ProductVariantController store/update:** khi product có `variant_options`:
  - validate `attributes` keys = đúng tập `option.name`, value ∈ tập label đã khai báo (lỗi 422
    `VALIDATION_FAILED` nếu lệch).
  - **tự set `name`** từ attributes (bỏ qua `name` client gửi). SKU vẫn auto (generateSku hiện có).
  - Khi product CHƯA có options → giữ hành vi cũ (name tự do, attributes optional).
- **Endpoint bulk mới:** `POST /admin/products/{id}/variants/bulk` (middleware `manage_products`).
  - Request: `variants: array` — mỗi phần tử `{ attributes: object(required), price: numeric,
    stock_quantity: integer, sku?: string }`.
  - 1 transaction: với mỗi phần tử, **bỏ qua nếu tổ hợp (signature) đã tồn tại**; tạo phần còn lại
    (name auto, sku auto). Idempotent → gọi lại an toàn.
  - Response: `201 { data: [ProductVariantResource] }` (toàn bộ biến thể của product sau khi tạo).
- **Service:** logic sinh signature + name dồn vào `ProductService` (vd `variantSignature(array)`,
  `deriveVariantName(product, attributes)`), tái dùng cho cả create đơn lẻ lẫn bulk.

## Admin UX

1. **Panel "Tùy chọn" (variant options)** trong trang sửa sản phẩm:
   - Thêm/xóa option; mỗi option: tên + chọn loại (text/màu) + danh sách value.
   - Option **màu**: cạnh mỗi value có **color picker** (`<input type=color>` + ô hex) → lưu hex.
   - Lưu qua **update product** (vì là field của product).
2. **Nút "Tạo biến thể từ tùy chọn":**
   - FE tính tích Descartes mọi tổ hợp, **diff** theo signature với biến thể đã có → chỉ hiện
     dòng **mới**. Nếu số tổ hợp lớn (>50) hiện cảnh báo xác nhận.
   - Bảng ma trận: cột thuộc tính (read-only) + giá (prefill từ ô "giá gốc") + kho (0) + SKU
     (auto, hiện "tự tạo"). Admin chỉnh inline → lưu (gọi **bulk**).
3. **Bảng biến thể** gom nhóm theo option đầu tiên (vd theo Màu) cho dễ đọc.

## Storefront

- `ProductResource` trả `variant_options` + variants kèm `attributes`.
- `ProductPage`: nếu `variant_options` không rỗng → render **mỗi option 1 bộ chọn**:
  - option `color` → hàng **swatch tròn** (nền = hex, viền đậm khi chọn, `title`/`aria-label` = label).
  - option `text` → hàng nút nhãn.
  - Chọn đủ tất cả option → resolve variant theo attributes (so khớp signature). Tổ hợp **không
    tồn tại** hoặc **hết hàng** → swatch/nút **disabled** (mờ). Giá/kho/nút mua theo variant resolved.
- **Fallback:** product cũ (`variant_options = []`) giữ nguyên hàng nút tên phẳng hiện tại.
- Giữ guard "staff không mua được" (đã có) độc lập với phần này.

## Tương thích ngược

- Product cũ: `variant_options = []`, variant cũ có `attributes = {}` + name tự do → không cần
  migrate dữ liệu, không vỡ. Storefront fallback flat.
- Generator **chỉ thêm**, không bao giờ xóa biến thể đang có (có thể dính đơn/kho). Bỏ 1 value
  khỏi schema KHÔNG xóa variant — admin tự deactivate/xóa (delete hiện có nullOnDelete-safe cho
  order_items).
- `order_items.variant_snapshot` đã chụp name + attributes lúc mua → đơn lịch sử an toàn.

## Edge cases

- Tổ hợp trùng: chặn ở cả FE (diff) và BE (skip theo signature).
- Đổi nhãn value sau khi đã có variant: variant cũ giữ label cũ trong attributes → có thể lệch
  schema. v1: cảnh báo trên admin (variant có attribute không khớp option hiện tại), không tự sửa.
- Option màu thiếu hex: chặn ở validate.
- Số tổ hợp lớn: cảnh báo, không hard-limit.

## Testing

**BE**
- Migration chạy (pgsql) / test sqlite OK.
- Update product lưu + validate `variant_options` (type/hex/unique).
- Tạo variant: attributes khớp options → name auto đúng; lệch options → 422.
- Bulk: tạo các tổ hợp thiếu, **skip** tổ hợp đã có (idempotent); atomic.
- Product chưa có options → tạo variant kiểu cũ vẫn chạy.

**FE**
- Option editor: thêm/xóa option & value, option màu lưu hex, không còn cap 3.
- Sinh ma trận: diff đúng (chỉ dòng mới), cảnh báo khi >50.
- Storefront: swatch màu render đúng hex; chọn tổ hợp resolve đúng variant; tổ hợp thiếu/hết hàng
  disabled; product cũ fallback flat.

## Docs cần cập nhật (sau khi build)

- `FE_AI_CONTEXT.md`: `products.variant_options` shape; contract `variant.attributes`; endpoint
  bulk; ProductResource thêm field.
- `Diagrams/NestifyERD.puml`: `products.variant_options : jsonb <<options [{name,type,values[]}]>>`.
- (Tùy chọn) note UC-A02 về tạo biến thể theo option.
- Spec này.

## Không làm (YAGNI v1)

- Không tách bảng chuẩn hóa (product_options/values) — đã chọn jsonb.
- Không ảnh/media riêng theo từng value màu (chỉ swatch hex).
- Không bulk **sửa** giá/kho hàng loạt cho variant đã tồn tại (chỉ bulk **tạo** tổ hợp mới); sửa
  vẫn qua form/inline từng cái.
