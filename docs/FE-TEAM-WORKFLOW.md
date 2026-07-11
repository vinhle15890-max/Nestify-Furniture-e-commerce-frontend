# FE — Workflow các chức năng & phân công nhóm (tài liệu học & phản biện)

> **Mục đích:** 1 tài liệu duy nhất mô tả **luồng end-to-end phía Frontend** của từng chức năng để
> teammate đọc, hiểu hệ thống, **phản biện** (trả lời câu hỏi hội đồng), đồng thời **chia việc cho 4 FE**.
> **Cách đọc mỗi mục:** *Actor → Entry (route/page) → Luồng qua các tầng (page → hooks → api → apiClient) →
> Side-effect (cache/store/toast) → Lỗi → **Điểm phản biện*** (vì sao thiết kế thế, câu hỏi hay bị hỏi).
> **Last updated:** 2026-07-10 · **See also:** `AGENTS.md` (convention + stack), `docs/TASKS.md` (bảng việc theo phase),
> `docs/superpowers/specs/2026-06-13-fe-nestify-design.md` (spec thiết kế + hợp đồng FE/BE),
> BE `docs/14-workflows.md` (luồng phía server — đối chiếu hợp đồng).

---

## 0. Kiến trúc & cách 1 request chạy

4 tầng, mỗi tầng 1 trách nhiệm — **page luôn "mỏng"**:

```
pages/<domain>/        ← màn hình: chỉ compose UI + state cục bộ, KHÔNG gọi apiClient trực tiếp
   │ dùng
   ▼
features/<domain>/hooks.js   ← TanStack Query (useQuery/useMutation): cache, invalidation, loading/error
   │ gọi
   ▼
features/<domain>/api.js     ← hàm axios thuần cho domain đó
   │ qua
   ▼
lib/apiClient.js (axios)     ← gắn Bearer token, base URL = VITE_API_BASE_URL, chuẩn hoá lỗi → ApiError
   │
   ▼
Laravel API (api.nestify.asia)
```

- **Server state** → TanStack Query (`queryKey` theo domain). **Auth** → `authStore` (Zustand + persist key `nestify-auth`).
  **UI tạm** (drawer giỏ, nav, toast) → `uiStore`/`toastStore` (không persist). **Chat** → `chatStore` (chỉ trong phiên).
- **Lỗi:** mọi lỗi API nổi lên dưới dạng `ApiError` (`lib/errors.js`) có `code`, `message` (đã tiếng Việt — show thẳng
  trong toast), `details`. Không bao giờ show lỗi axios thô.
- **Phân vùng route:** storefront công khai / sau `ProtectedRoute`; admin sau `AdminRoute` (gate bằng `isStaff`).

> **Phản biện — vì sao tách `api.js`/`hooks.js` khỏi page?** Tách concern → page dễ test, hooks tái dùng, đổi endpoint
> không đụng UI. **TanStack Query thay cho `useEffect`+`fetch`:** có cache, dedupe request, tự quản loading/error,
> invalidation sau mutation → không tự đồng bộ state thủ công.

---

## 1. Tài khoản & xác thực

**Actor:** Guest → Customer. **Entry:** `pages/auth/*` (`/login`, `/register`, `/forgot-password`, `/reset-password`,
`/verify-email`), `pages/account/*`. **Feature:** `features/auth`, `features/addresses`.

- **Đăng nhập:** `LoginPage` → `useLogin` → lưu `{token, user(+roles)}` vào `authStore` (persist). Token gắn vào mọi
  request qua interceptor của `apiClient`.
- **Đăng ký → verify email:** sau đăng ký, tài khoản **chưa verify**; route cần xác thực bị chặn → màn "xác thực email".
- **Account & sổ địa chỉ:** CRUD địa chỉ + đặt mặc định (`features/addresses`); đổi mật khẩu cần `current_password`.
- **Side-effect:** login/logout đổi `authStore` → `Header`, route guard, nút mua re-render ngay.
- **Lỗi:** `401` (sai/đăng nhập lại) vs `403 ACCOUNT_INACTIVE` (khoá) — phân biệt khi hiển thị; `VALIDATION_FAILED` →
  map về lỗi từng field (`lib/formErrors.js`).

> **Phản biện:** Vòng đời token nằm ở `authStore` (persist key `nestify-auth`), interceptor đọc ra gắn Bearer; logout
> xoá store. Guard 2 lớp: `ProtectedRoute` (đã đăng nhập) + `AdminRoute` (`isStaff`). Map lỗi field giúp form hiện đúng
> chỗ sai thay vì 1 toast chung.

---

## 2. Catalog (trang chủ · danh mục · breadcrumb)

**Actor:** Guest+. **Entry:** `pages/home`, `pages/catalog/CategoryPage` (`/c/:categorySlug`, `/c/all`).
**Feature:** `features/catalog`.

- **Cây danh mục:** `useCategories()` (cache `['categories']`, tải sẵn cho `CategoryNav` mega-menu nested `children`).
- **Listing:** `CategoryPage` → `useInfiniteProducts` (**cursor pagination**, "Tải thêm") + lọc `brand`/`sort`.
- **Breadcrumb (đa cấp + SEO):** `components/Breadcrumb` nhận `items`; `lib/categoryPath.findCategoryPath(tree, slug)` dò
  chuỗi tổ tiên từ cây danh mục → `Trang chủ > cha > con > SP`. Gập `…` khi > 4 cấp; phát `BreadcrumbList` JSON-LD.
  Suy biến mềm khi cây chưa tải / slug lạ → 1 cấp danh mục, không vỡ.

> **Phản biện:** (1) **Cursor vs offset:** listing dùng cursor (`useInfiniteQuery`) cho cuộn vô hạn — ổn định khi dữ liệu
> chèn/xoá; admin dùng offset (`<Pagination>`). (2) Breadcrumb phản ánh **cấu trúc danh mục** (không phải lịch sử điều
> hướng); JSON-LD luôn phát đầy đủ dù UI gập. (3) `queryKey` đổi theo filter → Query tự refetch & cache riêng từng filter.

---

## 3. Chi tiết sản phẩm & biến thể

**Actor:** Guest xem / Customer mua. **Entry:** `pages/product/ProductPage` (`/p/:productSlug`). **Feature:** `features/catalog`.

- **Chọn biến thể:** sản phẩm cũ → hàng nút phẳng theo `variant.name`. Sản phẩm có **`variant_options`** (Shopify-style) →
  `pages/product/ProductOptions`: mỗi option 1 hàng, option `color` vẽ **swatch hex thật**, `text` là nút; chọn đủ thuộc
  tính → `lib/variantOptions.resolveVariant(selected, variants, options)` ra variant; tổ hợp hết hàng/không tồn tại → disabled.
- **Giá & tồn kho** theo `selectedVariant.available_stock`; gallery ảnh/video theo `sort_order`; `description` (HTML) **sanitize
  bằng DOMPurify** trước khi render. SEO: phát **Product JSON-LD** + `<title>`/meta.
- **Gate mua hàng:** `token && isStaff(user)` → hiện thông báo "tài khoản quản trị không mua được"; chưa đăng nhập → nút
  "Đăng nhập để mua".

> **Phản biện:** (1) Vì sao `available_stock` theo **variant** điều khiển nút Add-to-cart? Tồn kho là cấp variant (SKU), không
> phải cấp product. (2) `variant_options` (định nghĩa) tách khỏi `variant.attributes` (chọn label) — khớp hợp đồng BE
> (xem BE §2 / use-cases-and-erd). (3) Sanitize mô tả: nội dung admin nhập là HTML → chặn XSS bằng allow-list DOMPurify.

---

## 4. Giỏ hàng & Voucher

**Actor:** Customer. **Entry:** `pages/cart/CartPage` + drawer giỏ (`uiStore.openCart`). **Feature:** `features/cart`.

- Thêm/sửa số lượng/xoá item; **xem trước voucher** (áp mã → BE trả `discount` preview). Item lưu theo `unit_price_snapshot`
  của BE; nếu giá đổi → hiện badge "Giá thay đổi".
- **Side-effect:** mutation thành công → invalidate `['cart']` → giỏ + badge header cập nhật; mở drawer giỏ.
- **Lỗi:** `409 INSUFFICIENT_STOCK` (kèm `available`) → chỉnh số lượng về mức còn lại; mã voucher sai/hết lượt → toast.

> **Phản biện:** Giá hiển thị minh bạch theo snapshot lúc thêm, nhưng **giá thanh toán = giá hiện tại lúc đặt** (không khoá
> giá). Chống race khi nhiều người dùng cùng voucher → BE atomic consume lúc đặt (FE chỉ preview).

---

## 5. Wishlist

**Actor:** Customer. **Entry:** `pages/wishlist/WishlistPage`. **Feature:** `features/wishlist`.

- Thêm được cả khi **hết hàng** (khác cart). **Move-to-cart** validate còn hàng trước. Toggle `notify_on_restock` (báo khi về hàng).
- **Side-effect:** invalidate `['wishlist']` (+ `['cart']` khi move-to-cart).

> **Phản biện:** Wishlist là "theo dõi lâu dài" nên cho thêm hàng hết; move-to-cart mới chặn tồn kho. Báo hàng về do BE
> phát qua Observer/Event — FE chỉ bật cờ.

---

## 6. Thanh toán (Checkout) & trang trả về

**Actor:** Customer. **Entry:** `pages/checkout/CheckoutPage` (`/checkout`), `CheckoutReturnPage` (`/checkout/return`).
**Feature:** `features/checkout`, `features/orders`.

- **Luồng:** chọn địa chỉ (mặc định trước) → voucher → **phương thức** `cod` | `payos` → tạo đơn (`useCreateOrder`) → nếu
  `payos`: tạo phiên thanh toán → **redirect** sang cổng PayOS; nếu `cod`: đơn `processing` ngay.
- **Idempotency:** mỗi lần checkout gắn **Idempotency-Key** (`lib/idempotency.js`) → bấm 2 lần / mạng chập không tạo đơn trùng.
- **Trang trả về `/checkout/return`:** poll trạng thái đơn; có lớp **reconcile** (đối chiếu) khi webhook PayOS đến trễ.
- **Gate staff:** staff vào `/checkout` → `CheckoutNotice` (không mua được).
- **Lỗi:** `409 INSUFFICIENT_STOCK`, `409 ORDER_ALREADY_PAID`, `429 RATE_LIMITED` → thông báo & điều hướng phù hợp.

> **Phản biện:** (1) **Idempotency-Key** là điểm chí mạng phía FE — chống double-submit. (2) Trang return poll + reconcile vì
> webhook là nguồn sự thật nhưng có thể trễ → tránh kẹt "pending_payment" giả. (3) COD vs PayOS: COD xác nhận đơn ngay,
> PayOS giữ chỗ kho tới khi trả tiền (khớp BE §4–§5).

---

## 7. Đơn hàng (lịch sử & chi tiết)

**Actor:** Customer. **Entry:** `pages/orders/OrdersPage` (`/orders`), `OrderDetailPage` (`/orders/:id`). **Feature:** `features/orders`.

- Danh sách đơn (**offset pagination**, mới nhất trước); chi tiết đọc từ **`variant_snapshot`** (bất biến) + địa chỉ snapshot +
  lịch sử thanh toán. **Hủy / Thanh toán lại** chỉ khi `pending_payment`.

> **Phản biện:** Chi tiết đơn đọc snapshot (không join lại variant) → đơn cũ không sai khi shop đổi giá/xoá variant. Nút
> hành động render theo trạng thái (state machine) — chỉ hiện bước hợp lệ.

---

## 8. Đánh giá (Review)

**Actor:** Customer (đã mua). **Entry:** form ở `ProductPage` (`/p/:slug`). **Feature:** `features/reviews`.

- Chỉ user **đã mua** mới thấy form (verified purchase, 1 review/sản phẩm); comment trả lời 1 cấp. Review `approved` mới hiện public.

> **Phản biện:** Form review nằm ở `/p/:slug` **không** ở `/orders/:id` vì `variant_snapshot` của đơn không mang `product_id`
> (xem deviation Phase 5 trong `TASKS.md`) — cần `product` để gắn review.

---

## 9. AI Chatbot (RAG) — phía FE

**Actor:** Customer verified. **Entry:** floating bubble `ChatWidget`/`ChatPanel`. **Feature:** `features/chat`, `store/chatStore`.

- Chỉ hiện cho user **verified**; gửi câu hỏi → BE trả `reply` + `sources` (có `product_slug` → FE link `/p/:slug`). Lịch sử giữ
  trong `chatStore` (**chỉ trong phiên**, không persist).
- **Lỗi:** `429 AI_TOKEN_BUDGET_EXCEEDED` (hết hạn mức) · `503` (Gemini lỗi) → thông báo nhẹ, không phá UI.

> **Phản biện:** BE **stateless** (mỗi câu độc lập) → FE giữ ngữ cảnh hiển thị trong phiên; nguồn trả lời kèm link sản phẩm
> là điểm tin cậy (truy nguồn được).

---

## 9b. Personalization (cá nhân hoá — recently viewed & suggestions)

**Actor:** Customer (logged-in + verified only). **Entry:** `ProductPage` → ghi xem + hiện "Bạn vừa xem"; `HomePage` → `PersonalizedSection` giữa Hero và Featured Categories.

**Feature structure:** `src/features/personalization/`:
- `api.js` — `recordProductView(slug)` (fire-and-forget POST), `getRecentlyViewed(limit=10)` (GET).
- `hooks.js` — `useRecordProductView()` (mutation, không await), `useRecentlyViewed({ enabled, limit })`  (query, enabled chỉ khi logged-in).
- `recommend.js` — `topCategorySlug(recentlyViewed)` (logic JS thuần: tìm danh mục xuất hiện nhiều nhất trong recently-viewed).

**Components under `src/components/personalization/`:**
- `PersonalizedGreeting` — "Chào [tên], hôm nay có gì mới?" (chỉ logged-in customer).
- `RecentlyViewedStrip` — cuộn ngang recently-viewed, exclude current product (ở ProductPage), auto-hide nếu rỗng.
- `SuggestedForYou` — top 5 products từ category được gợi ý (via `topCategorySlug`), fetch qua `GET /products?filter[category]=...`, auto-hide nếu rỗng.
- `PersonalizedSection` — **composition root** — gate `token && !isStaff(user)` (logged-in customers only), wrap PersonalizedGreeting + RecentlyViewedStrip + SuggestedForYou, render ở HomePage.

**Luồng:**
1. **ProductPage:** on mount → call `useRecordProductView()` (không await) → ghi event. Hiển thị `RecentlyViewedStrip` (nếu logged-in customer, exclude current product).
2. **HomePage:** render `PersonalizedSection` giữa Hero + FeaturedCategories → gate `isCustomer = Boolean(token) && !isStaff(user)` (logged-in customer, loại staff/admin) → gọi `useRecentlyViewed({ enabled: isCustomer })` → gợi ý danh mục top via `topCategorySlug()`.
3. **Visibility:** admin/staff xem storefront → `PersonalizedSection` invisible (`render null`); guest → `render null`. Chỉ **customer** (đã verify) thấy.

**Side-effect & Lỗi:**
- `recordProductView` fail (404/network) → **silent** (fire-and-forget, không toast).
- `useRecentlyViewed` rỗng → `RecentlyViewedStrip` / `SuggestedForYou` auto-hide (không hiện empty state).
- `topCategorySlug` fallback → category đầu tiên của tree (hoặc "all") khi không có recently-viewed.

> **Phản biện:** (1) Fire-and-forget `recordProductView` → không chậm page load; silent fail chống nát UX. (2) Gate `token && !isStaff(user)` → customer-only surfaces; admin xem storefront vẫn nhìn catalog bình thường. (3) `RecentlyViewedStrip` exclude current product → tránh "sản phẩm đang xem" xuất hiện lại. (4) `topCategorySlug` là logic JS không gọi API → tái dùng danh sách recently-viewed đã fetch, không thêm request. (5) Auto-hide empty → UX sạch, không phải xử lý null-check ở page.

---

## 10a. Khóa/Mở-khóa người dùng (admin)

`LockUserButton` (`pages/admin/users/LockUserButton.jsx`) xuất hiện ở ba điểm trong khu vực admin:
- **Bảng Nhân viên** (`AdminEmployeesPage`) — một nút cuối mỗi hàng, cạnh nút "Phân quyền".
- **Bảng Khách hàng** (`AdminCustomersPage`) — một nút cuối mỗi hàng, cạnh nút "Chi tiết".
- **Footer drawer chi tiết khách hàng** (`CustomerDetailDrawer`) — bên dưới nút "Thăng thành nhân viên".

**Luồng:** Admin nhấn nút → `Modal` xác nhận hiện ra (mô tả hệ quả) → nhấn "Xác nhận khóa" / "Xác nhận mở khóa" → gọi `PATCH /admin/users/{id}/status` qua `useUpdateUserStatus` → toast thành công + invalidate cache `['admin', 'users']`. Người dùng bị khóa bị đăng xuất ngay phía backend.

**Tự ẩn:** nút render `null` khi `user.id === authStore.user.id` (admin không tự khóa mình); trong môi trường test `authStore.user = null` nên nút luôn hiện.

**Badge trạng thái:** status `archived` hiển thị "Đã khóa" (không còn "Đã lưu trữ") ở cả ba bề mặt trên.

> **Phản biện:** Gate UX tự ẩn trên hàng mình tránh nhầm lẫn; BE cũng chặn tự-đổi-status là lớp bảo vệ thứ hai. `Modal` xác nhận bắt buộc để tránh click nhầm trên danh sách dài.

---

## 10. Khu vực Admin (back-office)

**Actor:** Staff (role ≠ customer). **Entry:** `/admin/*` sau `AdminRoute`. **Feature:** `features/admin/*`, `pages/admin/*`.

- **Catalog:** products (CRUD), **variants** (modal) + **biến thể theo tùy chọn** (`VariantOptionsPanel` định nghĩa option +
  `VariantMatrixGenerator` sinh ma trận qua endpoint bulk), ảnh SP chọn từ **Thư viện ảnh** (picker) + **reorder** payload `{ids:[...]}` + gắn/**gỡ** theo biến thể.
- **Thư viện ảnh (Media Library):** `/admin/media` + `features/admin/media/` — ảnh dùng lại được (upload 1 lần, dùng nhiều nơi); `MediaLibraryModal` dùng chung cho form SP + form danh mục; xoá bị chặn khi còn dùng (`409`). Chi tiết code-path: BE `14-workflows.md` §10d.
- **Orders:** list + đổi trạng thái (**state machine**, chỉ bước hợp lệ) + **refund đồng bộ**.
- **Voucher** CRUD; **Review moderation** approve/reject; **Users** (list + gán role qua `AssignRolesDialog`);
  **Vai trò** (`/admin/roles`, RBAC Sub-project 2 — tạo/sửa/xoá role custom + tick ma trận permission; Sub-project 3
  thêm toggle **view Ma trận** read-only; Sub-project 5 thêm nút **"Xem thử vai trò"** mô phỏng nav/route-gate
  của role khác thuần phía client, xem chi tiết bên dưới); **Audit logs** (RBAC Sub-project 4 thêm lọc
  theo hành động + nhãn tiếng Việt + tô nổi bật dòng truy cập bị chặn, xem chi tiết bên dưới); **Dashboard** thống kê.

> **Phản biện:** (1) Trang admin detail **hydrate từ cache** (BE không có `GET /admin/products/{id}` lúc đầu → seed từ list/router
> state, fallback fetch). (2) Reorder media là `{ids:[...]}` (không phải `media_order`); voucher đọc `meta.last_page` phẳng
> (deviation Phase 8–9 trong `TASKS.md`). (3) Gate admin = `isStaff` (role ≠ customer); chỉ customer mới mua được hàng.

---

### 10a-i. Quản lý role động (RBAC Sub-project 2)

**Actor:** Staff có `manage_users`. **Entry:** mục nav "Vai trò" (nhóm "Nhân sự") → `/admin/roles`, gate
`RequirePermission slug="manage_users"` (giống SP1). **Feature:** `features/admin/roles/{api,hooks}.js` +
`pages/admin/roles/{AdminRolesPage,RoleFormDialog}.jsx`.

- **`AdminRolesPage`:** bảng role (`useRoles` — tái dùng hook `features/admin/users`, giờ trả kèm
  `permissions`/`users_count`/`locked`) — tên hiển thị + `name` (mã), số permission, số nhân viên đang giữ,
  badge **"Hệ thống"** khi `locked`. Nút "Tạo vai trò" mở `RoleFormDialog` (tạo mới); mỗi hàng có nút Sửa
  (mở dialog ở chế độ sửa) và Xoá (ẩn hoàn toàn nếu `locked`).
- **`RoleFormDialog`:** input Tên hiển thị + ma trận checkbox permission (`usePermissions` →
  `GET /admin/permissions`, nhãn tiếng Việt qua `PERMISSION_LABELS` của `adminNav.js` từ SP1, fallback
  `display_name` BE). `locked` → toàn bộ field disabled, không có nút Lưu, chỉ ghi chú "Toàn quyền (bypass)"
  (super_admin) hoặc "Vai trò hệ thống, không thể chỉnh sửa" (customer). Lưu gọi `useCreateRole`/`useUpdateRole`
  (`display_name` + `permissions: string[]`) — invalidate `['admin','roles']` khi thành công.
- **Xoá:** confirm `Modal`; nếu BE trả `409 ROLE_IN_USE` → toast đọc `err.details.users_count`
  ("Còn {N} nhân viên giữ vai trò này, hãy gỡ trước khi xoá"), không đóng dialog kiểu lỗi chung chung.

> **Phản biện:** Vì sao FE không tự chặn xoá role đang dùng trước khi gọi API (chặn optimistic)? BE là nguồn
> chân lý duy nhất cho `users_count` tại thời điểm xoá (tránh lệch cache) — FE để BE trả 409 rồi hiển thị
> đúng số liệu mới nhất. `locked` là cờ suy ra từ BE (`name` server-side), FE chỉ hiển thị, không tự đoán.

---

### 10a-ii. Ma trận Role × Permission (RBAC Sub-project 3)

**Actor:** Staff có `manage_users` (cùng gate SP2). **Entry:** `AdminRolesPage` thêm toggle **"Bảng | Ma
trận"** (state local, không route/nav mới). **Feature:** `pages/admin/roles/RolePermissionMatrix.jsx` — **thuần
FE, không có API mới, không đổi BE contract.**

- **Dữ liệu:** tái dùng nguyên `useRoles` (từ `features/admin/users/hooks`, đã trả kèm `permissions`) làm
  hàng và `usePermissions` (từ `features/admin/roles/hooks`, `GET /admin/permissions`) làm cột — zero
  network call mới so với view Bảng.
- **`RolePermissionMatrix`:** lưới **chỉ đọc** (read-only), ẩn role `customer` khỏi hàng. Ô "có quyền" hiện
  icon Check (`role="img"` + `aria-label` để accessible, không chỉ là màu). Hàng `super_admin` có ghi chú
  **"Toàn quyền (bypass)"** thay vì tick từng cột (đúng ngữ nghĩa bypass ở BE).
  Nút Sửa/Xem trên mỗi hàng vẫn mở `RoleFormDialog` của SP2 (locked → read-only) — ma trận **không tự ghi**,
  toàn bộ luồng sửa đi qua path ghi có sẵn của SP2.
- **`AdminRolesPage`:** toggle chuyển đổi giữa view Bảng (SP2, mặc định) và view Ma trận; không thêm route,
  không thêm mục nav.

> **Phản biện:** Vì sao ma trận không tự viết trực tiếp qua ô? Giữ đúng nguyên tắc SP2 — mọi ghi permission
> đi qua `RoleFormDialog` (1 con đường ghi duy nhất, dễ audit); ma trận chỉ là **view khác của cùng dữ liệu**
> để nhìn tổng quan nhanh hơn bảng liệt kê theo hàng.

---

### 10a-iii. Nhật ký: lọc theo hành động + tô nổi bật truy cập bị chặn (RBAC Sub-project 4)

**Actor:** Staff có `view_audit`. **Entry:** `/admin/audit-logs` (không đổi route/nav). **Feature:**
`features/admin/auditLogs/{api,hooks,actionLabels}.js` + `pages/admin/auditLogs/AdminAuditLogsPage.jsx`.
Cross-repo với BE §12c/§14 (`14-workflows.md`): BE `CheckPermission` middleware giờ **ghi 1 `AuditLog`
action `access.denied`** mỗi khi user đã đăng nhập bị chặn 403 vì thiếu quyền; FE hiển thị các dòng này
rõ ràng hơn thay vì lẫn vào slug thô.

- **`actionLabels.js`** (mới): `AUDIT_ACTION_LABELS` (object slug → nhãn tiếng Việt, gồm `access.denied`,
  `order.cancel`, `order.status_transition`, `payment.refund`, `user.assign_roles`, `user.lock`,
  `user.unlock`, `role.create`, `role.update`, `role.delete`) + `labelForAction(action)` — trả nhãn nếu có,
  **fallback về slug thô** nếu BE thêm action mới mà FE chưa map (không vỡ UI).
- **`api.js`/`hooks.js`:** `getAuditLogs(page, action = '')` gửi `params: { page, action: action || undefined }`
  (chuỗi rỗng không gửi lên); `useAdminAuditLogs(page, action = '')` đưa `action` vào `queryKey` để cache
  tách theo filter.
- **`AdminAuditLogsPage`:** thêm `<select aria-label="Lọc theo hành động">` — "Tất cả hành động" + 1 option
  cho mỗi entry của `AUDIT_ACTION_LABELS`; đổi filter → `setAction` + reset `page` về 1. Cột "Hành động"
  hiển thị `labelForAction(log.action)` thay vì slug thô. Dòng có `log.action === 'access.denied'` được tô
  **nền `bg-destructive/5`** + thêm **badge đỏ "Bị chặn"** cạnh nhãn hành động; ô "Chi tiết" (`new_values`)
  giữ nguyên cơ chế `<details>`/`<pre>` sẵn có — không cần đổi gì vì BE đã trả `{permission, method, path}`
  trong `new_values` cho các dòng này.
- **Không đổi:** `AuditLogResource`, route, endpoint — chỉ query string `?action=` mới, đã có sẵn ở BE.

> **Phản biện:** Vì sao dropdown lọc chỉ liệt kê action có trong `AUDIT_ACTION_LABELS` (không phải toàn bộ
> action đang tồn tại trong DB)? Tránh gọi thêm 1 API "danh sách action distinct" chỉ để build dropdown —
> danh sách action đã biết là đủ cho nhu cầu lọc hiện tại; action lạ vẫn xem được (không lọc được) qua
> fallback hiển thị. Vì sao tô nền cả dòng thay vì chỉ đổi màu chữ? Badge màu đơn độc dễ bị bỏ sót khi lướt
> nhanh bảng nhiều dòng — nền tô nhẹ cả hàng giúp mắt bắt được ngay dòng "bị chặn" mà không cần đọc từng ô.

---

### 10a-iv. "Xem với vai trò" — role preview (RBAC Sub-project 5, HẾT roadmap)

**Actor:** Staff có `manage_users` (cùng gate nút Sửa/Xoá ở `/admin/roles`). **Entry:** icon "Eye" trên mỗi
hàng bảng vai trò → xem thử ngay, không route/nav mới. **Feature:** `store/previewStore.js` (mới) — **thuần
FE, không đổi BE contract, BE hoàn toàn không biết preview đang chạy** (mọi thao tác ghi vẫn bị BE chặn
theo quyền THẬT của tài khoản đăng nhập — preview chỉ đổi những gì FE tự vẽ ra: nav + route-gate, không đổi
token/quyền thật).

- **`previewStore.js`:** Zustand store **không `persist`** (luôn reset khi reload) — state `{ previewRole }` +
  action `setPreviewRole(role)` / `clearPreview()`. Kèm hook tổ hợp **`useEffectiveUser()`**: đọc
  `authStore.user` (thật) + `previewStore.previewRole`; nếu đang preview, trả về `{...user, permissions:
  previewRole.permissions ?? []}` (permissions bị tráo, mọi field khác — id/name/email — giữ nguyên); không
  preview → trả `user` thật y nguyên.
- **Nơi tiêu thụ `useEffectiveUser()` (thay vì đọc `authStore` trực tiếp)** — 3 chỗ, để nav/route-gate phản
  ánh đúng vai trò đang xem thử:
  - `routes/RequirePermission.jsx` — `can`/`canAny` chạy trên effective user, nên route-gate 403 khớp với
    vai trò đang preview.
  - `pages/admin/AdminHome.jsx` — logic redirect/403 ở index `/admin` cũng dùng effective user.
  - `pages/admin/PermissionDenied.jsx` — danh sách "các mục bạn có thể vào" ở trang 403 liệt kê theo effective
    user, tức đúng những mục vai trò đang xem thử có thể vào, không phải của admin thật.
- **`AdminLayout.jsx`:** sidebar (`visibleGroups`) đọc **effective user** (đổi theo preview); `UserMenu`
  (tên/email góc dưới) vẫn đọc `authStore.user` **thật** — danh tính không bao giờ đổi, chỉ nav hiển thị đổi.
  Khi `previewRole` khác `null`, render `PreviewBanner` — thanh nền `bg-accent/10` nằm **ngoài `<Outlet/>`**
  (tức ngoài `RequirePermission`), đọc "Đang xem thử giao diện như vai trò {display_name} — quyền thao tác
  thật vẫn theo tài khoản của bạn" + nút "Thoát xem thử" (icon X) luôn bấm được bất kể vai trò đang xem thử
  có quyền gì (vì nằm ngoài route-gate) — bấm gọi `clearPreview()` rồi `navigate('/admin')`.
- **`AdminRolesPage.jsx`:** thêm icon nút "Eye" (`aria-label="Xem thử vai trò {display_name}"`) ở **view
  Bảng** mỗi hàng, cạnh Sửa/Xoá — **không thêm ở view Ma trận** (giữ đúng quyết định SP3: ma trận chỉ đọc,
  không thêm hành động mới). Ẩn hẳn với hàng `customer` (không phải vai trò quản trị, xem thử vô nghĩa).
  Bấm → `setPreviewRole(role)` rồi `navigate(firstAllowedPath({ permissions: role.permissions ?? [] }) ??
  '/admin')` — điều hướng thẳng tới mục đầu tiên vai trò đó xem được, tránh admin đứng lại ở trang chính họ
  (vai trò thật) xem được nhưng vai trò đang preview thì không.

> **Phản biện:** Vì sao preview không gọi BE (vd. đổi role tạm thời trên server) mà chỉ tráo `permissions`
> phía client? Preview là công cụ UX cho admin "nhìn thử", không phải đổi quyền thật — nếu chạm BE sẽ có rủi
> ro thật sự thay đổi quyền của chính tài khoản đang đăng nhập (và cần rollback khi thoát/crash/đóng tab).
> Giữ 100% client-side + không `persist` nghĩa là reload trang = tự thoát preview, không cần cơ chế dọn dẹp
> nào khác. Vì sao banner nằm ngoài `<Outlet/>`/`RequirePermission`? Nếu nằm trong, một preview quá hẹp
> quyền (vd. vai trò không có mục nào) có thể tự chặn luôn nút "Thoát xem thử" của chính nó — banner phải
> luôn thoát được bất kể đang giả lập vai trò gì.

---

## 10b. Thiết kế phòng 3D (Room Planner) — chức năng nâng cao

**Actor:** Customer (đã đăng nhập). **Entry:** link header "Thiết kế phòng 3D" → `/room-planner` (tạo mới) và
`/room-planner/:id` (mở scene đã lưu), **sau `ProtectedRoute`**, route **top-level đứng riêng** (KHÔNG nằm trong storefront
`Layout` → toàn màn hình, không Header/Footer). **Feature:** `features/roomPlanner`, `pages/roomPlanner/*`.

- **Luồng tầng:** `RoomPlannerPage` điều phối → `useEditorStore` (Zustand) giữ `room` (rộng/sâu/cao, **đơn vị mét**) + `items`
  (mỗi item: `variant` + `position/rotation/scale`) + `selectedId` + `gizmoMode` + `dirty/status`. Canvas 3D ở
  `scene/RoomCanvas` render bằng **R3F (`@react-three/fiber` v8) + drei v9** (sàn/tường/lưới, OrbitControls xoay-zoom,
  TransformControls di chuyển/xoay/phóng to). `CatalogTray` dùng `useInfiniteProducts` rồi lọc qua **`toPlaceableItems`**
  (chỉ giữ variant có `model_3d_url`). Lưu → `useCreateScene`/`useUpdateScene` → `POST`/`PATCH /room-scenes`.
- **Map dữ liệu:** `mappers.js` — `sceneToEditorState` (resource BE → state editor) ⇄ `editorStateToPayload` (state →
  payload). `RoomSceneItemResource` **không** trả name/price/thumbnail của variant → fallback về `sku`.
- **Hiệu ứng phụ:** lần lưu đầu chuyển hướng `/room-planner` → `/room-planner/:id` (replace). Có **`beforeunload`** + chặn lúc
  "Thoát" khi còn `dirty` (cảnh báo mất thay đổi). Màn hình nhỏ (<lg) được chặn bằng `matchMedia` trước khi setup,
  scene/product preload, shortcut hay Canvas mount; `SmallScreenNotice` cho sao chép URL đầy đủ (scene/deep-link/UTM/hash)
  để tiếp tục trên desktop, có fallback thủ công và không tuyên bố các thay đổi chưa lưu đã đồng bộ.
- **Đã loại khỏi MVP (BE có sẵn, FE chưa nối):** danh sách scene, chia sẻ (`/share`), chuyển scene → đơn (`convert-to-order`).

> **Phản biện:** (1) **three.js lazy-load** (chunk riêng ~960 kB) — không phình bundle khởi đầu, chỉ tải khi vào planner.
> (2) **Đơn vị mét** theo chuẩn glTF → khớp tỉ lệ model `.glb` thật. (3) **PATCH thay toàn bộ items** (xoá + tạo lại) → lưu
> idempotent, state editor là nguồn sự thật, không cần diff từng item. (4) **WebGL không unit-test** (jsdom không render canvas)
> → thay vào đó test **logic thuần** (`threeD`/`mappers`/`editorStore`) + test component với canvas **mock**. (5) Điều kiện demo:
> variant phải có **`model_3d_url` (.glb) thật** mới hiện trong khay — seed hiện chưa có model nên khay rỗng tới khi gắn model.

---

## 10c. Form sản phẩm admin — cấu trúc tab & slug tự động

Cả trang tạo (`AdminProductCreatePage`) và trang sửa (`AdminProductEditPage`) dùng chung lớp tab bốn tab được xây trên
`components/admin/Tabs.jsx` (Radix Tabs, roving-tabindex, force-mount để giữ trạng thái form xuyên tab):

**Cấu trúc tab:** `Thông tin · Biến thể · Mô tả & SEO · Hình ảnh`

- **Trang tạo:** tab `Biến thể` và `Hình ảnh` bị **disabled** ("khóa cho đến khi lưu") vì endpoint media/variant yêu cầu
  `product_id` — chỉ có sau khi tạo xong. Sau khi submit thành công, điều hướng thẳng vào trang sửa đầy đủ.
- **Trang sửa:** cả bốn tab đều hoạt động; nút Save toàn cục nằm ở thanh tiêu đề; validation highlight tab đang chứa lỗi đầu tiên.

**Slug tự động (chỉ trang tạo):**
- Khi `slugTouched === false`, `useEffect` giữ `slug` đồng bộ với `slugify(name)` (từ `lib/slugify.js`).
- Ngay khi người dùng chỉnh slug (onChange đầu tiên), cờ `slugTouched` lật sang `true` và đồng bộ dừng lại.
- Trang sửa giữ slug thủ công — không tự đồng bộ (tránh ghi đè slug đã SEO).

**Thuật ngữ:** admin dùng **"biến thể"** (tab label, toast, placeholder). Storefront dùng "phiên bản" — không đổi.

---

## 10d. Brand layer admin — minh hoạ line-art (empty state & hero)

Admin mang danh sắc nhà hàng qua 1 thành phần `components/admin/BrandIllustration.jsx` — SVG line-art
với 5 motif (`sofa`, `lamp`, `chair`, `package`, `search`), vẽ bằng `currentColor` để lấy màu từ token
(ví dụ `text-accent`). Wired vào `EmptyState` qua prop tuỳ chọn `illustration` (tên motif); khi có
thì render hình, không thì giữ icon neutral lucide. Danh sách admin rỗng dùng nó với text hành động
tiếng Việt. Dashboard revenue hero mang watermark `lamp` độ trong `text-accent/20` — **signature moment**.
Animation vào bằng `animate-rise` (`globals.css`), tự tắt nếu `prefers-reduced-motion`. Không thêm token
mới; chỉ admin (storefront không thay đổi).

---

## 11. Xuyên suốt — state, lỗi, phân trang, RBAC, token thiết kế

- **State boundary:** server → TanStack Query (cache + invalidation); auth → `authStore` (persist); UI tạm → `uiStore`/`toastStore`
  (không persist). Đừng nhét dữ liệu server vào Zustand.
- **Chuẩn hoá lỗi:** `lib/errors.js` → `ApiError{code,message,details}`; `lib/formErrors.js` map `VALIDATION_FAILED` về field.
- **Phân trang:** `lib/pagination.js` — `useCursorQuery` (cuộn vô hạn) / `useOffsetQuery` (`<Pagination>`).
- **Idempotency:** `lib/idempotency.js` (checkout). **RBAC FE:** `lib/roles.isStaff` + `ProtectedRoute`/`AdminRoute`.
- **Design token:** chỉ dùng class semantic (`bg-surface`, `text-foreground`, `border-border`…), **không hex thô**; UI tiếng Việt.

> **Phản biện:** Lằn ranh state rõ ràng tránh "2 nguồn sự thật"; chuẩn hoá lỗi 1 chỗ giúp UI luôn hiện message tiếng Việt;
> token semantic giữ nhất quán ngôn ngữ thiết kế khi đổi theme.

---

## 12. Phân công 4 FE — theo miền tính năng

Chia theo **miền** để mỗi người sở hữu một mảng *end-to-end* (api → hooks → page → test), dễ học sâu & bảo vệ phần của mình.
Điền tên vào cột "Người phụ trách". Mỗi người **phụ trách đúng các §chức năng** liệt kê dưới.

| Track | Người phụ trách | Chức năng phụ trách (mục §) | Thư mục sở hữu chính |
|---|---|---|---|
| **FE1 — Khám phá storefront** | _(tên)_ | §2 Catalog · §3 Chi tiết SP & biến thể · §9b Personalization (recently viewed & gợi ý) | `pages/{home,catalog,product}`, `features/{catalog,personalization}`, `components/{home,layout}`, `Breadcrumb`, `ProductCard` |
| **FE2 — Phễu mua hàng** | _(tên)_ | §4 Giỏ · §5 Wishlist · §6 Checkout · §7 Đơn hàng · §8 Review | `pages/{cart,wishlist,checkout,orders}`, `features/{cart,wishlist,checkout,orders,reviews}` |
| **FE3 — Tài khoản & Nền tảng** | _(tên)_ | §1 Auth/Account · §9 AI Chat · §10b Room Planner 3D · §11 Hạ tầng dùng chung | `pages/{auth,account}`, `features/{auth,addresses,chat,roomPlanner}`, `lib/`, `store/`, `routes/`, `app/router.jsx` |
| **FE4 — Quản trị & Chất lượng** | _(tên)_ | §10 Admin (gồm §10a Khóa/mở-khóa người dùng · §10c Form sản phẩm admin · §10d Brand layer) · a11y/responsive/performance · testing | `pages/admin/*`, `features/admin/*` |

> **Lưu ý nền tảng (FE3):** vì sở hữu `lib/`, `store/`, `router`, `AuthLayout` — mọi thay đổi ảnh hưởng cả nhóm → **PR review kỹ,
> báo trước nhóm**. **3D Room Planner (§10b)** đã làm **MVP** (tạo phòng + thêm/biến đổi nội thất + lưu/sửa) bằng `three` +
> `@react-three/fiber@8` + `drei@9`; phần danh sách scene / chia sẻ / chuyển-đơn còn **hoãn** — ai xong track sớm nhận mở rộng.

---

## 13. Quy trình Git / PR / Deploy

- **`dev`** = nhánh tích hợp; **Vercel deploy production (`www.nestify.asia`) build từ đây.** **`main`** = mốc cũ, không deploy.
  Không làm trực tiếp trên `main`/`dev`.
- Mỗi việc 1 nhánh từ `dev`: `feat/<domain>-<mô-tả>`, `fix/<mô-tả>`, `docs/<mô-tả>`.
- **Vòng đời task:** nhánh từ `dev` → code (TDD) → tự kiểm (lint + test + build) → push → PR (base `dev`) → 1 đồng đội review →
  **chủ project merge** → Vercel build & deploy. Chỉ chủ project merge vào `dev` (cổng chất lượng + xử lý conflict).

**Checklist BẮT BUỘC trước PR:** `npm run lint` (0 lỗi) · `npm test -- --run` (pass) · `npm run build` (thành công) ·
không thêm `.ts/.tsx`, không hex thô, UI tiếng Việt · page vẫn "mỏng" (API/logic trong `features/`).

---

## 14. Bài học từ sự cố thật (case study để phản biện)

> 23/06/2026: production FE **mọi deep-link 404** + **UI mới không lên production** dù code đã có trên repo. 5 bài học:

1. **Đừng revert một merge rồi merge lại nhánh cũ** — git thấy commit "đã reachable" nên không khôi phục nội dung đã revert →
   mất nguyên mảng UI. *Đúng:* `git revert <sha-của-commit-revert>`, KHÔNG merge lại nhánh.
2. **Resolve conflict cẩn thận** — trộn 2 phiên bản làm rớt import / nhân đôi JSX → build fail / crash. Sau resolve **luôn**
   `npm run build` + `npm test`.
3. **`npm run build` KHÔNG bắt mọi lỗi** — `X is not defined` là ReferenceError lúc chạy; bundler vẫn "build thành công" nhưng
   trang trắng. Phải chạy **cả test** (Vitest render trang) mới lộ.
4. **Hiểu cổng deploy Vercel** — production build từ Production Branch = `dev`; build fail thì Vercel **giữ bản cũ** → tưởng
   "đã cập nhật mà không đổi". Luôn xem tab Deployments (Ready/Error + build từ commit nào).
5. **`vercel.json` phải nằm trên nhánh production** — thiếu rewrite SPA `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`
   thì mọi refresh/deep-link/link email 404.

**Kết luận:** mọi thay đổi vào production đi qua **PR → chủ project review & merge → Vercel deploy**; build + test xanh là điều kiện cứng.

---

## 15. Chuẩn bị phản biện (study & defense)

**Mỗi thành viên trình bày được:** (1) Tổng thể §0 (stack, 4 tầng, luồng dữ liệu, phân vùng). (2) Phần của mình (§chức năng):
mỗi màn hình làm gì, gọi API nào, xử lý lỗi/edge-case ra sao. (3) ≥ 2 quyết định/deviation để bảo vệ.

**Câu hỏi hay gặp:** vì sao tách `api.js`/`hooks.js` khỏi page · TanStack Query giải quyết gì so với `useEffect`+`fetch` ·
chống tạo đơn trùng thế nào (Idempotency-Key) · vì sao admin detail hydrate cache · quy trình chặn bug lên production (§13–§14).

---

## Phụ lục — Bản đồ "chức năng → file FE" (đào sâu khi phản biện)

| Chức năng | Page chính | Feature (api/hooks) · helper |
|---|---|---|
| Auth & account | `pages/auth/*`, `pages/account/*` | `features/auth`, `features/addresses`, `store/authStore` |
| Catalog & breadcrumb | `pages/catalog/CategoryPage`, `pages/home` | `features/catalog`, `lib/categoryPath`, `components/Breadcrumb` |
| Chi tiết SP & biến thể | `pages/product/ProductPage`, `ProductOptions` | `features/catalog`, `lib/variantOptions` |
| Giỏ & voucher | `pages/cart/CartPage` | `features/cart` |
| Wishlist | `pages/wishlist/WishlistPage` | `features/wishlist` |
| Checkout & return | `pages/checkout/{CheckoutPage,CheckoutReturnPage}` | `features/checkout`, `lib/idempotency` |
| Đơn hàng | `pages/orders/{OrdersPage,OrderDetailPage}` | `features/orders` |
| Review | `pages/product/ProductPage` (form) | `features/reviews` |
| AI Chat | `ChatWidget`/`ChatPanel` | `features/chat`, `store/chatStore` |
| Admin | `pages/admin/*` | `features/admin/*` |
| Hạ tầng dùng chung | — | `lib/{apiClient,errors,formErrors,pagination,roles}`, `routes/*`, `app/router.jsx` |

---

_Tài liệu sống — cập nhật khi đổi logic, phân công, hoặc quy trình. Lần cập nhật gần nhất: 2026-07-10._
