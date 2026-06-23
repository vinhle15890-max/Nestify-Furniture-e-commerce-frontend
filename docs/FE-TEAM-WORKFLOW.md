# Nestify Frontend — Phân công & Quy trình làm việc nhóm (4 FE)

> **Mục đích.** Tài liệu này (1) chia việc rõ ràng cho 4 thành viên Frontend theo miền tính
> năng, (2) thống nhất quy trình git / PR / deploy, và (3) làm tài liệu để cả nhóm **học** toàn
> bộ hệ thống và **phản biện** được phần của mình trong buổi bảo vệ đồ án.
>
> Đọc kèm: `AGENTS.md` (convention + stack), `docs/TASKS.md` (bảng việc theo phase),
> `docs/superpowers/specs/2026-06-13-fe-nestify-design.md` (spec thiết kế + hợp đồng FE/BE).

---

## 0. Bức tranh tổng thể — ai cũng phải nắm

Nestify là web thương mại điện tử nội thất: **storefront** (khách mua) + **admin** (quản trị),
gọi API Laravel riêng qua HTTP.

**Stack (tóm tắt):**

| Mảng | Lựa chọn |
|---|---|
| Build / ngôn ngữ | Vite + React 18, **JavaScript thuần (JSX, không TypeScript)** |
| Định tuyến | React Router v6 (`createBrowserRouter`, `src/app/router.jsx`) |
| Server state | TanStack Query v5 |
| Client state | Zustand + `persist` (`authStore`, `uiStore`, `toastStore`) |
| HTTP | 1 instance axios duy nhất (`src/lib/apiClient.js`, gắn Bearer token + interceptors) |
| Styling | Tailwind CSS v4 (token trong `src/styles/tokens.css`) |
| Form | React Hook Form + Yup |
| Test | Vitest + React Testing Library + jsdom |

**Kiến trúc & luồng dữ liệu (mọi người cần vẽ lại được khi phản biện):**

```
pages/<domain>/         ← màn hình "mỏng": chỉ compose UI, KHÔNG gọi apiClient trực tiếp
   │  dùng
   ▼
features/<domain>/hooks.js   ← TanStack Query hooks (useQuery/useMutation)
   │  gọi
   ▼
features/<domain>/api.js     ← hàm axios cho domain đó
   │  qua
   ▼
lib/apiClient.js (axios)     ← gắn token, chuẩn hoá lỗi → ApiError, base URL = VITE_API_BASE_URL
   │
   ▼
Laravel API (api.nestify.asia)
```

- **Lỗi**: mọi lỗi API nổi lên dưới dạng `ApiError` (`src/lib/errors.js`) có `code`, `message`
  (đã tiếng Việt, hiển thị thẳng trong toast), `details`. Không bao giờ show lỗi axios thô.
- **Phân vùng**: storefront mở công khai / sau `ProtectedRoute`; admin sau `AdminRoute`.
- **State**: dữ liệu server → TanStack Query; auth → `authStore`; UI tạm (drawer, nav) →
  `uiStore` (không persist).

---

## 1. Phân công 4 FE — theo miền tính năng

Chia theo **miền** để mỗi người sở hữu một mảng *end-to-end* (data → hooks → page → test), dễ
học sâu và bảo vệ được phần của mình. Điền tên thành viên vào cột "Người phụ trách".

| Track | Người phụ trách | Phạm vi (phase) | Thư mục sở hữu chính |
|---|---|---|---|
| **FE1 — Khám phá storefront** | _(tên)_ | Phase 2 + design-system/home | `pages/{home,catalog,product}`, `features/catalog`, `components/{home,layout}`, `ProductCard` |
| **FE2 — Phễu mua hàng** | _(tên)_ | Phase 3, 4, 5 | `pages/{cart,wishlist,checkout,orders}`, `features/{cart,wishlist,checkout,orders,reviews}` |
| **FE3 — Tài khoản & Nền tảng** | _(tên)_ | Phase 1, 0, 7 | `pages/{auth,account}`, `features/{auth,addresses,chat}`, `lib/`, `store/`, `routes/` |
| **FE4 — Quản trị & Chất lượng** | _(tên)_ | Phase 8, 9, 10 | `pages/admin/*`, `features/admin/*` |

> Phase 6 (3D Room Planner) đang **hoãn** — ai xong track sớm sẽ nhận; cần thêm `three` +
> `@react-three/fiber` + `@react-three/drei`.

### FE1 — Khám phá storefront (Home · Catalog · Product)
- **Làm gì:** trang chủ (hero + section sản phẩm), nav danh mục (mega-menu nested `children`),
  listing danh mục (lọc/sort/infinite-scroll), trang chi tiết sản phẩm (chọn variant đổi
  giá/tồn kho, gallery ảnh/video theo `sort_order`, `description` sanitize bằng DOMPurify),
  khu hiển thị review đã duyệt.
- **Cần học để phản biện:** cursor pagination (`useInfiniteQuery`) khác offset thế nào; vì sao
  `available_stock` theo variant điều khiển nút Add-to-cart; cách query key đổi khi đổi filter.

### FE2 — Phễu mua hàng (Cart · Wishlist · Checkout · Orders · Reviews)
- **Làm gì:** giỏ hàng (qty, áp voucher xem trước), wishlist (move-to-cart, toggle báo hàng),
  checkout (chọn địa chỉ mặc định → voucher → cổng PayOS → tạo đơn → tạo phiên thanh toán →
  redirect), trang `/checkout/return` poll trạng thái đơn, lịch sử & chi tiết đơn (Hủy / Thanh
  toán lại chỉ khi `pending_payment`), form đánh giá.
- **Cần học để phản biện:** **Idempotency-Key** (`lib/idempotency.js`) chống tạo đơn trùng;
  xử lý `409 INSUFFICIENT_STOCK` / `409 ORDER_ALREADY_PAID` / `429 RATE_LIMITED`; tại sao form
  review nằm ở `/p/:slug` chứ không ở `/orders/:id` (xem deviation Phase 5 trong TASKS.md:
  snapshot đơn không có `product_id`).

### FE3 — Tài khoản & Nền tảng (Auth · Account · Addresses + hạ tầng dùng chung)
- **Làm gì:** login/register/forgot/reset/verify-email, màn chặn "xác thực email", trang tài
  khoản + sổ địa chỉ (CRUD + đặt mặc định). **Đồng thời giữ nền tảng dùng chung:** `apiClient`,
  `errors`, `pagination`, các store Zustand, `router.jsx`, `ProtectedRoute`/`AdminRoute`. (AI
  Chat — Phase 7 — nằm ở track này khi mở lại.)
- **Cần học để phản biện:** vòng đời token trong `authStore` (persist key `nestify-auth`); cơ
  chế guard route; map `VALIDATION_FAILED` → lỗi field, phân biệt `401` vs `403 ACCOUNT_INACTIVE`.
- **Lưu ý đặc thù:** vì là chủ "nền tảng dùng chung", mọi thay đổi ở `lib/`, `store/`, `router`,
  `components/auth/AuthLayout` đều ảnh hưởng cả nhóm → **PR phải review kỹ và báo trước nhóm**.

### FE4 — Quản trị & Chất lượng (Admin · Polish · Testing)
- **Làm gì:** admin categories/products(+variants,+media)/orders(+refund), moderation review,
  voucher CRUD, users (read-only), audit-logs; pass accessibility/responsive/performance.
- **Cần học để phản biện:** vì sao trang admin detail **hydrate từ cache** (không có
  `GET /admin/products/{id}`); state machine trạng thái đơn (chỉ render bước hợp lệ); refund
  **đồng bộ**; payload reorder media là `{ids:[...]}` (không phải `media_order`); voucher đọc
  `meta.last_page` phẳng (xem deviation Phase 8–9 trong TASKS.md).

---

## 2. Quy trình Git / PR / Deploy

### Mô hình nhánh
- **`dev`** = nhánh tích hợp; **Vercel deploy production (`www.nestify.asia`) build từ đây.**
- **`main`** = mốc ổn định cũ, **không** deploy. Không làm việc trực tiếp trên `main`/`dev`.
- Mỗi việc mở **một nhánh từ `dev`**, đặt tên: `feat/<domain>-<mô-tả-ngắn>`,
  `fix/<mô-tả>`, `docs/<mô-tả>`. Ví dụ: `feat/checkout-voucher-preview`.

### Vòng đời một task
```
nhánh từ dev → code (TDD) → tự kiểm (lint + test + build) → push →
  mở PR (base = dev) → 1 đồng đội review → CHỦ PROJECT merge → Vercel build & deploy từ dev
```
- **Chỉ chủ project merge vào `dev`.** Đây là cổng kiểm soát chất lượng và là nơi xử lý
  conflict — tránh mỗi người tự merge gây loạn (xem §3).
- PR nhỏ, thường xuyên; một PR = một mục tiêu rõ ràng.

### Checklist BẮT BUỘC trước khi mở PR
- [ ] `npm run lint` → **0 lỗi**
- [ ] `npm test -- --run` → **tất cả pass**
- [ ] `npm run build` → **thành công**
- [ ] Không thêm file `.ts`/`.tsx`; không hex màu thô (dùng token); UI **tiếng Việt**
- [ ] Page vẫn "mỏng": API/logic nằm trong `features/<domain>/`, không gọi `apiClient` từ page

### Quy ước commit & PR
- Commit theo dạng `type: mô tả` (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`).
- PR mô tả: *làm gì*, *vì sao*, *test thế nào*, ảnh chụp UI nếu đổi giao diện.

---

## 3. Bài học từ sự cố thật (case study để phản biện)

> Ngày 23/06/2026, production FE gặp sự cố: **mọi deep-link 404** và **toàn bộ UI mới không
> lên production** dù code đã có trên repo. Đây là tình huống thực tế rất tốt để phản biện về
> quy trình. Năm bài học:

1. **Đừng revert một merge rồi merge lại nhánh cũ.** Một PR feature bị merge nhầm vào `dev`,
   bị `git revert`, rồi nhánh đó được **merge lại** → git thấy commit "đã reachable" nên
   **không khôi phục** nội dung đã bị revert → **mất nguyên mảng UI mới** (home components,
   `AuthLayout`...). ➜ *Cách đúng:* nếu muốn lấy lại thứ đã revert, hãy **revert chính commit
   revert đó** (`git revert <sha-của-commit-revert>`), KHÔNG merge lại nhánh.

2. **Giải quyết conflict phải cẩn thận.** Lần merge lại trộn hai phiên bản file → **rớt dòng
   import** (`Card`, `AuthLayout`) và **nhân đôi khối JSX** → build fail / crash runtime. ➜
   Sau khi resolve conflict, **luôn chạy `npm run build` + `npm test`** trước khi để merge.

3. **`npm run build` KHÔNG bắt mọi lỗi.** `Card is not defined` là **ReferenceError lúc
   chạy**; bundler (rollup) bỏ qua biến chưa định nghĩa nên **build vẫn "thành công"** nhưng
   trang trắng/crash với người dùng. ➜ Phải chạy **cả test (Vitest render trang)** mới phát
   hiện — đây là lý do checklist yêu cầu cả `test` lẫn `build`.

4. **Hiểu cổng deploy của Vercel.** Domain production build từ **Production Branch = `dev`**;
   push lên nhánh khác chỉ ra **preview URL**. Khi build `dev` **fail**, Vercel **giữ bản
   deploy-thành-công-cũ** → dễ tưởng "đã cập nhật mà không thấy đổi". ➜ Luôn kiểm tab
   Deployments trên Vercel xem build mới nhất **Ready** hay **Error**, và nó build từ commit nào.

5. **`vercel.json` phải nằm trên nhánh production.** Thiếu luật SPA rewrite
   `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` thì **mọi
   refresh/deep-link/link email 404** (Vercel trả NOT_FOUND vì không có file tĩnh khớp path),
   dù app chạy bình thường khi bấm trong trang. ➜ Đảm bảo `vercel.json` luôn có trên `dev`.

**Kết luận quy trình rút ra:** mọi thay đổi vào production **đi qua PR → chủ project review &
merge → Vercel deploy**; không ai push thẳng/merge nhanh vào `dev`; build + test xanh là điều
kiện cứng để merge.

---

## 4. Quy ước code (tóm tắt từ AGENTS.md — đọc bản đầy đủ trước khi code)

- **Không TypeScript** — chỉ `.js`/`.jsx`.
- **Feature folders:** `features/<domain>/api.js` (axios) + `hooks.js` (TanStack Query). Page
  chỉ compose.
- **Lỗi:** dùng `ApiError`; hiển thị `error.message` (đã tiếng Việt) trong toast.
- **Pagination:** `useCursorQuery` / `useOffsetQuery` từ `lib/pagination.js`.
- **Design token:** dùng class semantic (`bg-surface`, `text-foreground`, `border-border`...);
  **không hex thô**.
- **Ngôn ngữ UI:** tiếng Việt, không i18n.
- **Alias:** `@/` → `src/`.
- **TDD:** viết test fail trước, rồi implement (Vitest + RTL).

---

## 5. Chuẩn bị phản biện (study & defense)

**Mỗi thành viên cần trình bày được:**
1. **Tổng thể** (§0): stack, kiến trúc 4 lớp, luồng dữ liệu, phân vùng storefront/admin.
2. **Phần của mình** (§1): mỗi màn hình làm gì, gọi API nào, xử lý lỗi/edge-case ra sao.
3. **Ít nhất 2 quyết định kỹ thuật/deviation** để bảo vệ (lấy từ phần "cần học" của track mình
   + mục Deviations trong `docs/TASKS.md`).

**Buổi review chéo (đề xuất):** mỗi người trình bày track của mình ~10 phút cho 3 người còn
lại + Q&A — vừa kiểm tra hiểu, vừa luyện phản biện.

**Câu hỏi giám khảo hay hỏi (chuẩn bị trước):**
- Vì sao tách `api.js`/`hooks.js` khỏi page? (tách concern, dễ test, tái dùng, page mỏng)
- TanStack Query giải quyết gì so với tự `useEffect` + `fetch`? (cache, invalidation,
  trạng thái loading/error, dedupe request)
- Chống tạo đơn trùng thế nào? (Idempotency-Key per lần checkout)
- Vì sao trang admin detail không gọi API riêng? (BE không có endpoint detail → hydrate cache)
- Quy trình đảm bảo không đẩy bug lên production là gì? (§2 + §3: PR review + build/test gate +
  chủ project merge + Vercel gating)

---

_Tài liệu sống — cập nhật khi đổi phân công hoặc quy trình. Lần cập nhật gần nhất: 2026-06-23._
