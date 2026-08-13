#npm FE — Workflow các chức năng & phân công nhóm (tài liệu học & phản biện)

> **Mục đích:** 1 tài liệu duy nhất mô tả **luồng end-to-end phía Frontend** của từng chức năng để
> teammate đọc, hiểu hệ thống, **phản biện** (trả lời câu hỏi hội đồng), đồng thời **chia việc cho 4 FE**.
> **Cách đọc mỗi mục:** *Actor → Entry (route/page) → Luồng qua các tầng (page → hooks → api → apiClient) →
> Side-effect (cache/store/toast) → Lỗi → **Điểm phản biện*** (vì sao thiết kế thế, câu hỏi hay bị hỏi).
> **Last reconciled with code:** 2026-07-29 (bổ sung route hỗ trợ công khai, operation, failure boundary, code evidence và khoảng hở để phản biện) · **See also:** `AGENTS.md` (convention + stack),
> `docs/CURRENT-STATE-MECHANISMS.md` (cơ chế, enforcement gap và edge case chi tiết), BE
> `docs/FE_AI_CONTEXT.md` (request/response contract), BE `docs/14-workflows.md` (luồng server),
> `../../Nestify-Furniture-e-commerce-backend/docs/defense-question-bank.md` (ngân hàng câu hỏi phản biện).
> Dated specs/plans và `TASKS.md` là work records, không cần đọc để hiểu current state trong tài liệu này.

### Bản đồ nối với kịch bản và Backend

Tài liệu này là lớp giải thích **phía giao diện**. Thứ tự nói/demo nằm trong
[Kịch bản bảo vệ 6 thành viên](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md); transaction, concurrency và
DB invariant nằm trong [BE `14-workflows.md`](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md).

| Mã | Hành trình | Kịch bản | Mục FE hiện tại | Mục BE đào sâu |
|---|---|---|---|---|
| `J1` | Auth và phân quyền | Chương 2, 4B | §1, §10–§11 | BE §1, §12, §13b |
| `J2` | Catalog và variant | Chương 2, 4A | §2–§3 | BE §2 |
| `J3` | Personalization | Chương 4A | §9b | BE §10b |
| `J4` | AI Chatbot | Chương 4B, 5 | §9 | BE §10 |
| `J5` | Room Planner | Chương 3, 4B, 5 | §10b | BE §9 |
| `J6` | Admin product/variant/media/model | Chương 3 | §10, §10c | BE §10d–§10e, §11.11–§11.12 |
| `J7` | Cart và voucher | Chương 2, 6 | §4 | BE §3 |
| `J8` | Checkout và create order | Chương 5–6 | §6.1–§6.2 | BE §4.1 |
| `J9` | PayOS và reconcile | Chương 5–6 | §6.3–§6.5 | BE §5 |
| `J10` | Order, cancel và inventory | Chương 5–6 | §7 | BE §4b, §13 |
| `J11` | Review và moderation | Chương 2, hậu demo | §8 | BE §8 |
| `J12` | Admin, RBAC và audit | Chương 2–3 | §10–§10a | BE §11–§12, §14 |

> Trong mỗi dòng “Liên kết bảo vệ” bên dưới: **FE** chịu trách nhiệm presentation/state/feedback; **BE/DB**
> chịu trách nhiệm authorization, transaction và invariant nghiệp vụ.

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

### 0.1 Khung đọc bắt buộc cho từng operation

Tài liệu này dùng cùng tinh thần với BE `14-workflows.md`: không dừng ở “màn hình gọi endpoint nào”. Khi học hoặc
phản biện một operation, phải chỉ ra đủ các lớp sau:

| Lớp cần trả lời | Câu hỏi kiểm tra |
|---|---|
| **Actor / gate** | Ai nhìn thấy nút/route? FE ẩn bằng điều kiện nào? BE còn chốt lại bằng middleware/policy nào? |
| **Trigger / entry** | Route, page, thao tác người dùng hoặc lifecycle nào khởi phát request? |
| **Data path** | `Page/Component → hook → api.js → apiClient → endpoint` chính xác là gì? |
| **Request / response** | Payload nào do FE tạo, field nào chỉ để render, field nào là snapshot/derived? |
| **State ownership** | Dữ liệu thuộc Query cache, Zustand persisted, Zustand tạm, hay local component state? |
| **Success side-effect** | Cache nào invalidate/update, store nào đổi, toast/redirect nào xảy ra? |
| **Failure boundary** | Lỗi mạng, 401/403/409/422/429/503 được biểu diễn thế nào; có retry hay không? |
| **Concurrency / idempotency** | FE chỉ hỗ trợ UX hay thực sự đảm bảo? Chốt chống race nằm ở client, server hay DB? |
| **Security / trust boundary** | Kiểm tra FE nào chỉ là presentation; dữ liệu nào phải sanitize; điều gì tuyệt đối không tin client? |
| **Evidence / limitation** | File nào chứng minh; current state còn khoảng hở gì phải nói thật? |

> **Quy tắc phản biện:** FE có thể ẩn nút, disable form, debounce hoặc giữ idempotency key để giảm lỗi thao tác, nhưng
> không được nhận công trạng cho invariant nghiệp vụ. Quyền, tồn kho, voucher, trạng thái đơn và uniqueness vẫn phải
> được BE/DB enforce. Khi hai phía có vai trò khác nhau, câu trả lời phải nêu rõ cả hai.

### 0.2 Cơ chế xuyên suốt và failure boundary

- Request interceptor đọc token hiện thời bằng `useAuthStore.getState()` và gắn `Authorization: Bearer …`; component
  không tự truyền token. Response interceptor trả thẳng `response.data`, nên `query.data` chính là envelope API đã
  unwrap một lớp axios.
- Lỗi có `response.data.error` được chuẩn hóa thành `ApiError(code, message, details, status)`. Không có envelope
  (mất mạng/CORS/timeout) trở thành `NETWORK_ERROR`; đây không đồng nghĩa server trả 500.
- `401` ở endpoint ngoài `/auth/*` làm `authStore.logout()` và clear React Query cache ngay trong interceptor. Login,
  register và logout cũng clear cache ở session boundary; `401` của login/register không auto-logout để form còn phân biệt lỗi xác thực của chính thao tác đó.
- `ProtectedRoute`/`AdminRoute`/`RequirePermission` là gate điều hướng và UX. Chúng không thay thế
  `auth:sanctum`, `verified`, `isStaff` hay permission middleware của BE.
- Mutation mặc định không optimistic update: phần lớn operation chờ server thành công rồi invalidate prefix cache.
  Đổi lại UI có thêm một round-trip nhưng tránh rollback phức tạp với tồn kho, voucher và state machine.

> **Khoảng hở phải nói thật:** `normalizeError` dùng `error.message` cho `NETWORK_ERROR`; page/toast không được show
> nguyên chuỗi kỹ thuật này cho người dùng. `lib/queryClient.js` hiện cấu hình query retry 1 lần, stale 60 giây và
> không refetch khi focus; mutation không tự retry. Operation nào override (ví dụ payment reconcile `gcTime:0`) phải
> nói theo override đó, không suy từ tên thư viện.

### 0.3 Trang hỗ trợ công khai

**Actor:** Guest+. **Entry:** `/shipping`, `/returns`, `/privacy`, `/contact`. **Feature:** `pages/support/SupportPages.jsx`,
được lazy-load từ `app/router.jsx`; các liên kết nằm trong `components/layout/Footer.jsx`.

- Đây là bốn trang nội dung tĩnh, không có `features/api.js`, hook hoặc request server.
- Trang giao hàng không tự ước tính thời gian/phí; nó hướng người dùng đến dữ liệu `delivery` đã xác nhận ở từng
  sản phẩm và nói rõ checkout hiện chưa hiển thị phí giao hàng riêng.
- Trang đổi trả phân biệt hủy trước khi `shipped` với đổi trả sau khi nhận. Điều kiện tự hủy và side effect hoàn
  tiền vẫn do order state machine ở backend quyết định; frontend chỉ dẫn đến `/orders`.
- Trang quyền riêng tư mô tả các nhóm dữ liệu tương ứng với chức năng hiện có, không tuyên bố retention hoặc
  biện pháp pháp lý chưa có bằng chứng runtime.
- Trang liên hệ dùng `mailto:support@nestify.vn`; không render form vì chưa có endpoint tiếp nhận. Đây là chủ ý
  tránh một biểu mẫu có vẻ hoạt động nhưng không thể gửi.

> **Phản biện:** Vì sao không lấy chính sách giao hàng chung từ ảnh/mô tả hoặc hard-code một con số? Vì dữ liệu
> giao hàng/đổi trả hiện là thuộc tính cấp sản phẩm do quản trị viên xác nhận. Một chính sách tổng quát bịa thêm
> sẽ mâu thuẫn với nguyên tắc “thấy rõ trước khi chọn” và dễ trở thành cam kết sai.

---

## 1. Tài khoản & xác thực

> **Liên kết bảo vệ `J1`:** [Kịch bản Chương 2 và 4B](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-2--ai-tham-gia-và-hệ-thống-ghi-nhớ-gì) · [BE §1, §12, §13b](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#1-tài-khoản--xác-thực--chi-tiết) · Tài/BE2 ↔ FE3/FE4.

**Actor:** Guest → Customer. **Entry:** `pages/auth/*` (`/login`, `/register`, `/forgot-password`, `/reset-password`,
`/verify-email`), `pages/account/*`. **Feature:** `features/auth`, `features/addresses`.

### 1.1 Đăng ký (`RegisterPage`)
- **Trigger:** Form submit sau khi Yup validation pass (email format, password min:10, password_confirmation match).
- **Hook:** `useRegister()` (mutation, `features/auth/hooks.js`).
- **API:** `POST /auth/register {name, email, password, password_confirmation}`, bọc trong `throttle:auth` (BE).
- **Response:** `{token, user{id, name, email, roles}}` → `authStore.setState({token, user})`. Token persist vào localStorage key `nestify-auth`.
- **State update:** `authStore` re-render `Header` (đổi nút Đăng nhập → Tài khoản), bật các route `ProtectedRoute`.
- **Lưu ý:** User có token ngay nhưng `email_verified_at = null` → bị chặn ở route `verified` (giỏ, đặt hàng, wishlist, review). FE hiện `VerifyEmailPage` nếu chưa verify.
- **Error:** `422 VALIDATION_FAILED` → `applyServerErrors` map về field (email/name/password). `429` rate limit.

### 1.2 Đăng nhập (`LoginPage`)
- **Trigger:** Form submit email + password.
- **Hook:** `useLogin()` (mutation).
- **API:** `POST /auth/login {email, password}`, `throttle:auth`.
- **Response:** `{token, user{id, name, email, roles, permissions}}` → `authStore.setState(...)`.
- **Error path:**
  - `401 UNAUTHENTICATED` → toast "Email hoặc mật khẩu không đúng" (không phân biệt sai email/password để tránh enumeration).
  - `403 ACCOUNT_INACTIVE` → toast "Tài khoản đã bị vô hiệu hóa" (tài khoản bị khóa).
  - `429` rate limit → toast chung.
- **State update:** `authStore` persist → tất cả component dùng `useAuthStore` re-render.

### 1.3 Verify email (`VerifyEmailPage`)
- **Trigger:** User bấm link trong email → FE đọc query params `id`, `expires`, `signature` → `Object.fromEntries(new URLSearchParams(...))` → POST params lên BE.
- **Route:** `POST /auth/verify-email {id, expires, signature}`, public (không cần auth), `throttle:auth`.
- **Response:** 200 `{message: "Email xác thực thành công."}` → redirect `/login`.
- **Error:** `403 LINK_EXPIRED` → hiện nút "Gửi lại". `403 INVALID_LINK` → hiện cảnh báo link không hợp lệ.

### 1.4 Resend verification (`VerifyEmailPage`)
- **Trigger:** User bấm nút "Gửi lại email xác thực".
- **Hook:** `useResendVerification()` (mutation).
- **API:** `POST /auth/email/verification-notification`, auth:sanctum (cần token), `throttle:6,1`.
- **Response:** 200 `{message: "Đã gửi lại..."}` → toast thành công. No-op nếu đã verify.

### 1.5 Quên / đặt lại mật khẩu (`ForgotPasswordPage`, `ResetPasswordPage`)
- **Forgot:** Form email → `useForgotPassword()` → `POST /auth/forgot-password {email}` → luôn 200 (không tiết lộ email tồn tại).
- **Reset:** Đọc token từ query param → form password mới + confirm → `useResetPassword()` → `POST /auth/reset-password {email, token, password, password_confirmation}` → thành công redirect `/login`.
- **Lưu ý:** BE xoá toàn bộ Sanctum token của user sau reset → mọi phiên cũ bị đăng xuất.

### 1.6 Profile (`ProfileForm` trong `AccountPage`)
- **Trigger:** Form name + current_password + new_password (optional).
- **Hook:** `useUpdateProfile()` (mutation).
- **API:** `PATCH /auth/profile {name, current_password, password?, password_confirmation?}`.
- **Validation FE:** `current_password` bắt buộc. `password` min:10 + confirmed nếu có.
- **State update:** `authStore.user.name` cập nhật ngay.

### 1.7 Đăng xuất
- **Hook:** `useLogout()` → `POST /auth/logout` → xoá `authStore` (reset toàn bộ) → xoá token khỏi localStorage → redirect `/login`.
- **BE:** `$user->currentAccessToken()->delete()` — chỉ huỷ token hiện tại, các thiết bị khác vẫn đăng nhập.

---

## 2. Catalog (trang chủ · danh mục · breadcrumb) — CHI TIẾT

> **Liên kết bảo vệ `J2`:** [Kịch bản Chương 2 và 4A](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-4a--an-khám-phá) · [BE §2](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#2-catalog-duyệt-sản-phẩm--chi-tiết-từng-operation) · Tài/BE2 ↔ FE1.

**Actor:** Guest+. **Entry:** `pages/home`, `pages/catalog/CategoryPage` (`/c/:categorySlug`, `/c/all`).
**Feature:** `features/catalog`.

### 2.1 Cây danh mục (L4)
- **Hook:** `useCategories()` (query, `queryKey: ['categories']`, stale 60s).
- **API:** `GET /categories` (public) → `CategoryService::allWithChildren` → `Category::root()->with(['asset', 'children.asset'])`.
- **Render:** `CategoryNav` mega-menu — root làm hàng ngang, children lồng dropdown.
- **Cache:** `queryKey` cố định → TanStack cache dùng chung cho tất cả component.

### 2.2 Danh sách sản phẩm (L1)
- **Hook:** `useInfiniteProducts(filters)` → `useCursorQuery` từ `lib/pagination.js`.
- **API:** `GET /products?filter[category]=&filter[brand]=&filter[wood_type]=&filter[price_min]=&filter[price_max]=&filter[search]=&sort=&cursor=&limit=`.
- **FE filters:** `filter[category]` lấy từ route param `:categorySlug`. `filter[brand]`, `sort` từ UI select/dropdown. `filter[search]` từ search input.
- **Cursor:** Mỗi page trả `next_cursor` → FE gửi cursor để lấy page tiếp (infinite scroll). TanStack `useInfiniteQuery` nối page into `data.pages[]`.
- **Loading:** Skeleton cards. **Empty:** "Không tìm thấy sản phẩm phù hợp".
- **Error:** Retry 1 lần (TanStack default). Toast nếu network error persistent.
- **queryKey:** `['products', filters]` — thay đổi filter → tự reset cursor + refetch.

### 2.3 Best sellers (L2)
- **Hook:** `useBestSellers(limit=8)` (query, `queryKey: ['products', 'best-sellers', limit]`).
- **API:** `GET /products/best-sellers?limit=`. Limit clamp 1–24.
- **Render:** `HomePage` → `ProductCard[]` trong grid. Không pagination. Auto-hide nếu empty.

### 2.4 Chi tiết sản phẩm (L3)
- **Hook:** `useProduct(slug)` (query, `queryKey: ['products', slug]`, enabled khi slug có).
- **API:** `GET /products/{slug}` (public). `getProduct(slug, config)` — hỗ trợ timeout per-request (Room Planner preload).
- **Render:** `ProductPage` →
  - Gallery ảnh/video từ `media[]` sắp xếp theo `sort_order`.
  - Variant selector: nếu có `variant_options` → `ProductOptions` component (Shopify-style: mỗi option 1 hàng, color swatch hex, text button). Chọn đủ option → `resolveVariant(selected, variants, options)` → variant cụ thể.
  - `available_stock = 0` → disable nút Add-to-cart, badge "Hết hàng".
  - Description HTML sanitized bằng `DOMPurify` (allow-list tags).
  - SEO: `<title>`, `<meta name="description">`, `<meta property="og:*">`, Product JSON-LD.
- **Error:** 404 → "Sản phẩm không tồn tại". Network → retry 1 lần.
- **Gate mua hàng:** `token && isStaff(user)` → hiện "Tài khoản quản trị không mua được". Chưa login → nút "Đăng nhập để mua".

### 2.5 Product reviews list (L6)
- **Hook:** `useProductReviews(slug)` → `useCursorQuery`.
- **API:** `GET /products/{slug}/reviews?cursor=&limit=`. Chỉ `status=approved`.
- **Render:** `ProductPage` → danh sách review với `user.name`, `rating` (sao), `body`, `created_at`. Cursor pagination "Xem thêm".

### 2.6 Breadcrumb
- **Component:** `components/Breadcrumb` — nhận `items[]`. `lib/categoryPath.findCategoryPath(tree, slug)` dò tổ tiên từ cây danh mục → `Trang chủ > Cha > Con > SP`.
- **Gập `…`** khi > 4 cấp. Phát `BreadcrumbList` JSON-LD.
- **Suy biến mềm:** cây chưa tải / slug lạ → 1 cấp danh mục.

### 2.7 Variant resolve (FE logic)
- `lib/variantOptions.resolveVariant(selected, variants, options)`:
  - Duyệt `variants[].attributes` → so khớp từng option đã chọn.
  - Tổ hợp hết hàng / không tồn tại → disabled.
  - Chỉ enable option value nếu còn ít nhất 1 variant có `available_stock > 0` khớp value giả định + mọi lựa chọn hiện tại.
  - Resolve thành công → trả variant với `id`, `price`, `available_stock`, `model_3d_url`.

---

## 2b. Địa chỉ (AddressesPage / AddressFormModal)

**Actor:** Customer. **Entry:** `pages/account/AddressesPage.jsx`, `AddressFormModal.jsx`. **Feature:** `features/addresses`.

### Liệt kê địa chỉ
- **Hook:** `useAddresses()` (query, `queryKey: ['addresses']`, enabled khi có token).
- **API:** `GET /addresses` (auth:sanctum + verified) → `AddressService::list` → sắp xếp `is_default` DESC.
- **Empty state:** Hiện prompt tạo địa chỉ đầu tiên.

### Tạo / Sửa / Xoá địa chỉ
- **Trigger:** Bấm "Thêm địa chỉ" → mở `AddressFormModal` (React Hook Form + Yup).
- **Hook:** `useCreateAddress()`, `useUpdateAddress()`, `useDeleteAddress()`, `useSetDefaultAddress()`.
- **API:** `POST /addresses`, `PATCH /addresses/{id}`, `DELETE /addresses/{id}`, `PATCH /addresses/{id}/default`.
- **State update:** `invalidateQueries(['addresses'])`.
- **Lưu ý:** Client KHÔNG gửi `is_default` — BE tự set nếu là địa chỉ đầu tiên. Set default dùng transaction: clear all → set one. Partial unique index `WHERE is_default=true` là invariant cuối.

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

> **Liên kết bảo vệ `J7`:** [Kịch bản Chương 6](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-6--từ-căn-phòng-đến-đơn-hàng) · [BE §3](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#3-giỏ-hàng--voucher) · Tài/BE2 ↔ FE2.

**Actor:** Customer. **Entry:** `pages/cart/CartPage` + drawer giỏ (`uiStore.openCart`). **Feature:** `features/cart`.

### 4.1 Đọc giỏ — `GET /cart`

**Trigger:** `CartPage`, cart drawer hoặc badge cần dữ liệu. **Path:** component → `useCart()` →
`cartApi.getCart()` → `GET /cart`. Query key `['cart']`, chỉ enabled khi có token.

**Render:** dòng hàng dùng variant, quantity, `unit_price_snapshot`, giá hiện hành và tồn khả dụng do resource trả.
Giá/tồn ở UI là tín hiệu để giải thích và disable sớm; không phải lock. Empty cart là trạng thái hợp lệ, không phải lỗi.

### 4.2 Thêm / đổi số lượng / xóa item

| Operation | Hook → API | Payload | Success side-effect |
|---|---|---|---|
| Add | `useAddCartItem` → `POST /cart/items` | `{variant_id, quantity}` | invalidate `['cart']`; caller có thể mở drawer |
| Update | `useUpdateCartItem` → `PATCH /cart/items/{itemId}` | `{quantity}` | invalidate `['cart']` |
| Remove | `useRemoveCartItem` → `DELETE /cart/items/{itemId}` | path param | invalidate `['cart']` |

FE không tự cộng/trừ cache trước response. Nếu hai tab cùng sửa hoặc tồn kho đổi giữa lúc render và submit, response BE
mới quyết định. `409 INSUFFICIENT_STOCK` cùng `details.available` phải được dùng để giải thích mức còn lại; `422` map
về input nếu payload sai; `401` đi qua interceptor và xóa phiên.

### 4.3 Xem trước voucher — `POST /cart/apply-voucher`

**Path:** `CartPage` → `useApplyVoucher()` → `cartApi.applyVoucher(code)` → `{code}`. Mutation này **không
invalidate cart**, vì response chỉ là phép tính preview; voucher chưa được gắn bền vững/consume ở bước này. Checkout
vẫn gửi code và BE kiểm tra lại trong transaction tạo order.

> **Phản biện:** Giá hiển thị minh bạch theo snapshot lúc thêm; **giá thanh toán = `unit_price_snapshot` trong cart**
> (BE `OrderService::create` dòng 108 tính subtotal từ snapshot của cart, không đọc lại giá variant hiện hành).
> Vì vậy thay đổi giá sau khi item vào cart không tự đổi số tiền — đây là cơ chế snapshot giá, không phải khóa giá.
> Chống race khi nhiều người dùng cùng voucher → BE atomic consume lúc đặt (FE chỉ preview).
> *Sửa ngày 2026-07-22: tài liệu cũ ghi "giá thanh toán = giá hiện tại lúc đặt" — đã xác minh code và sửa lại.*

**Code evidence:** `features/cart/{api,hooks}.js`, `pages/cart/CartPage.jsx`, `components/layout/CartDrawer.jsx`,
`lib/apiClient.js`; invariant server xem BE `14-workflows.md` §3, §4.1 và §13.

---

## 5. Wishlist

**Actor:** Customer. **Entry:** `pages/wishlist/WishlistPage`. **Feature:** `features/wishlist`.

### 5.1 Danh sách và bốn mutation

| Operation | Data path | Cache sau thành công |
|---|---|---|
| List | `useWishlist` → `GET /wishlist` | query `['wishlist']` |
| Add | `useAddWishlistItem` → `POST /wishlist/items {variant_id, notify_on_restock}` | invalidate wishlist |
| Remove | `useRemoveWishlistItem` → `DELETE /wishlist/items/{id}` | invalidate wishlist |
| Toggle báo hàng | `useUpdateWishlistItem` → `PATCH /wishlist/items/{id}` | invalidate wishlist |
| Move to cart | `useMoveToCart` → `POST /wishlist/items/{id}/move-to-cart` | invalidate cả wishlist và cart |

Wishlist cho lưu variant hết hàng vì mục tiêu là theo dõi lâu dài, nhưng không nhận variant đã inactive. Item legacy bị
deactivate vẫn hiện với trạng thái "đã dừng bán" và CTA chuyển giỏ bị khóa; BE trả `409 INACTIVE_VARIANT` nếu client cũ
vẫn gọi. Move-to-cart kiểm tra lại variant và stock; thành công mới làm hai cache hội tụ.

> **Phản biện:** Wishlist là "theo dõi lâu dài" nên cho thêm hàng hết; move-to-cart mới chặn tồn kho. Báo hàng về do BE
> phát qua Observer/Event — FE chỉ bật cờ. FE không gửi email, không quyết định thời điểm “restock”, và toggle ở client
> không chứng minh notification đã được giao.

**Code evidence:** `features/wishlist/{api,hooks}.js`, `pages/wishlist/WishlistPage.jsx`; BE `14-workflows.md` §7.

---

## 6. Thanh toán (Checkout) & trang trả về

> **Liên kết bảo vệ `J8–J9`:** [Kịch bản Chương 5–6](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-5--quyết-định-được-bảo-vệ) · [BE §4.1 create order](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#41-create-order) · [BE §5 PayOS](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#5-thanh-toán-payos--callback) · Bảo/BE1 ↔ FE2.

**Actor:** Customer. **Entry:** `pages/checkout/CheckoutPage` (`/checkout`), `CheckoutReturnPage` (`/checkout/return`).
**Feature:** `features/checkout`, `features/orders`.

### 6.1 Chuẩn bị checkout

`CheckoutPage` kết hợp `useCart()` và `useAddresses()`: chọn địa chỉ mặc định trước nếu có, nhận voucher code và phương
thức `cod|payos`. State lựa chọn thuộc page; cart/address vẫn thuộc Query cache. Guest bị `ProtectedRoute` chặn; staff
vào bề mặt mua hàng nhận `CheckoutNotice`. Đây là UX gate, BE vẫn phải enforce customer-only.

### 6.2 Tạo order — `POST /orders`

**Path:** submit → `useCreateOrder()` → `createOrder(payload, getCheckoutIdempotencyKey())` → header
`Idempotency-Key`. Thành công invalidate `['cart']` vì server đã clear cart trong cùng transaction.

`getCheckoutIdempotencyKey()` ưu tiên key trong `uiStore`, sau đó restore `sessionStorage`
`nestify.checkout.idempotency-key`, cuối cùng mới `crypto.randomUUID()`. Nếu storage bị chặn, nó suy biến về key
in-memory của tab hiện tại. Cùng key + cùng fingerprint cho phép BE replay order; cùng key + payload khác phải bị 409.
FE không tự đảm bảo exactly-once: unique index/transaction ở BE mới là invariant.

### 6.3 Tạo payment session — `POST /orders/{id}/payment-session`

Sau khi đã có order PayOS, page chuyển sang state theo `orderId` và gọi `useCreatePaymentSession()` với `{gateway}`.
Backend tự tạo return/cancel URL từ cấu hình tin cậy và order ID. Thành công redirect đến checkout URL. Nếu request này lỗi, order **đã tồn tại**: UI phải giữ
order ID, cho retry tạo session hoặc mở chi tiết đơn, tuyệt đối không quay lại gọi create-order với key mới.

COD không cần redirect gateway; trạng thái do response BE quyết định, FE không tự set order thành processing.

### 6.4 Return và reconcile — `POST /orders/{id}/payment/reconcile`

`CheckoutReturnPage` đọc `order_id`, dùng `useReconcilePayment`. Query key `['payment-reconcile', orderId]`,
`refetchOnWindowFocus:false`, `gcTime:0`; page điều khiển chu kỳ poll tối đa 10 lần. Response
`meta.payment_status=success|pending|failed` quyết định UI. `503 GATEWAY_UNAVAILABLE` là lỗi xác minh, không được
ngụy trang thành pending; user có nút retry rõ ràng.

### 6.5 Failure và trạng thái không chắc chắn

- `409 INSUFFICIENT_STOCK`: quay về cart/giải thích item thiếu; FE không tự reserve.
- Mất response create-order: retry **cùng key**, không sinh key mới.
- Payment session lỗi: giữ order, retry session.
- Return URL nói success nhưng reconcile còn pending: tin reconcile/webhook, không tin query string.
- `429`: ngừng spam retry, hiển thị message tiếng Việt; `401`: interceptor kết thúc phiên.

> **Phản biện:** (1) **Idempotency-Key** là điểm chí mạng xuyên FE/BE — FE giữ cùng key khi retry, BE mới là nơi enforce unique + replay. (2) Trang return poll + reconcile vì
> webhook là nguồn sự thật nhưng có thể trễ → tránh kẹt "pending_payment" giả. (3) COD vs PayOS: COD xác nhận đơn ngay,
> PayOS giữ chỗ kho tới khi trả tiền (khớp BE §4–§5).

**Code evidence:** `pages/checkout/{CheckoutPage,CheckoutReturnPage}.jsx`, `features/checkout/{api,hooks}.js`,
`lib/idempotency.js`, `store/uiStore.js`; BE `14-workflows.md` §4–§5, §13.

---

## 7. Đơn hàng (lịch sử & chi tiết)

> **Liên kết bảo vệ `J10`:** [Kịch bản Chương 5–6](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-5--quyết-định-được-bảo-vệ) · [BE §4b cancel và §13 inventory](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#4b-khách-tự-hủy-đơn-trước-khi-giao-orderservicecancelid-user-reason) · Bảo/BE1 ↔ FE2.

**Actor:** Customer. **Entry:** `pages/orders/OrdersPage` (`/orders`), `OrderDetailPage` (`/orders/:id`). **Feature:** `features/orders`.

### 7.1 List và detail

- `OrdersPage` → `useOrders()` → `GET /orders`, query key `['orders']`. Hook hiện không nhận `page`; phân trang thực tế
  chỉ đầy đủ khi page/component hoặc contract được nối thêm. Không được trình bày rằng FE đã điều khiển offset page nếu
  code chưa gửi query param.
- `OrderDetailPage` → `useOrder(id)` → `GET /orders/{id}`, key `['orders', id]`, enabled khi có id. UI đọc
  `variant_snapshot`, địa chỉ snapshot và payment history từ order resource; không ghép lại catalog live để dựng lịch sử.

### 7.2 Hủy đơn — `POST /orders/{id}/cancel`

Nút chỉ hiện khi status thuộc `pending_payment|paid|processing`; modal nhận `reason` optional rồi
`useCancelOrder()` gửi `{reason}`. Thành công invalidate cả prefix `['orders']` và detail `['orders', id]`.
BE mới kiểm owner, trạng thái hiện thời, release/restock và refund record trong transaction. Nếu trạng thái đổi sau lúc
nút được render, 422 của BE thắng; FE đóng/disable nút không phải concurrency control.

Đơn đã trả online cần copy giải thích rằng “refund được ghi nhận, admin chuyển tiền thủ công” theo current contract;
không hứa hoàn tự động qua PayOS.

### 7.3 Hành động theo state machine

**Hủy** cho pending/paid/processing, chặn từ shipped. **Thanh toán lại** chỉ có ý nghĩa với pending_payment và đi qua
payment-session, không tạo order mới. Các nút là projection của state machine để giảm thao tác sai; server transition
vẫn là nguồn chân lý.

> **Phản biện:** Chi tiết đơn đọc snapshot (không join lại variant) → đơn cũ không sai khi shop đổi giá/xoá variant. Nút
> hành động render theo trạng thái (state machine) — chỉ hiện bước hợp lệ.
> *Sửa ngày 2026-07-22: tài liệu cũ ghi chỉ pending_payment được hủy; code BE cho phép pending/paid/processing.*

**Khoảng hở hiện tại:** `getOrders()` chưa truyền `page`; nếu API trả trang 1 mặc định thì FE chưa có offset pagination
hoàn chỉnh dù resource có `meta`. Đây là gap cần sửa hoặc phải demo đúng giới hạn.

**Code evidence:** `features/orders/{api,hooks}.js`, `pages/orders/{OrdersPage,OrderDetailPage}.jsx`; BE
`14-workflows.md` §4.0–§4b.

---

## 8. Đánh giá (Review)

> **Liên kết bảo vệ `J11`:** [Kịch bản Chương 2](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-2--ai-tham-gia-và-hệ-thống-ghi-nhớ-gì) · [BE §8](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#8-review--moderation) · Tài/BE2 ↔ FE2/FE4.

**Actor:** Customer (đã mua). **Entry:** form ở `ProductPage` (`/p/:slug`). **Feature:** `features/reviews`.

### 8.1 Tạo review

`ProductPage`/review form → `useCreateReview()` → `POST /products/{productId}/reviews` với rating/body và evidence
tuỳ chọn về màu, kích thước, chất liệu, giao nhận, thời gian dùng. “Đã mua”, verified và uniqueness một review/sản
phẩm phải do BE kiểm tra; việc FE ẩn form chỉ là affordance. Response `approved` được refetch để hiện ngay trong public
list; response `pending` chỉ hiện copy đang xem lại, không append local vào danh sách công khai.

### 8.2 Moderation boundary

Public list chỉ nhận approved review và render dấu `Đã mua hàng` cùng evidence sở hữu. Review sạch từ đơn đã giao được
đăng tự động; link hoặc thông tin liên hệ đi vào exception queue. Điểm thấp không phải tín hiệu kiểm duyệt. Admin UI
hiện risk flag + product + order context trước hai quyết định “Giữ công khai”/“Ẩn đánh giá”; storefront không được tự
lọc pending như một biện pháp bảo mật vì pending vốn không nên được API public serialize.

> **Phản biện:** Form review nằm ở `/p/:slug` **không** ở `/orders/:id` vì `variant_snapshot` của đơn không mang `product_id`
> Đây là lý do response review cần kèm `product`: danh sách moderation phải gắn review với đúng sản phẩm.

**Code evidence:** `features/reviews/{api,hooks}.js`, `features/catalog/hooks.js`, Product review components,
`features/admin/reviews/{api,hooks}.js`; BE `14-workflows.md` §8.

---

## 9. AI Chatbot (RAG) — phía FE

> **Liên kết bảo vệ `J4`:** [Kịch bản Chương 4B–5](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-4b--an-tìm-hiểu-và-thử-nghiệm) · [BE §10](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#10-ai-chatbot-rag-tính-năng-phân-biệt-2) · Bảo/BE1 ↔ FE3.

**Actor:** Customer verified. **Entry:** floating bubble `ChatWidget`/`ChatPanel`. **Feature:** `features/chat`, `store/chatStore`.

### 9.1 Gửi message có ngữ cảnh

`ChatPanel` → `useSendMessage()` → `POST /ai/chat {message, history}`; `history` lấy tối đa 6 lượt user/assistant
gần nhất trong `chatStore`, không persist ngoài phiên. Thành công append reply và sources vào store.
Source sản phẩm có slug, tên, giá thấp nhất và thumbnail được dựng thành card nội bộ `/p/:slug`; tối đa 3 card
trên mỗi câu trả lời. AI có thể hỗ trợ bố trí, tỷ lệ, phối màu và cách đo, không chỉ tìm sản phẩm.

### 9.2 Gate và failure

Widget chỉ hiện cho customer verified. Đây là giảm request sai; endpoint vẫn phải auth/verified và enforce token budget.
`429 AI_TOKEN_BUDGET_EXCEEDED` cần copy riêng; `503` là upstream unavailable và không được biến thành câu trả lời rỗng.
Message đang soạn là local state; transcript hiển thị là `chatStore`; dữ liệu catalog nguồn thuộc response server, không
đưa vào Query cache vì operation là mutation hội thoại.

> **Phản biện:** BE không lưu transcript nhưng nhận cửa sổ 6 lượt từ FE để hiểu câu nối tiếp; nguồn trả lời kèm card/link
> sản phẩm là điểm tin cậy để khách tự kiểm tra.

**Security boundary:** source/link là dữ liệu ngoài component; render dưới dạng text/link React, không dùng
`dangerouslySetInnerHTML`. FE không được tuyên bố RAG “đúng tuyệt đối”; citations chỉ giúp truy nguồn để người dùng kiểm tra.

**Code evidence:** `features/chat/{api,hooks}.js`, `components/chat/{ChatWidget,ChatPanel}.jsx`, `store/chatStore.js`;
BE `14-workflows.md` §10.

---

## 9b. Personalization (cá nhân hoá — recently viewed & suggestions)

> **Liên kết bảo vệ `J3`:** [Kịch bản Chương 4A](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-4a--an-khám-phá) · [BE §10b](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#10b-personalization--recently-viewed-tính-năng-cá-nhân-hoá) · Tài/BE2 ↔ FE1.

**Actor:** Customer (logged-in + verified only). **Entry:** `ProductPage` → ghi xem + hiện "Bạn vừa xem"; `HomePage` → `JourneyContinuation` sau Featured Categories.

**Feature structure:** `src/features/personalization/`:
- `api.js` — record/recently-viewed cùng `getJourneyContext`, `updatePersonalization`, `clearPersonalizationHistory`.
- `hooks.js` — `useJourneyContext()` là cache chung cho toàn storefront; chỉ enable cho verified customer. Hai mutation control invalidate cả context và recently-viewed.
- `recommend.js` — logic cũ của `SuggestedForYou`; không còn điều phối cá nhân hóa Home.

**Components under `src/components/personalization/`:**
- `RecentlyViewedStrip` — recently-viewed trên ProductPage, exclude sản phẩm hiện tại, auto-hide nếu rỗng.
- `JourneyContinuation` — **composition root hiện hành trên Home**, render từ Journey Context; không tự fan-out rooms/wishlist/recently-viewed.
- `PersonalizedGreeting`, `SuggestedForYou`, `PersonalizedSection` — implementation cũ còn trong source để tránh cleanup ngoài phạm vi, nhưng không còn được HomePage import hoặc render.

**Luồng:**
1. **ProductPage:** on mount → call `useRecordProductView()` (không await) → ghi event. Hiển thị `RecentlyViewedStrip` (nếu logged-in customer, exclude current product).
2. **HomePage:** sau `FeaturedCategories`, render continuation + discovery từ context chung.
3. **Catalog/Planner:** Catalog stable-rank candidate trong tập search/filter hiện tại khi chưa chọn sort; Planner chỉ rank khi chưa search. Không loại phần còn lại; Catalog cho tắt thứ tự cá nhân trong phiên.
4. **Product Detail:** nếu continuation là room, hiện một callback nhỏ dẫn về đúng phòng; không giả vờ sản phẩm đã vừa phòng.
5. **Account:** cho bật/tắt và xóa behavioral history; rooms, wishlist, orders không bị xóa.
6. **Visibility:** admin/staff, guest và customer chưa verify không gọi context. Context rỗng/disabled/error fallback về UI công khai.

**Side-effect & Lỗi:**
- `recordProductView` fail (404/network) → **silent** (fire-and-forget, không toast).
- Home không đủ tín hiệu → `JourneyContinuation` auto-hide; lỗi một nguồn không được diễn giải thành sở thích hay mức độ phù hợp giả.
- Không có category từ lượt xem gần nhất → không gọi catalog discovery; phần tiếp tục phòng/wishlist vẫn có thể hiển thị.

> **Phản biện:** (1) Fire-and-forget `recordProductView` không chậm ProductPage. (2) Gate chạy trước data hooks nên actor ngoài phạm vi không phát sinh request. (3) Tiếp tục việc đã tạo có giá trị cao hơn một lưới recommendation; discovery chỉ đứng sau và công bố đúng nguồn bằng chứng. (4) Loại slug đã xem/đã lưu để phần khám phá thật sự mở rộng lựa chọn. (5) Auto-hide khi thiếu bằng chứng, không giả vờ hiểu người dùng mới.

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

> **Liên kết bảo vệ `J6`, `J12`:** [Kịch bản Chương 2–3](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-3--một-khả-năng-được-chuẩn-bị) · [BE §10d–§10e và §11–§12](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#10d-media-library-thư-viện-ảnh-dùng-chung--đã-build-2026-07-08) · Tài/BE2 phụ trách Admin–audit; Bảo/BE1 phụ trách RBAC ↔ FE4.

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

> **Phản biện:** (1) Trang admin detail ưu tiên product từ router state hoặc cache danh sách để render ngay; nếu không có
> seed thì `useAdminProduct(id)` gọi `GET /admin/products/{id}`. Đây là tối ưu latency, không phải dependency vào cache.
> (2) Reorder media gửi `{ids:[...]}` (không phải `media_order`); voucher đọc `meta.last_page` phẳng.
> (3) Gate admin = `isStaff` (role ≠ customer); chỉ customer mới mua được hàng.

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

> **Liên kết bảo vệ `J5`:** [Kịch bản Chương 3–5](../../Nestify-Furniture-e-commerce-backend/docs/KICH-BAN-BAO-VE-NESTIFY-6-THANH-VIEN.md#chương-4b--an-tìm-hiểu-và-thử-nghiệm) · [BE §9](../../Nestify-Furniture-e-commerce-backend/docs/14-workflows.md#9-3d-room-planner-be-persistenceorder-bridge--chi-tiết-từng-operation) · Bảo/BE1 ↔ FE3/FE4.

**Actor:** Customer (đã đăng nhập). **Entry:** link header "Thiết kế phòng 3D" → `/room-planner` (tạo mới) và
`/room-planner/:id` (mở scene đã lưu), **sau `ProtectedRoute`**, route **top-level đứng riêng** (KHÔNG nằm trong storefront
`Layout` → toàn màn hình, không Header/Footer). **Feature:** `features/roomPlanner`, `pages/roomPlanner/*`.

- **Luồng tầng:** `RoomPlannerPage` điều phối → `useEditorStore` (Zustand) giữ `room` (rộng/sâu/cao, **đơn vị mét**) + `items`
  (mỗi item: `variant` + `position/rotation/scale`) + `selectedId` + `gizmoMode` + `dirty/status`. Canvas 3D ở
  `scene/RoomCanvas` render bằng **R3F (`@react-three/fiber` v8) + drei v9** (sàn/tường/lưới, OrbitControls xoay-zoom,
  TransformControls chỉ di chuyển/xoay; customer scale bị loại khỏi gizmo và store). `CatalogTray` dùng `useInfiniteProducts` rồi lọc qua **`toPlaceableItems`**
  (chỉ giữ variant có `model_3d_url`). Lưu → `useCreateScene`/`useUpdateScene` → `POST`/`PATCH /room-scenes`.
- **Vùng cản:** state `obstacles[]` chỉ trình bày hai capability: `restricted` (vùng không đặt đồ dạng OBB) và
  `door_swing` (bản lề + cung quét). Record `column`/`cutout` cũ được mapper chuẩn hóa thành `restricted`.
  `RoomEditPanel` thêm/chỉnh chính xác và chọn translate/rotate; `ObstacleLayer` cho chọn, kéo trực tiếp và gizmo,
  đồng thời render ở editor/shared viewer; `collision.js` đưa món chồng vùng vào cảnh báo. Cửa dùng hộp bao bảo
  thủ, chưa có polygon hoặc tay nắm resize trực tiếp.
- **Phạm vi căn hộ:** một account là một căn hộ, tối đa 8 `room_scene`; mỗi
  scene là một phòng chữ nhật do người dùng tự đặt tên. `room_type` còn được gửi giá trị `other` để tương thích
  contract BE cũ nhưng không hiển thị thành một lựa chọn trùng nghĩa trong UI. `GET /room-scenes` trả
  `meta.limits`; `/account/rooms` dùng metadata này để hiện tổng quan và khóa
  “Thêm phòng” khi hết quota. Guest chỉ giữ một draft. Không có nhiều project
  hoặc wall-drawing/CAD; chỉ có các primitive vùng cản nêu trên.
- **Map dữ liệu:** `mappers.js` — `sceneToEditorState` (resource BE → state editor) ⇄ `editorStateToPayload` (state →
  payload). `RoomSceneItemResource` **không** trả name/price/thumbnail của variant → fallback về `sku`.
- **Hiệu ứng phụ:** lần lưu đầu chuyển hướng `/room-planner` → `/room-planner/:id` (replace). Có **`beforeunload`** + chặn lúc
  "Thoát" khi còn `dirty` (cảnh báo mất thay đổi). Màn hình nhỏ (<lg) được chặn bằng `matchMedia` trước khi setup,
  scene/product preload, shortcut hay Canvas mount; `SmallScreenNotice` cho sao chép URL đầy đủ (scene/deep-link/UTM/hash)
  để tiếp tục trên desktop, có fallback thủ công và không tuyên bố các thay đổi chưa lưu đã đồng bộ.
- **Current-state correction (2026-07-17):** FE hiện đã nối danh sách phòng ở `/account/rooms`, public share
  bằng token và handoff “thêm cả phòng vào giỏ”. Handoff không gọi `convert-to-order`: nó dùng
  `POST /room-scenes/{id}/add-to-cart`, best-effort theo placement/stock; xem
  `docs/CURRENT-STATE-MECHANISMS.md`. Câu cũ “FE chưa nối” đã lỗi thời.

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
> `@react-three/fiber@8` + `drei@9`; danh sách scene, public share và scene→cart hiện đã nối. Customer không
> scale model; “chuyển-đơn” cũ được thay bằng add-to-cart rồi checkout thông thường.

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

## 14. Chuẩn bị phản biện (study & defense)

**Mỗi thành viên trình bày được:** (1) Tổng thể §0 (stack, 4 tầng, luồng dữ liệu, phân vùng). (2) Phần của mình (§chức năng):
mỗi màn hình làm gì, gọi API nào, xử lý lỗi/edge-case ra sao. (3) ≥ 2 quyết định/deviation để bảo vệ.

**Câu hỏi hay gặp:** vì sao tách `api.js`/`hooks.js` khỏi page · TanStack Query giải quyết gì so với `useEffect`+`fetch` ·
chống tạo đơn trùng thế nào (Idempotency-Key) · vì sao admin detail hydrate cache · quy trình chặn bug lên production (§13).

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

_Tài liệu sống — cập nhật khi đổi logic, phân công, hoặc quy trình. Lần cập nhật gần nhất: 2026-07-27._
