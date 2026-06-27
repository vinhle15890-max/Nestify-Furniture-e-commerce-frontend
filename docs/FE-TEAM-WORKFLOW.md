# FE — Workflow các chức năng & phân công nhóm (tài liệu học & phản biện)

> **Mục đích:** 1 tài liệu duy nhất mô tả **luồng end-to-end phía Frontend** của từng chức năng để
> teammate đọc, hiểu hệ thống, **phản biện** (trả lời câu hỏi hội đồng), đồng thời **chia việc cho 4 FE**.
> **Cách đọc mỗi mục:** *Actor → Entry (route/page) → Luồng qua các tầng (page → hooks → api → apiClient) →
> Side-effect (cache/store/toast) → Lỗi → **Điểm phản biện*** (vì sao thiết kế thế, câu hỏi hay bị hỏi).
> **Last updated:** 2026-06-27 · **See also:** `AGENTS.md` (convention + stack), `docs/TASKS.md` (bảng việc theo phase),
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

## 10. Khu vực Admin (back-office)

**Actor:** Staff (role ≠ customer). **Entry:** `/admin/*` sau `AdminRoute`. **Feature:** `features/admin/*`, `pages/admin/*`.

- **Catalog:** products (CRUD), **variants** (modal) + **biến thể theo tùy chọn** (`VariantOptionsPanel` định nghĩa option +
  `VariantMatrixGenerator` sinh ma trận qua endpoint bulk), media upload + **reorder** payload `{ids:[...]}`.
- **Orders:** list + đổi trạng thái (**state machine**, chỉ bước hợp lệ) + **refund đồng bộ**.
- **Voucher** CRUD; **Review moderation** approve/reject; **Users** (read-only + gán role); **Audit logs**; **Dashboard** thống kê.

> **Phản biện:** (1) Trang admin detail **hydrate từ cache** (BE không có `GET /admin/products/{id}` lúc đầu → seed từ list/router
> state, fallback fetch). (2) Reorder media là `{ids:[...]}` (không phải `media_order`); voucher đọc `meta.last_page` phẳng
> (deviation Phase 8–9 trong `TASKS.md`). (3) Gate admin = `isStaff` (role ≠ customer); chỉ customer mới mua được hàng.

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
| **FE1 — Khám phá storefront** | _(tên)_ | §2 Catalog · §3 Chi tiết SP & biến thể | `pages/{home,catalog,product}`, `features/catalog`, `components/{home,layout}`, `Breadcrumb`, `ProductCard` |
| **FE2 — Phễu mua hàng** | _(tên)_ | §4 Giỏ · §5 Wishlist · §6 Checkout · §7 Đơn hàng · §8 Review | `pages/{cart,wishlist,checkout,orders}`, `features/{cart,wishlist,checkout,orders,reviews}` |
| **FE3 — Tài khoản & Nền tảng** | _(tên)_ | §1 Auth/Account · §9 AI Chat · §11 Hạ tầng dùng chung | `pages/{auth,account}`, `features/{auth,addresses,chat}`, `lib/`, `store/`, `routes/`, `app/router.jsx` |
| **FE4 — Quản trị & Chất lượng** | _(tên)_ | §10 Admin · a11y/responsive/performance · testing | `pages/admin/*`, `features/admin/*` |

> **Lưu ý nền tảng (FE3):** vì sở hữu `lib/`, `store/`, `router`, `AuthLayout` — mọi thay đổi ảnh hưởng cả nhóm → **PR review kỹ,
> báo trước nhóm**. Phase 6 (3D Room Planner) đang **hoãn**; ai xong track sớm nhận thêm (cần `three` + `@react-three/fiber` + `drei`).

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

_Tài liệu sống — cập nhật khi đổi logic, phân công, hoặc quy trình. Lần cập nhật gần nhất: 2026-06-27._
