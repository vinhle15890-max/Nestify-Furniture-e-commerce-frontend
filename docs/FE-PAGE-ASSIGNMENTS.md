# Nestify Frontend — Phân công theo trang

> **Mục đích:** tách riêng bảng phân công FE theo **route/trang đang sử dụng**, không trình bày theo nhóm chức năng.
> Mỗi trang có đúng một người chịu trách nhiệm chính về giao diện, trạng thái loading/empty/error/permission,
> tích hợp dữ liệu và test của trang. Chi tiết luồng kỹ thuật vẫn tra cứu trong
> [`FE-TEAM-WORKFLOW.md`](./FE-TEAM-WORKFLOW.md).
>
> **Ngày rà soát route và cân bằng lại:** 2026-09-03.

## 1. Tổng quan phân bổ

| Thành viên | Phạm vi trang chính | Số đầu mục chính |
|---|---|---:|
| Võ Thành Công (FE1) | Storefront khám phá sản phẩm và admin nội dung sản phẩm | 11 |
| Lê Kiến Tấn (FE2) | Hành trình mua hàng, thanh toán và vận hành đơn | 11 |
| Lê Thành Vinh (FE3) | Tài khoản và Room Planner | 12 |
| Trần Đặng Chính Phước (FE4) | Admin nhân sự/RBAC, kiểm duyệt, voucher và trang chung | 10 |

Số đầu mục chỉ dùng để kiểm tra độ lệch sơ bộ, không đồng nghĩa mọi trang có cùng độ khó. Room Planner, checkout,
chi tiết đơn và hạ tầng dùng chung được xem là các đầu mục nặng. So với phân công cũ, Tấn chuyển
`/admin/vouchers` và `/admin/reviews` sang Phước; `payment-exceptions` vẫn ở Tấn vì gắn chặt với xử lý thanh toán
và chi tiết đơn.

## 2. Võ Thành Công (FE1)

| STT | Route/trang | Nội dung chịu trách nhiệm |
|---:|---|---|
| 1 | `/` | Trang chủ, hero, khối khám phá, danh mục và sản phẩm nổi bật/bán chạy. |
| 2 | `/about` | Trang giới thiệu thương hiệu và nội dung liên quan. |
| 3 | `/c/:categorySlug` | Danh sách sản phẩm, tìm kiếm, bộ lọc, sắp xếp, load thêm và breadcrumb. |
| 4 | `/collections/:collectionSlug` | Chi tiết bộ sưu tập công khai và danh sách sản phẩm. |
| 5 | `/p/:productSlug` | Gallery, biến thể, giá/tồn, thông số, bằng chứng sản phẩm và bố cục chi tiết. |
| 6 | `/admin/categories` | Danh sách, tạo, sửa, xoá danh mục và ảnh đại diện. |
| 7 | `/admin/products` | Danh sách, tìm kiếm, phân trang, thao tác hàng loạt và lối vào tạo/duyệt SEO. |
| 8 | `/admin/products/new` | Tạo sản phẩm, nội dung, SEO, thuộc tính và khởi tạo biến thể. |
| 9 | `/admin/products/:id` | Sửa sản phẩm, biến thể, media, model 3D và kích thước thật. |
| 10 | `/admin/products/seo` | Duyệt và xử lý bản nháp SEO của sản phẩm. |
| 11 | `/admin/media` | Upload, tìm kiếm, tái sử dụng và xoá tài nguyên ảnh hợp lệ. |

**Điểm bàn giao:** Tấn cung cấp hành vi cart/wishlist/review được gắn trong `ProductPage`; Công quyết định bố cục
và chịu trách nhiệm test tích hợp của toàn trang.

## 3. Lê Kiến Tấn (FE2)

| STT | Route/trang | Nội dung chịu trách nhiệm |
|---:|---|---|
| 1 | `/vouchers` | Danh sách chiến dịch voucher công khai và điều kiện sử dụng. |
| 2 | `/account/vouchers` | Ví voucher của khách hàng và trạng thái sử dụng/hạn dùng. |
| 3 | `/cart` | Dòng hàng, số lượng, xoá/hoàn tác, lỗi tồn kho, voucher preview và tổng tiền. |
| 4 | `/wishlist` | Danh sách đã lưu, thông báo có hàng, xoá và chuyển sang giỏ. |
| 5 | `/checkout` | Địa chỉ, voucher, COD/PayOS, idempotency và phục hồi checkout dở. |
| 6 | `/checkout/return` | Reconcile PayOS và các trạng thái thành công, thất bại, timeout, thử lại. |
| 7 | `/orders` | Lịch sử đơn hàng và phân trang. |
| 8 | `/orders/:id` | Chi tiết đơn, vận chuyển, huỷ, thanh toán lại, review và return/refund. |
| 9 | `/admin/orders` | Tìm kiếm/lọc đơn và hàng đợi vận hành. |
| 10 | `/admin/orders/:id` | Cập nhật trạng thái, vận chuyển, COD, return/refund và timeline audit. |
| 11 | `/admin/payment-exceptions` | Xử lý ngoại lệ PayOS đã thu tiền nhưng đơn chưa tự phục hồi. |

**Phần đã chuyển cho Phước:** `/admin/vouchers` và `/admin/reviews`. Tấn vẫn phụ trách dữ liệu/hook phía storefront
nếu trang của Tấn sử dụng chúng, nhưng không còn là chủ trang admin tương ứng.

## 4. Lê Thành Vinh (FE3)

| STT | Route/trang | Nội dung chịu trách nhiệm |
|---:|---|---|
| 1 | `/login` | Đăng nhập khách hàng, validation và khởi tạo session. |
| 2 | `/register` | Đăng ký khách hàng và validation biểu mẫu. |
| 3 | `/forgot-password` | Yêu cầu khôi phục mật khẩu. |
| 4 | `/reset-password` | Đặt lại mật khẩu từ token. |
| 5 | `/verify-email` | Xác minh và gửi lại email xác minh. |
| 6 | `/account` | Hồ sơ, tóm tắt đơn/phòng và các lối vào khu vực cá nhân. |
| 7 | `/account/addresses` | Danh sách, thêm, sửa, xoá và đặt địa chỉ mặc định. |
| 8 | `/account/rooms` | Danh sách phòng, đổi tên, xoá, chia sẻ và mở lại. |
| 9 | `/room-planner` | Guest draft, thiết lập phòng, catalog, canvas/fallback và lưu scene. |
| 10 | `/room-planner/:id` | Mở và chỉnh sửa scene thuộc tài khoản. |
| 11 | `/room-planner/shared/:token` | Scene chia sẻ công khai ở chế độ chỉ đọc. |
| 12 | Chat widget toàn storefront | Phiên chat AI, nguồn sản phẩm, giới hạn token và lỗi dịch vụ. |

**Điểm bàn giao:** Vinh cung cấp address modal/hook cho `/checkout`; Tấn chịu trách nhiệm cách phần địa chỉ được
tích hợp và hiển thị trong toàn trang checkout.

## 5. Trần Đặng Chính Phước (FE4)

| STT | Route/trang | Nội dung chịu trách nhiệm |
|---:|---|---|
| 1 | `/admin/login` | Đăng nhập staff và phản hồi lỗi xác thực. |
| 2 | `/admin` | Dashboard, cảnh báo và lối vào các hàng đợi vận hành. |
| 3 | `/admin/employees` | Danh sách nhân viên, tạo nhân viên và gán vai trò. |
| 4 | `/admin/customers` | Danh sách/chi tiết khách, cấp voucher, khoá/mở khoá và thăng nhân viên. |
| 5 | `/admin/roles` | CRUD role, permission matrix và xem thử theo vai trò. |
| 6 | `/admin/audit-logs` | Phân trang, lọc action và xem diff audit. |
| 7 | `/admin/vouchers` | CRUD voucher, hiệu lực, giới hạn sử dụng và điều kiện giảm giá. |
| 8 | `/admin/reviews` | Hàng chờ kiểm duyệt, duyệt hoặc từ chối đánh giá. |
| 9 | `/shipping`, `/returns`, `/privacy`, `/contact` | Nhóm trang hỗ trợ công khai dùng chung một page module. |
| 10 | `*` | Trang không tìm thấy. |

Ngoài các trang trên, Phước giữ vai trò chủ hạ tầng FE dùng chung: `app/router.jsx`, route guard, `lib/`, `store/`,
shared UI và chất lượng chung (a11y, responsive, performance, lint/test/build). Đây là trách nhiệm phối hợp, không
được hiểu là Phước phải sửa mọi lỗi phát sinh trong trang do thành viên khác sở hữu.

## 6. Giải thích chức năng và nguồn dữ liệu theo URL

### 6.1 Cách đọc

Mỗi URL dưới đây trả lời bốn câu hỏi để thành viên có thể học và phản biện:

- **UI làm gì?** Những khối hoặc thao tác chính người dùng nhìn thấy.
- **Dữ liệu từ đâu?** Chuỗi `Page → hook → api.js → endpoint`; trang tĩnh được ghi rõ là không gọi API.
- **Logic hiển thị là gì?** Phần nào FE tính/chọn để trình bày và phần nào server đã tính sẵn.
- **Sau thao tác thì sao?** Cache/store, điều hướng, lỗi hoặc giới hạn quan trọng.

#### Quy ước chung cho mọi URL

- `apiClient` tự gắn Bearer token đúng scope và unwrap `response.data`; page không tự gọi axios.
- Query dùng TanStack Query. Mutation thành công thường invalidate cache liên quan; dữ liệu server không lưu lặp
  trong Zustand. `authStore` giữ phiên, còn toast/drawer/chat là UI state.
- `ProtectedRoute`, `AdminRoute` và `RequirePermission` chỉ là gate điều hướng/UX. Quyền thật vẫn do BE kiểm tra.
- Lỗi API được chuẩn hoá thành `ApiError`; lỗi validation map về field, `401` ngoài auth làm xoá phiên và query cache.

### 6.2 Các trang của Công

#### `/` — Trang chủ

- **UI:** hero, trạng thái “Becoming”, danh mục nổi bật, sản phẩm được giới thiệu, bán chạy, bộ sưu tập, bằng chứng
  review, gợi ý tiếp tục hành trình và lời mời vào Room Planner.
- **Nguồn:** các component trong `HomePage`; catalog gọi `GET /categories`, `GET /products/featured`,
  `GET /products/best-sellers`, `GET /collections`; cá nhân hoá gọi `GET /me/journey-context` khi đủ điều kiện.
- **Logic:** “Nổi bật” theo cờ/vị trí staff cấu hình; “Bán chạy” do BE cộng số lượng item của đơn `delivered`, không
  tính đơn chỉ mới thanh toán/đang giao. Journey chỉ đổi thứ tự/gợi ý, không sửa dữ liệu sản phẩm gốc.
- **Trạng thái:** từng section có loading/empty riêng; guest vẫn xem catalog, còn journey suy biến mềm khi không có phiên.

#### `/about` — Giới thiệu

- **UI:** câu chuyện thương hiệu, vật liệu, triết lý “The Becoming Room” và CTA sang catalog/Room Planner.
- **Nguồn:** nội dung/component tĩnh (`BrandStory`, `MaterialStory`, `PlannerInvite`), không gọi API.
- **Logic:** chỉ điều hướng và reveal animation; không có số liệu kinh doanh hay cam kết do client tự tạo.

#### `/c/:categorySlug` và `/c/all` — Catalog

- **UI:** breadcrumb, tên danh mục, tìm kiếm, lọc, sắp xếp, discovery lens và nút tải thêm.
- **Nguồn:** `useCategory` → `GET /categories/{slug}`; `useCategories` → `GET /categories`;
  `useInfiniteProducts` → `GET /products` với filter/sort/cursor; journey từ `GET /me/journey-context`.
- **Logic:** filter được đồng bộ vào query string; đổi filter tạo query key mới và reset cursor. `/c/all` bỏ filter
  category. Nếu bật journey ordering, FE dùng tín hiệu discovery để xếp lại các sản phẩm đã tải, không bịa sản phẩm.
- **Trạng thái:** skeleton lúc đầu, load-more theo `next_cursor`, empty khi không có kết quả, 404 danh mục được tách
  khỏi lỗi mạng.

#### `/collections/:collectionSlug` — Bộ sưu tập

- **UI:** tiêu đề/nội dung bộ sưu tập và các `ProductCard` thuộc bộ sưu tập.
- **Nguồn:** `useCollection(slug)` → `GET /collections/{slug}`.
- **Logic:** thứ tự và membership do response server quyết định; FE chỉ render, phát SEO và xử lý loading/error/empty.

#### `/p/:productSlug` — Chi tiết sản phẩm

- **UI:** gallery, breadcrumb, giá, biến thể, tồn khả dụng, số lượng, thông số/kích thước, bằng chứng, giao hàng,
  thêm giỏ, wishlist, review và recently viewed.
- **Nguồn:** `GET /products/{slug}`, `GET /categories`, `GET /products/{slug}/reviews`; customer còn gọi
  `GET /wishlist`, `GET /products/{id}/review-eligibility`, `POST /products/{slug}/view` và journey context.
- **Logic:** `resolveVariant` khớp tổ hợp option với `variant.attributes`; giá và `available_stock` lấy từ variant do
  server trả. Khi sale đang active, storefront đặt giá hiệu lực làm giá chính và gạch `regular_price` bên cạnh để
  khách biết mức giá ban đầu; sale tương lai/hết hạn không được trình bày như đang giảm. FE disable tổ hợp không tồn
  tại/hết hàng nhưng BE vẫn kiểm tra tồn lúc thêm giỏ. HTML mô tả được
  DOMPurify sanitize trước render. Staff bị chặn mua; review form chỉ mở khi server báo đủ điều kiện.
- **Mutation:** thêm giỏ → `POST /cart/items` rồi invalidate `['cart']`; wishlist add/remove → endpoint wishlist;
  gửi review → `POST /products/{id}/reviews` rồi làm mới review/eligibility.

#### `/admin/categories`

- **UI:** cây/danh sách danh mục, form tạo/sửa, chọn ảnh và xác nhận xoá.
- **Nguồn:** `GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/{id}`.
- **Logic:** page gửi payload biểu mẫu; quan hệ cha-con và điều kiện được phép xoá do BE quyết định. Mutation thành
  công invalidate cache admin categories và catalog liên quan.

#### `/admin/products`

- **UI:** bảng sản phẩm, tìm kiếm, phân trang, trạng thái, featured position, tạo mới và lối vào duyệt SEO.
- **Nguồn:** `GET /admin/products?page=&search=`; archive dùng `DELETE /admin/products/{id}`.
- **Logic:** phân trang/filter do server; FE giữ page/search trong state và không tự tổng hợp tồn kho toàn sản phẩm.

#### `/admin/products/new`

- **UI:** form thông tin cơ bản, danh mục, mô tả, SEO, thuộc tính và thiết lập ban đầu.
- **Nguồn:** dữ liệu chọn từ admin categories; submit `POST /admin/products`; hỗ trợ mô tả AI qua
  `POST /admin/products/ai/description` khi người dùng chủ động yêu cầu.
- **Logic:** FE validate hình thức và dựng payload; slug/uniqueness, quyền và invariant sản phẩm do BE chốt. Thành công
  điều hướng sang trang edit để tiếp tục variant/media.

#### `/admin/products/:id`

- **UI:** sửa sản phẩm, option matrix, variant CRUD, điều chỉnh tồn, lịch sử chuyển động tồn, media, model 3D và
  kích thước thật.
- **Nguồn:** `GET/PATCH /admin/products/{id}`; variant qua `/admin/products/{id}/variants` và `/admin/variants/{id}`;
  stock adjustment/movements; media attach/reorder; model dùng chuỗi presign → upload R2 → measure → confirm.
- **Logic:** trường `price` trong form được ghi rõ là **Giá gốc**; `sale_price` phải thấp hơn giá gốc và chỉ có hiệu
  lực trong lịch đã cấu hình. FE có thể sinh ma trận tổ hợp option để người dùng duyệt, nhưng BE quyết định uniqueness
  SKU, số tồn và tính hợp lệ. `cloudinary_id` không được xuất hiện trong resource. Model chỉ được confirm sau khi
  đo/scale hợp lệ.

#### `/admin/products/seo`

- **UI:** lọc draft pending/applied/dismissed, sửa draft, apply, dismiss và theo dõi batch sinh SEO.
- **Nguồn:** `/admin/products/seo/drafts`, `/admin/products/seo/bulk`, `/admin/products/seo/bulk/{batchId}` và các
  endpoint `/admin/products/{id}/seo/draft*`.
- **Logic:** nội dung AI luôn là draft; chỉ mutation apply mới đưa vào trường SEO thật. FE theo dõi batch và invalidate
  draft/product sau mutation, không coi text sinh tự động là đã xuất bản.

#### `/admin/media`

- **UI:** thư viện ảnh dùng chung, tìm kiếm, phân trang, upload, sửa alt text, chọn/tái sử dụng và xoá.
- **Nguồn:** `GET/POST /admin/media`, `PATCH/DELETE /admin/media/{id}`.
- **Logic:** upload multipart; xoá có thể bị BE từ chối nếu asset đang được tham chiếu. FE hiển thị lỗi thay vì tự gỡ
  quan hệ khỏi sản phẩm.

### 6.3 Các trang của Tấn

#### `/vouchers`

- **UI:** chiến dịch voucher công khai, điều kiện, thời hạn và hướng dẫn mã phù hợp sẽ xuất hiện trong giỏ.
- **Nguồn:** `useVoucherCampaigns` → `GET /voucher-campaigns`.
- **Logic:** trang này chỉ đọc, không có thao tác “nhận voucher”. FE format loại/mức giảm và thời gian; BE quyết định
  chiến dịch nào đang mở. Việc mã có áp dụng được cho giỏ cụ thể hay không được kiểm tra ở cart/checkout.

#### `/account/vouchers`

- **UI:** voucher đã được cấp cho tài khoản, hạn dùng và CTA đưa mã sang giỏ/checkout.
- **Nguồn:** `useVoucherWallet` → `GET /me/vouchers`.
- **Logic:** danh sách là quyền phân phối, chưa phải bảo đảm áp dụng; checkout vẫn phải preview rồi BE tái kiểm tra
  trong transaction tạo đơn.

#### `/cart`

- **UI:** dòng hàng, quantity, xoá/hoàn tác, cảnh báo thiếu tồn, tìm/chọn voucher preview và tổng tạm tính.
- **Nguồn:** `GET /cart`, `GET /cart/available-vouchers`; mutation `/cart/items`, `/cart/items/{id}/removal`,
  `/cart/removals/{token}/restore`, `POST /cart/apply-voucher`.
- **Logic:** server reprice `unit_price_snapshot` khi đọc; FE so `quantity` với `available_stock` để cảnh báo sớm.
  Xoá trả removal token để hoàn tác. Voucher preview trả discount/final total nhưng không consume voucher.
- **Lỗi:** `409 INSUFFICIENT_STOCK` dùng `details.available`; mutation không optimistic để tránh rollback giá/tồn.

#### `/wishlist`

- **UI:** item đã lưu, bật/tắt báo có hàng, xoá và chuyển sang giỏ.
- **Nguồn:** `GET /wishlist`; `PATCH/DELETE /wishlist/items/{id}`; `POST /wishlist/items/{id}/move-to-cart`.
- **Logic:** move-to-cart là một operation server để tránh client tự add rồi delete lệch trạng thái; thành công làm mới
  cả wishlist và cart. Lỗi tồn giữ item ở wishlist.

#### `/checkout`

- **UI:** xác nhận dòng hàng, chọn/thêm/sửa địa chỉ, voucher, phương thức COD/PayOS và trạng thái phục hồi checkout.
- **Nguồn:** `GET /cart`, `GET /addresses`, preview voucher; `POST /orders` với `Idempotency-Key`; PayOS gọi tiếp
  `POST /orders/{id}/payment-session`; recovery đọc lại `GET /orders/{id}`.
- **Logic:** idempotency key ổn định cho cùng một lần submit, chống double-click/retry tạo hai đơn. BE vẫn reprice,
  giữ tồn, consume voucher và tạo order trong transaction. Với COD, thành công vào đơn; với PayOS, FE redirect URL
  do server trả. Khi mất mạng sau submit, FE đánh dấu kết quả chưa chắc chắn và dò order thay vì tạo bừa lần mới.

#### `/checkout/return`

- **UI:** đang xác minh, thành công, chờ thanh toán, thất bại/timeout và nút thử lại.
- **Nguồn:** đọc `order_id` từ query string rồi `POST /orders/{id}/payment/reconcile`.
- **Logic:** query có `gcTime: 0`; FE thử follow-up có giới hạn khi trạng thái còn pending và invalidate order/cart khi
  server xác nhận. Query params từ PayOS không được tin để tự đánh dấu paid.

#### `/orders`

- **UI:** lịch sử đơn, badge trạng thái, tóm tắt item/tổng tiền, bước tiếp theo và phân trang.
- **Nguồn:** `useOrders(page)` → `GET /orders?page=`.
- **Logic:** `customerOrderNextAction` chiếu trạng thái server thành lời hướng dẫn/CTA; nó không thay đổi state machine.

#### `/orders/:id`

- **UI:** dòng hàng, timeline/trạng thái, thanh toán lại, huỷ, vận chuyển, return/refund và thông tin nhận tiền hoàn.
- **Nguồn:** `GET /orders/{id}`; cancel, payment-session, return-request/ship và refund payout-details dùng các endpoint
  tương ứng trong `features/orders`/`checkout`.
- **Logic:** FE chỉ hiện action theo read model như `return_policy.can_request`; BE vẫn kiểm tra ownership, transition,
  cửa sổ return, refund capacity và idempotency. Huỷ sau `shipped/delivered` bị từ chối.

#### `/admin/orders`

- **UI:** bảng đơn với search và bộ lọc độc lập fulfillment, payment, confirmation, return; link sang chi tiết.
- **Nguồn:** `GET /admin/orders` với `q`, `page`, `status`, `status_group`, `payment_method`, `payment_status`,
  `payment_queue`, `confirmation_queue`, `return_status`, `has_return`.
- **Logic:** URL/query filter ánh xạ thẳng thành params; server phân trang và trả read model. Dashboard deep-link vào
  trang này bằng đúng filter hàng đợi.

#### `/admin/orders/:id`

- **UI:** cập nhật fulfillment, metadata giao hàng, thu COD, review/receive return, refund, xác minh payout và audit.
- **Nguồn:** `GET /admin/orders/{id}` cùng nhóm endpoint status/shipment/COD/refund/return trong admin orders API.
- **Logic:** nút là projection theo trạng thái/quyền. BE enforce transition và số tiền; refund request giữ một
  idempotency key ổn định qua HTTP retry. Hoàn thủ công chỉ complete sau khi nhập bằng chứng/reference đã chuyển.

#### `/admin/payment-exceptions`

- **UI:** hàng đợi PayOS thu tiền nhưng order chưa phục hồi, lọc trạng thái và thao tác resolve bằng refund.
- **Nguồn:** `GET /admin/payment-exceptions?status=` và
  `POST /admin/payment-exceptions/{id}/resolve-refund` với `Idempotency-Key`.
- **Logic:** đây là hàng đợi P0; item phải còn thấy đến khi được xử lý/audit. FE không tự đánh dấu resolved theo kết
  quả cổng thanh toán bên ngoài.

### 6.4 Các trang của Vinh

#### `/login`, `/register`

- **UI:** form xác thực khách hàng và lỗi theo field.
- **Nguồn:** `POST /auth/login`, `POST /auth/register`; thành công lưu `{token,user}` vào `authStore` persisted.
- **Logic:** Yup kiểm tra hình thức; BE xác thực credential, trạng thái tài khoản và uniqueness. Staff không dùng luồng
  customer để mua hàng.

#### `/forgot-password`, `/reset-password`, `/verify-email`

- **UI:** gửi yêu cầu reset, đặt mật khẩu mới, xác minh link và gửi lại email.
- **Nguồn:** `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`,
  `/auth/email/verification-notification`.
- **Logic:** forgot luôn trả thông điệp trung tính để tránh dò email; verify chuyển `id/expires/signature` từ URL lên
  BE; reset thành công làm vô hiệu token cũ phía server.

#### `/account`

- **UI:** profile, tuỳ chọn cá nhân hoá, đơn gần nhất, phòng gần nhất và các shortcut tài khoản.
- **Nguồn:** `GET /auth/me`, `GET /orders`, `GET /room-scenes`; profile `PATCH /auth/profile`; personalization dùng
  `/me/personalization` và `/me/personalization/history`.
- **Logic:** user mới từ `/auth/me` đồng bộ vào `authStore`; đơn/phòng vẫn thuộc Query cache riêng. Tắt cá nhân hoá
  ngăn dùng lịch sử; thao tác xoá history là mutation server.

#### `/account/addresses`

- **UI:** danh sách, thêm/sửa/xoá và đặt mặc định.
- **Nguồn:** `GET/POST /addresses`, `PATCH/DELETE /addresses/{id}`, `PATCH /addresses/{id}/default`.
- **Logic:** client không tự gửi `is_default` khi tạo; BE tự đặt địa chỉ đầu tiên và giữ invariant chỉ một mặc định.
  Thành công invalidate `['addresses']`.

#### `/account/rooms`

- **UI:** phòng đã lưu, phân trang, đổi tên, xoá, chia sẻ và mở lại.
- **Nguồn:** `GET /room-scenes?page=`, `PATCH/DELETE /room-scenes/{id}`, `POST /room-scenes/{id}/share`.
- **Logic:** ownership/giới hạn số phòng do BE; FE confirm thao tác phá huỷ và invalidate scene list.

#### `/room-planner` và `/room-planner/:id`

- **UI:** thiết lập kích thước phòng, catalog, canvas 3D hoặc fallback, đặt/di chuyển/xoay đồ, kiểm tra chồng lấn,
  review room, lưu preview và thêm scene vào giỏ.
- **Nguồn:** guest dùng `/room-drafts/current` với `X-Room-Draft-Token`; account dùng CRUD `/room-scenes`; sản phẩm
  preload từ catalog; review/add-to-cart dùng `/room-scenes/{id}/review` và `/add-to-cart`.
- **Logic:** transform scene là client state trong lúc chỉnh; dữ liệu persisted gửi server. Guest draft có token riêng
  và được claim sau login. FE cảnh báo overlap/khả năng thiết bị nhưng không hứa mô phỏng vật lý; small screen/no-WebGL
  phải có fallback. Scene→cart vẫn để server kiểm tra variant/tồn.

#### `/room-planner/shared/:token`

- **UI:** scene công khai chỉ đọc, canvas/fallback và danh sách sản phẩm trong phòng.
- **Nguồn:** `GET /room-scenes/share/{token}`.
- **Logic:** không có mutation chỉnh scene; share token là capability do server kiểm tra, FE không suy ra owner data.

#### Chat widget

- **UI:** mở panel, gửi câu hỏi, xem trả lời và nguồn sản phẩm.
- **Nguồn:** `POST /ai/chat {message, history}`; phiên hội thoại nằm trong `chatStore`, không persist lâu dài.
- **Logic:** FE giới hạn/render history và nguồn; RAG, grounding, rate limit và câu trả lời fallback do BE xử lý.

### 6.5 Các trang của Phước

#### `/admin/login`

- **UI:** form đăng nhập staff, lỗi credential/tài khoản và điều hướng vào admin.
- **Nguồn:** `POST /auth/admin/login` với auth scope admin; phiên admin tách scope với customer.
- **Logic:** không có đăng ký staff công khai; `isStaff` và permission response quyết định khả năng vào admin.

#### `/admin` — Dashboard

- **Gate và request:** `AdminHome` dùng effective user; có `view_dashboard` mới render dashboard, nếu không thì redirect
  tới menu đầu tiên được phép hoặc hiện 403. `useAdminDashboard(filters)` gọi
  `GET /admin/dashboard?date_from=&date_to=&interval=day|week|month`, cache key
  `['admin','dashboard',filters]`. Mặc định từ đầu tháng đến hôm nay; mốc lịch dùng `Asia/Ho_Chi_Minh`.
- **“Điều hành hôm nay”:** `manual_refunds` tạo cảnh báo hoàn tiền; `operations` và `orders` tạo các hàng đợi xác nhận,
  PayOS chờ, processing, shipped, delivery failed, COD đến hạn, payment exception; `pending_reviews` tạo hàng chờ duyệt.
  FE cộng các count này thành `needsAttention` để hiện tổng “việc”, rồi deep-link sang URL đã gắn filter. Count gốc do
  BE trả, FE chỉ cộng để trình bày.
- **“Kết quả trong kỳ”:** `net_collected_cash` là tiền đã thu theo `paid_at` trừ tiền hoàn đã thực chuyển theo
  `completed_at`; đây là cash vận hành, không phải doanh thu kế toán. `orders_delivered` và `units_sold` dùng cohort
  giao thành công. Chỉ `avgOrderValue = delivered_sales_value / orders_delivered` được FE tính; mẫu số 0 thì trả 0.
- **“Bán chạy nhất”:** BE lấy item của đơn `delivered` trong kỳ, nhóm theo product, cộng `quantity`, sắp
  `units_sold` giảm dần. FE lấy tối đa 5 dòng đầu và render “N đã giao”.
- **“Bán ít nhất”:** BE bắt đầu từ tất cả product `active`, ghép lượng đã giao trong kỳ (không có thì 0), sắp
  `units_sold` tăng dần rồi tên tăng dần, lấy 5. Vì vậy danh sách có thể chứa sản phẩm chưa bán được.
- **“Bán ổn định nhất” (ảnh đính kèm):** BE chỉ xét item thuộc đơn `delivered` có `delivered_at` trong kỳ. Mỗi lần
  giao được quy về ngày đầu tuần theo múi giờ Việt Nam; với mỗi product, server đếm **số tuần khác nhau có phát sinh
  giao hàng** thành `active_weeks`. Sau đó sắp `active_weeks` giảm dần, phá hoà bằng `units_sold` giảm dần và lấy 5.
  FE không tính/xếp lại, chỉ render `${active_weeks} tuần · ${units_sold} bán`. Do đó “1 tuần · 4 bán” nghĩa là sản
  phẩm có giao hàng trong một tuần phân biệt của kỳ và tổng cộng bốn đơn vị đã giao; không có nghĩa bán liên tục bốn tuần.
- **Chiến dịch/khách:** `vouchers_most_used` xếp voucher theo số đơn hợp lệ; `vouchers_least_used` bao gồm voucher
  active chưa dùng; `top_customers` xếp theo tổng giá trị đơn delivered. Tất cả do BE scope theo kỳ và trả tối đa 5.
- **Đối soát:** bảng tiền dùng `finance`; series được FE sort tăng dần theo `period`. COD chỉ vào cash collected sau
  khi thu đủ; `current_refund_obligation` là snapshot hiện tại nên không phụ thuộc khoảng lọc.
- **Trạng thái:** loading spinner, `LoadErrorState` có retry, `isFetching` báo đang cập nhật. Đổi preset/ngày/interval
  làm query key đổi và refetch; FE không tự sửa dữ liệu dashboard.

#### `/admin/employees`

- **UI:** tìm kiếm/lọc staff, tạo tài khoản, gán role và xem trạng thái.
- **Nguồn:** `GET /admin/users` với filter staff, `POST /admin/users`, `GET /admin/roles`,
  `PATCH /admin/users/{id}/roles`.
- **Logic:** FE chỉ ẩn/disable theo permission; BE ngăn escalation trái quyền và validate role IDs.

#### `/admin/customers`

- **UI:** bảng khách, drawer chi tiết, khoá/mở, cấp voucher và thăng thành staff.
- **Nguồn:** `GET /admin/users` với filter customer; status/roles qua admin users API; voucher dùng
  `GET /admin/vouchers/assignable` và `POST /admin/vouchers/{id}/grant`.
- **Logic:** grant/thăng/khóa đều là mutation server và invalidate user liên quan; không sửa role/status chỉ ở client.

#### `/admin/roles`

- **UI:** CRUD role, permission matrix và preview giao diện theo role.
- **Nguồn:** `GET /admin/permissions`, `GET /admin/roles`, `POST/PATCH/DELETE /admin/roles`.
- **Logic:** preview dùng effective user để kiểm tra presentation, không cấp quyền thật. BE vẫn chặn role hệ thống,
  permission không hợp lệ và mọi request trái quyền.

#### `/admin/audit-logs`

- **UI:** bảng audit, phân trang, filter action và diff old/new values, nhấn mạnh `access.denied`.
- **Nguồn:** `GET /admin/audit-logs?page=&action=`.
- **Logic:** chỉ đọc; FE format/diff payload do BE ghi. Audit record không được tạo hoặc sửa từ trang này.

#### `/admin/vouchers`

- **UI:** bảng/phân trang và form CRUD voucher: loại, giá trị, khoảng hiệu lực, quota, min order, max discount.
- **Nguồn:** `GET/POST /admin/vouchers`, `PATCH/DELETE /admin/vouchers/{id}`.
- **Logic:** FE validate hình thức; BE kiểm tra hiệu lực, quota/usage và không cho client tự quyết voucher đã consume.
  Đây là trang được chuyển từ Tấn sang Phước; các màn cart/checkout của Tấn chỉ tiêu thụ contract công khai.

#### `/admin/reviews`

- **UI:** hàng chờ review, moderation flags, bằng chứng mua/giao và nút duyệt/từ chối.
- **Nguồn:** `GET /admin/reviews?cursor=`, `PATCH /admin/reviews/{id}/approve|reject`.
- **Logic:** chỉ pending review xuất hiện trong queue; server quyết định transition và ghi audit. Thành công hiện chỉ
  gỡ review vừa xử lý khỏi cache `['admin','reviews']`; public product reviews và dashboard pending count sẽ nhận dữ
  liệu mới ở lần refetch tiếp theo, không được hook này cập nhật ngay.

#### `/shipping`, `/returns`, `/privacy`, `/contact`

- **UI:** chính sách/hướng dẫn và kênh liên hệ thực tế.
- **Nguồn:** `SupportPages.jsx`, hoàn toàn tĩnh, không có request server.
- **Logic:** không bịa phí/thời gian giao; sau nhận hàng chưa có form return tự phục vụ, khách dùng kênh liên hệ được
  công bố. Điều kiện huỷ/return thật vẫn đọc từ order state machine.

#### `*` — Không tìm thấy

- **UI:** thông báo route không tồn tại và lối quay lại khu vực an toàn.
- **Nguồn:** component tĩnh `NotFoundPage`, không gọi API.

## 7. Route phụ, route ẩn và redirect

| Route | Trạng thái | Người xử lý khi cần |
|---|---|---|
| `/admin/collections` | Route còn tồn tại nhưng không ở sidebar/luồng hiện hành. | Công bảo trì; không tính vào đầu mục chính. |
| `/admin/inventory` | Route còn tồn tại nhưng không ở sidebar/Dashboard. | Công bảo trì; không tính vào đầu mục chính. |
| `/admin/returns` | Redirect sang `/admin/orders`. | Tấn; không tính là trang riêng. |
| `/admin/users` | Redirect sang `/admin/employees`. | Phước; không tính là trang riêng. |
| `/admin/register` | Redirect sang `/admin/login`. | Phước; không tính là trang riêng. |
| `/__dev/r2-model` | Chỉ có trong môi trường development. | Công phối hợp Vinh khi chẩn đoán model; không dùng để demo. |

Ẩn khỏi menu không đồng nghĩa route bị vô hiệu hoá. Nếu cần tắt hoàn toàn `/admin/collections` hoặc
`/admin/inventory`, phải gỡ/redirect route hoặc thêm feature gate.

## 8. Quy tắc phối hợp theo trang

1. Chủ trang chịu trách nhiệm kết quả cuối cùng của route: UI, loading, empty, error, permission, responsive và test.
2. Người sở hữu hook/component được nhúng phải phối hợp với chủ trang; thay đổi bố cục cần chủ trang review.
3. `ProductPage`: Công chủ trang; Tấn phụ trách các thao tác cart/wishlist/review được nhúng.
4. `CheckoutPage`: Tấn chủ trang; Vinh phụ trách address hook/modal được nhúng.
5. `AccountPage`: Vinh chủ trang; Tấn cung cấp dữ liệu tóm tắt đơn và voucher.
6. `AdminHome`: Phước chủ trang; Công/Tấn giải thích và kiểm tra số liệu thuộc phần mình.
7. `/admin/vouchers` và `/admin/reviews`: Phước chủ trang; Tấn bàn giao contract, cache key và test liên quan trước
   khi thay đổi lớn.
8. Thay đổi `app/router.jsx`, shared store, `apiClient` hoặc shared UI phải báo Phước và các chủ trang bị ảnh hưởng.

## 9. Phạm vi dùng khi học và phản biện

Mỗi thành viên chuẩn bị theo đúng danh sách trang của mình: actor/gate, route entry, page/component chính, hook/API,
request/response, cache/store, success side-effect, lỗi và giới hạn hiện tại. Không nhận công trạng FE cho invariant
do BE/DB bảo đảm. Tài liệu luồng chi tiết và bằng chứng code tiếp tục lấy từ `FE-TEAM-WORKFLOW.md` và
`CURRENT-STATE-MECHANISMS.md`.
