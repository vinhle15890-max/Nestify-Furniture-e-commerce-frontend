# Cơ chế hiện hành của frontend

> Tài liệu kiến trúc/runtime canonical, kiểm chứng từ code ngày 2026-07-17. Nó phải tự đủ để review cơ chế
> đã triển khai; spec/plan chỉ là lịch sử quyết định, không phải bằng chứng triển khai.

## Kiến trúc và ranh giới enforcement

React Router điều phối trang; TanStack Query giữ server state; Zustand giữ auth/UI/editor. Request nghiệp vụ
đi qua `apiClient` (gắn Bearer token, chuẩn hóa lỗi Laravel thành `ApiError`), ngoại trừ PUT trực tiếp vào URL
presigned R2. `AdminRoute` và `RequirePermission` chỉ là UX guard; Sanctum + `check.permission:*` ở API là
security boundary. Tương tự, FE ẩn purchase với staff nhưng backend mới bảo đảm “chỉ customer mua”.

### Runtime, data flow và route enforcement

- Vite chỉ đọc `VITE_API_BASE_URL`; code không có fallback nếu biến thiếu. TanStack Query mặc định stale 60
  giây, retry query một lần và không refetch khi focus cửa sổ; mutation không retry mặc định.
- Router lazy-load page. Storefront, planner toàn màn hình và admin là ba shell riêng. `/__dev/r2-model` chỉ
  tồn tại khi `import.meta.env.DEV`; shared-room public không cần auth. Account/wishlist/checkout/order/planner
  editor cần token và client thấy `email_verified_at`.
- Storefront có bốn route hỗ trợ công khai lazy-loaded: `/shipping`, `/returns`, `/privacy`, `/contact`.
  Footer điều hướng nội bộ đến các route này. Đây là nội dung tĩnh, không gọi API: giao hàng và đổi trả phải
  nói theo dữ liệu cấp sản phẩm/current order state; trang liên hệ mở `mailto:support@nestify.vn`, không giả
  lập form gửi khi chưa có endpoint tiếp nhận.
- `apiClient` đọc token mới nhất từ Zustand trước từng request, unwrap response body và chuẩn hóa lỗi. 401
  ngoài `/auth/*` xóa auth persisted và React Query cache; login/register/logout cũng clear cache tại session boundary.
  Lỗi 401 của login/register không tự logout để form giữ ngữ cảnh.
- Auth persist token+user trong `localStorage` key `nestify-auth`. Chat, preview-role, toast và editor chỉ ở
  memory. Bearer token trong storage và route guard đều không thay được validation/authorization server.
- `AdminRoute` chỉ yêu cầu có ít nhất một role khác `customer`. Từng nhánh yêu cầu: categories
  `manage_categories`; products/media/SEO `manage_products`; orders `manage_orders`; vouchers
  `manage_vouchers`; reviews `moderate_reviews`; users/roles `manage_users`; audit `view_audit`. Thiếu quyền
  render 403 tại URL hiện tại. “Xem với vai trò” chỉ thay permission dùng để render; token/danh tính thật giữ
  nguyên, backend vẫn xét quyền thật.

## Cá nhân hóa hành trình trên Home

`useJourneyContext` chỉ enable cho customer có token và `email_verified_at`, đồng thời loại staff bằng `isStaff`.
Nó dùng một contract chung `GET /me/journey-context`; backend chịu trách nhiệm tổng hợp phòng, wishlist,
recently-viewed và sản phẩm đã đặt, đồng thời trả continuation, category signals, discovery candidates và lý do.
Home ưu tiên continuation sau Featured Categories. Catalog stable-rank candidate có bằng chứng trong tập kết
quả hiện tại khi user chưa chọn sort; CatalogTray làm tương tự khi chưa search. Không surface nào giấu sản phẩm;
Catalog công bố việc đổi thứ tự và cho quay về thứ tự mặc định. Product
Detail nhắc đúng phòng đang tiếp tục. Account cung cấp opt-out và xóa riêng lịch sử `product_viewed`.

`PATCH /me/personalization` dừng ghi view mới nhưng không xóa phòng/wishlist/order. `DELETE
/me/personalization/history` chỉ xóa lịch sử hành vi. Khi context disabled/rỗng/lỗi, mọi surface giữ hành vi
công khai hiện có; giá, voucher, tồn kho, Cart và Checkout không được cá nhân hóa.

Các component `PersonalizedGreeting`, `SuggestedForYou` và `PersonalizedSection` cũ còn ở source nhưng không
được HomePage nối vào runtime. `RecentlyViewedStrip` vẫn hoạt động độc lập ở ProductPage.

## Room Planner Interaction Model

### Căn hộ và giới hạn phạm vi

Một tài khoản tương ứng một căn hộ; mỗi `room_scene` là một phòng độc lập trong
căn hộ đó. Backend giới hạn tối đa 8 phòng bằng transaction + user row lock và
`GET /room-scenes` trả `meta.limits`. `/account/rooms` là tổng quan căn hộ:
hiển thị số phòng, số món đang cân nhắc, số phòng còn có thể thêm và khóa entry
tạo mới khi đạt giới hạn. Guest vẫn chỉ có một draft room. Không có project
thứ hai, polygon hay trình vẽ tường tự do; room edit có vùng không đặt đồ chữ nhật
và vùng cửa với hộp bao cung quét.

Với route tạo phòng mới, form kích thước là điều kiện khởi tạo bắt buộc: khi editor
còn `idle`, dialog không có nút đóng và bỏ qua Escape/click ra ngoài. Chỉ submit hợp
lệ mới gọi `initNew` rồi mount canvas. Vì vậy người dùng không thể rơi vào workspace
trắng chưa có room shell; các dialog chỉnh sửa sau khi phòng đã sẵn sàng vẫn giữ hành
vi đóng bình thường.

### Hệ tọa độ và room shell

Phòng đặt tâm `(0,0,0)`: X=rộng, Z=sâu, Y=hướng lên, sàn Y=0. UI giới hạn rộng/sâu 2–30 m và cao
2–5 m; backend áp cùng giới hạn width/depth 2–30 m và height 2–5 m. Ba wall flag chỉ quyết
định mặt nào được render; tắt wall không mở miền kéo.

Store load API resource qua mapper thành item có `localId`, variant, transform và footprint; với model đã xác nhận,
footprint được khởi tạo ngay từ `model_size {x,y,z}` theo trục GLB của API, còn `width_cm/height_cm/depth_cm`
giữ ngữ nghĩa người dùng; `obstacles` được
serialize cùng scene và guest draft. Selection,
gizmo/view/edit mode và scale reference là state phiên xem, không serialize. `dirty` chỉ đánh dấu dữ liệu cần
lưu.

Vùng cản render trên sàn trong cả editor và shared viewer. Trong room edit, tạo vùng sẽ chọn ngay; người dùng
bấm vùng để chọn, kéo thân để di chuyển hoặc chuyển gizmo giữa translate/rotate, còn panel đồng bộ tọa độ và
kích thước chính xác. Vùng được kẹp trong biên phòng. Collision dùng SAT giữa footprint nội thất và OBB
vùng cản; cửa dùng hộp bao bảo thủ của cung quét. Conflict đi vào cùng cảnh báo overlap hiện có, không tự đẩy
vật thể ra ngoài. Backend validate shape/type/range nhưng chưa đối chiếu vùng cản với biên phòng.

### Kéo, xoay, snap và clamp

`PlacedItem` bọc Three group bằng drei `TransformControls`. Ở chế độ di chuyển, người dùng có thể kéo trực
tiếp trên thân model theo mặt phẳng sàn; gizmo vẫn là chỉ báo trục và là tay nắm thay thế. Cả direct-drag lẫn
gizmo-drag đều tắt OrbitControls để camera không tranh gesture, project live qua cùng snap/clamp và chỉ commit
một lần khi thả. Math dùng world coordinates, tương ứng mét của phòng.
Mỗi `onObjectChange` đọc transform sống rồi gọi `projectTransform`:

1. Ép Y=0.
2. Từ footprint/scale/góc Y tính AABB nửa kích thước:
   `hx'=hx|cosθ|+hz|sinθ|`, `hz'=hx|sinθ|+hz|cosθ|`.
3. Clamp tâm vào biên trừ nửa footprint. Nếu món lớn hơn phòng trên một trục, tâm về 0; món vẫn xuyên hai
   tường vì không có vị trí hợp lệ và code không tự thu nhỏ.
4. Wall snap chạy tự động sau clamp, từng trục độc lập, nhảy cạnh món áp tường khi cách dưới 0.2 m.

Vì projection chạy mỗi frame, đồ **dừng/clamp ngay tại tường**, không đi xuyên rồi sửa lúc thả. Code dịch
`TransformControls.positionStart` theo clamp delta để gizmo không tách model; helper distance line có thể bị
nén gần tường và pointer-up reset anchor. Mouse-up commit state; store chạy cùng projection lần nữa. Grid snap
là 0.1 m, rotation snap 15°. Người dùng giữ `Alt` trong lúc kéo/xoay để tạm bỏ cả grid snap và wall snap.
Xoay sát tường có thể đẩy tâm vào vì AABB thay đổi.

Thanh công cụ canvas chỉ giữ bốn ý định có nghĩa trực tiếp: góc nhìn 3D, nhìn từ trên, chỉnh kích thước và
mốc người/cửa. Snap và bắt tường không còn là hai công tắc bắt người dùng tự quản lý. Form kích thước dùng
giá trị nháp và chỉ gọi `resizeRoom` khi bấm **Áp dụng**, nên đóng/huỷ không làm biến đổi phòng.

**Server enforcement:** backend ép Y=0, kiểm item/obstacle bounds, dùng footprint model đã xác nhận sau xoay Y để kiểm vừa phòng và overlap; PATCH dimensions kiểm lại dữ liệu đang lưu. Model legacy chưa xác nhận chỉ kiểm tâm/Y vì chưa có footprint đáng tin cậy. Client vẫn projection/clamp tức thời để UX không phải chờ lỗi server.

### Kích thước thật và cấm scale

Sau GLB load, model được clone an toàn cho skinned mesh, đo `Box3`, dịch lên để đáy nằm trên sàn và báo
X/Y/Z cho store. `reportFootprint` no-op nếu sai khác dưới `1e-4`: tránh callback đo tạo state mới → render →
đo lặp vô hạn. Measurement là metadata dẫn xuất nên không dirty/history; nếu footprint đổi, item được
re-clamp.

Model đã admin-confirm được bake để 1 Three unit = 1 m. Model legacy/chưa confirm vẫn có thể có URL: trước
load dùng kích thước API đã xác nhận để dựng placeholder đúng tỷ lệ; model chưa xác nhận vẫn có footprint engine
1×1×1 m nhưng inspector/fallback không công bố số này như kích thước thật. Sau load, bounding box runtime được đo lại.

Customer không có scale gizmo; `updateTransform` còn xóa mọi `patch.scale`. Backend chỉ chấp nhận mỗi scale
axis `1 ± 0.000001`. Vì vậy arbitrary scale bị chặn **cả client và server**, không chỉ ẩn nút.

### Load failure

Không URL → khối 1 m “Chưa có mô hình 3D”. Suspense → khối wireframe “Đang tải mô hình”. Exception
`useGLTF` → error boundary, `console.error`, khối “Đang dùng khối thay thế”; đổi URL reset boundary. Không
auto-retry, không fallback ảnh 2D, không telemetry ngoài console. Placeholder dùng footprint API đã xác nhận khi có;
model chưa xác nhận dùng khối tạm nhưng UI ghi rõ chưa có số đo thật nên
collision/bounds chỉ là ước lượng.

### Selection, history, overlap và room resize

Click model dừng propagation rồi select; click sàn vô hình deselect. Room-edit mode làm furniture
reference-only. Duplicate deep-clone, ID mới, offset +0.3 m X/Z và clamp. Reset giữ footprint nhưng đưa
position/rotation về 0, scale 1. Undo/redo snapshot **chỉ items**, cap 50; add/duplicate/commit transform/delete/
reset có history. Resize/toggle wall, selection, measurement, scale reference không undo. Một drag thường là
một bước vì chỉ commit mouse-up; edit mới xóa redo.

Overlap dùng SAT giữa oriented rectangles trên bốn trục. Chạm mép (`1e-6`) không tính; item cao hiệu dụng
dưới 0.1 m (thảm) bị loại. Conflict chỉ tạo quầng/notice: không chặn kéo, save hay cart; backend không kiểm.

`resizeRoom` clamp room (2–30/2–5) rồi re-clamp tất cả item ngay. `setRoom` thô không re-clamp cho tới lần
transform sau. Scale reference là view aid, clamp tâm đơn giản, không dirty/history/backend.

Inspector cung cấp bốn hướng tinh chỉnh theo bước 0.1 m và 0.5 m; nhập X/Z chính xác nằm trong disclosure nâng
cao. Các nút này gọi cùng `updateTransform`, nên dùng cùng projection, bounds và history như pointer transform.

Phím tắt chỉ chạy khi editor `ready` và bỏ qua input/textarea/contenteditable: `1` translate, `2` rotate,
Delete/Backspace xóa, Escape bỏ chọn, Ctrl/Cmd+D duplicate, Ctrl/Cmd+Z undo, Shift+Ctrl/Cmd+Z hoặc Ctrl/Cmd+Y
redo. Các tổ hợp Ctrl/Cmd khác để browser xử lý. Undo/redo giữ selection nếu ID còn tồn tại.

Room-edit nhìn thẳng xuống, khóa Orbit rotation và làm furniture non-interactive. Bốn edge handle lấy trị
tuyệt đối khoảng cách tới tâm×2, snap bước 0.5 m rồi `resizeRoom`; kéo qua tâm không đảo phòng. Tắt một trong
ba wall chỉ đổi render/wall flag, không mở biên clamp. WebGL không khả dụng thì Canvas không mount; mất
context sau mount hiện overlay và browser được phép restore. Environment dùng drei preset `apartment`, có
dependency runtime tới asset preset ngoài bundle.

### Save/share/cart và capability boundary

Update gửi items thì backend replace toàn bộ trong transaction. Preview chụp canvas registry; unmount
unregister để không chụp canvas cũ. Preview upload là best-effort nên scene có thể lưu dù preview lỗi. Share
đặt public và token ổn định; public view read-only. Add-room-to-cart thêm 1 đơn vị mỗi placement, merge theo
variant và trả item thiếu stock; overlap không chặn. Thiết bị nhỏ/WebGL thiếu được chuyển sang notice trước
khi mount canvas.

**Needs human confirmation:** production CDN/environment map và CORS; số model legacy có URL nhưng thiếu
`model_scaled_at`; visual/material correctness của GLB bake (pipeline chỉ có geometry re-measure, không có
automated visual regression).

### Contract đầy đủ của editor store

- `reset` về idle; `initNew` gắn room/default walls và ready; `loadScene` cấp `localId` mới, xóa selection,
  history và dirty. `setName`/`setRoom` dirty; edit/gizmo/view/scale-reference là state phiên xem.
- `addVariant` tạo transform identity + footprint từ kích thước API đã xác nhận; nếu thiếu thì giữ footprint engine tạm 1 m với `footprintConfirmed=false`, ghi history, add/select/dirty. `duplicateSelected`
  deep-clone, ID mới, offset 0.3 m X/Z rồi clamp. Không có selection hợp lệ thì action phụ thuộc selection
  no-op.
- `reportFootprint` no-op khi mỗi trục lệch dưới `1e-4`; nếu đổi thì replace footprint và re-project nhưng
  không dirty/history. Epsilon ngăn vòng đo GLB → set state → render/đo vô hạn.
- `updateTransform` xóa `patch.scale`, snapshot rồi project/clamp. Lưu ý caller truyền ID không tồn tại vẫn
  tạo history+dirty; UI chuẩn không làm vậy. `resetSelectedTransform` giữ footprint/variant vì chỉ spread
  identity transform.
- Undo/redo snapshot `items` bằng `structuredClone`, cap 50, nên item không được chứa Three object. Edit mới
  xóa future; `markSaved(id)` chỉ set ID và clear dirty.

## Admin model upload → measure → confirm

1. Browser check đuôi `.glb` (UX-only), xin presign qua API có `manage_products`.
2. Server tạo expiring staging key/token và R2 temporary PUT; presign lỗi thì quên token.
3. Browser Axios PUT thẳng R2, giữ signed headers và content-type GLB. CORS/signature/network/expiry lỗi tại
   đây; UI toast chung, không phân loại CORS.
4. Measure API xác minh token đúng variant/chưa hết hạn, copy về temp, kiểm GLB header, chạy Node script
   timeout 120 s, yêu cầu bounds dương/hữu hạn, mark measured, luôn xóa temp.
5. UI mặc định quy ước Z=width, Y=height, X=depth; admin chỉ mở “Đổi hướng trục” khi GLB nguồn không đúng
   quy ước, rồi chọn một dimension/reference cm.
6. `confirmed=false` tính uniform factor và dimensions/warnings, không ghi DB/consume token.
7. `confirmed=true` khóa variant, đọc lại measured token, bake, re-measure với tolerance max(0.1%,1 mm),
   hash SHA-256, PUT immutable object, cập nhật URL/key/bounds/map/reference/factor/dimensions transactionally,
   rồi consume token khi lock còn giữ. Duplicate request thứ hai thấy token đã mất.
8. Sau commit best-effort xóa staging/model cũ thuộc managed namespace; rollback sau PUT cố xóa object mới;
   temp luôn xóa.

Category range sinh warning, không clamp. Model mới sau rollout phải ở leaf category; legacy được miễn.
Expired/wrong/unmeasured token là validation error; invalid GLB/empty bounds/Node timeout/bake mismatch không
cập nhật variant.

Client check `.glb` và `accept` chỉ là UX. Nó tạo `blob:` preview trước upload, revoke URL cũ/unmount; nếu
presign/PUT/measure lỗi thì progress về 0 và toast gộp, preview local có thể vẫn còn nhưng không có token dùng
để confirm. PUT dùng Axios độc lập, không bearer, normalize signed header array và ép MIME GLB. UI gửi sẵn
map Z=width, Y=height, X=depth và ẩn dropdown khỏi luồng chính; phần “Đổi hướng trục” hoán đổi axis đang dùng
thay vì buộc admin bỏ chọn thủ công. Calculate chỉ bật khi ba axis unique và reference >0; đổi
mapping/reference xóa calculation+acknowledgement. Confirm chỉ bật
sau checkbox thủ công. Preview là kiểm tra thị giác, không phải validator; CORS/signature fail xảy ra trực
tiếp giữa browser–R2 nên Laravel không thể trả field error chuẩn.

## SEO score và draft workflow

Storefront publish metadata qua `SeoHead`: title, description, canonical, robots, Open Graph, Twitter card và
JSON-LD được quản lý theo lifecycle route. Product dùng `AggregateOffer` khi có nhiều active variant, tính
low/high price và availability từ stock thật; auth/account/admin/404 dùng `noindex`. Laravel sinh sitemap từ
category + active product và robots policy; Vercel proxy hai file về cùng storefront origin. Production build
luôn prerender trang chủ với title/description/canonical, nội dung crawlable và JSON-LD `Organization` +
`WebSite`; có `VITE_API_BASE_URL` thì prerender thêm category/product. Canonical origin lấy từ `VITE_SITE_URL`,
với fallback production cố định `https://www.nestify.asia` (không bao giờ suy ra từ API origin). Metadata
prerender được đánh dấu để `SeoHead` thay thế khi hydrate, tránh hai canonical mâu thuẫn. Build không có API
base URL vẫn hoàn tất prerender trang chủ, bỏ qua category/product và ghi thông báo rõ; production gate đầy
đủ vẫn cần API base URL.

Production verification ngày 2026-08-06 xác nhận product HTML, canonical, Open Graph URL, Product JSON-LD,
robots và sitemap cùng dùng `https://www.nestify.asia`; Google Search Console đã chấp nhận submission
`sitemap.xml`. Trạng thái này chỉ xác nhận discovery submission, không đồng nghĩa mọi URL đã được index hoặc
có thứ hạng tìm kiếm.

Live score client-side, deterministic: title length 20 (pass 50–60, warn 30–70); meta length 20 (pass
140–160, warn 100–180); keyword trong title/meta/đoạn `<p>` đầu mỗi mục 15; H2+UL 15. Pass=full,
warn=half, fail=0; thiếu keyword làm ba keyword check warn; chỉ H2 hoặc UL làm structure warn; tổng làm tròn.

Bulk chọn IDs hoặc active product thiếu meta, bỏ pending draft, fan-out một queue job/product. Rate limit chung
10 AI calls/phút; 3 tries, backoff 30/60/120. AI thiếu một trong bốn core field là permanent failure;
transient error retry; final failure persisted. Draft không sửa product cho tới apply. Edit pending khiến
backend tính `pending_draft_score` bằng PHP cùng formula. JS `.length` đếm UTF-16 còn PHP `mb_strlen` đếm
ký tự, nên emoji có thể lệch dù tiếng Việt BMP thường trùng.

Apply copy non-empty fields và mark applied; dismiss đổi status. **Gap:** server apply chỉ cấm missing/already
applied, chưa bắt buộc pending, nên direct caller có thể apply failed/dismissed row còn dữ liệu.

Client review chỉ có pending/failed. Badge list và modal luôn tính lại bằng JS từ field đang render, không
tin persisted score. Modal cấm save nếu thiếu bốn field, title >70, meta description >300 hoặc keyword >100;
bộ đếm đổi tone sau 60/160 chỉ là guidance. PATCH sửa draft, không sửa live product; apply mới copy sang live.

## Catalog, product và nội dung

### RBAC admin: route, navigation, preview và mutation

`isStaff` coi user là staff khi có ít nhất một role khác `customer`; `can`/`canAny` chỉ đọc mảng permission
đã hydrate trong user. `AdminLayout` dùng tập quyền đó để lọc `adminNav`; `AdminHome` render dashboard khi có
`view_dashboard`, nếu không thì redirect tới mục đầu tiên được phép, và render `PermissionDenied` nếu không có
mục nào. Truy cập URL trực tiếp thiếu quyền vẫn ở URL đó nhưng nhận trang 403 client-side. Đây chỉ là UX:
request vẫn đi với token/danh tính thật và middleware Laravel quyết định 403.

Role UI tải permission catalog rồi tạo/sửa role bằng danh sách permission ID. Role locked chỉ xem; delete role
đang dùng có thể nhận 409 và UI đọc `users_count`. “Xem thử vai trò” thay tập permission render/navigation,
không impersonate và không đổi token, vì vậy một nút nhìn thấy trong preview vẫn có thể bị backend từ chối.
User UI tách customer/staff bằng filter server; promote/assign gửi toàn bộ role IDs đích, không phải delta.
Lock/unlock gửi status; nút tự ẩn trên dòng current user nhưng self-lock/last-admin/protected-role invariant vẫn
là server-only. Query role/permission lỗi được hiển thị retry, không giả thành danh sách rỗng (tránh vô tình
submit empty permission/role set).

Mọi API/hook role/user chỉ chuyển payload và invalidate query liên quan; chúng không phải security boundary.
Audit-log frontend chỉ đọc evidence server, map action slug sang nhãn tiếng Việt và giữ fallback raw slug khi
chưa có mapping. Việc backend ghi audit khi allow/deny và việc audit-write failure có chặn request hay không
được mô tả ở tài liệu backend; frontend không thể chứng minh enforcement chỉ từ việc một menu bị ẩn.

### Media asset và product attachment

Media library quản lý **asset tái sử dụng**; product gallery quản lý **attachment** trỏ tới asset/product và
optional variant. Library list/search phân trang, upload multipart qua Laravel, sửa alt text và delete asset.
Delete có thể bị backend từ chối khi asset đang được attachment/category dùng; FE không tự suy usage và sau
mutation chỉ invalidate cache. `MediaLibraryModal` trả các asset ID được chọn; attach gửi toàn bộ
`media_asset_ids` cùng `variant_id` nullable (`null` = dùng chung), không upload lại binary.

Product edit cũng cho upload multipart thẳng vào product, detach attachment, gắn attachment sang variant và
reorder bằng **toàn bộ** dãy attachment ID theo thứ tự mong muốn. UI reorder optimistic ở mức local display
nhưng server kiểm ownership/đủ tập; external Cloudinary delete và DB delete không thể atomic, nên lỗi cleanup
provider là boundary backend. `cloudinary_id` không được client đọc/gửi/hiển thị; browser rich-text upload là
luồng khác: xin signature rồi POST trực tiếp Cloudinary, do đó CORS/provider error không đi qua Laravel field
errors. Client chỉ tin `secure_url` trả về và sanitize HTML khi render.

**Gap/edge:** ẩn nút theo permission không ngăn direct request; duplicate attach, in-use delete, invalid
variant ownership và reorder thiếu/thừa ID do server reject. Production Cloudinary preset, CORS, lifecycle và
orphan cleanup cần human confirmation.

### Variant option/signature integrity

`cartesianVariants` chuẩn hóa option/value rồi tạo tích Descartes để đề xuất mọi combination. `variantSignature`
serialize value theo **thứ tự option canonical**, không theo thứ tự key object; `missingCombinations` so signature
đã có với matrix để chỉ đề xuất phần thiếu. `resolveVariant` chỉ trả variant khi mọi option đã chọn và signature
khớp; stock không được nhúng vào identity của combination.

`VariantOptionsPanel` chỉnh schema option; `VariantMatrixGenerator` preview/gửi batch combination thiếu;
`VariantFormModal` chặn duplicate quan sát ở client và gửi create/update. Đây là feedback sớm, không phải
guarantee: tab/network stale hoặc direct API có thể bypass, nên backend tái kiểm option coverage, value hợp lệ,
signature uniqueness và product ownership. Query mutations invalidate product detail/list để matrix không giữ
combination cũ. SKU rỗng được omit cho server tự sinh; FE không tự đảm bảo SKU toàn cục.

### Review moderation

Admin review query dùng cursor và chỉ là exception queue cho review có risk flag; approve/reject mutation cập
nhật/invalidate cache nhưng server mới kiểm permission và trạng thái transition. Storefront chỉ cho form chọn một
order `delivered` có variant thuộc product, trim nội dung, gửi `order_id` và evidence tuỳ chọn (màu, kích thước,
chất liệu, giao nhận, thời gian dùng); đây là convenience filter. Backend vẫn kiểm ownership/delivered/product/
duplicate. Review sạch được auto-publish và refetch public list; review có link/contact mới chờ admin. Điểm thấp
không phải risk signal. Comment rỗng bị chặn client và vẫn được server validate.

### AI description và RAG boundary

Product create/edit gửi product context, tone và tối đa bốn image URL đầu tiên theo thứ tự media tới endpoint
generate-description rồi cho admin chọn variation để điền form; không variation nào tự persist cho tới khi admin save product. Query hook
không retry mutation mặc định, nên Vertex/rate-limit/token-budget lỗi giữ form hiện tại và cần thao tác lại.
Customer chatbot nằm ngoài các thư mục inventory của tài liệu frontend nhưng runtime contract vẫn là: FE chỉ
gửi message hiện tại, giữ history trong memory và render source links; retrieval, ADC, distance threshold và
prompt budget hoàn toàn ở backend. Không được suy rằng lịch sử hội thoại UI được gửi cho model.

Catalog gửi filter bằng `filter[...]` cùng sort/cursor/limit; infinite query nối page server. Product option
tạo signature theo thứ tự option và chỉ enable một value nếu còn ít nhất một variant `available_stock > 0`
khớp value giả định cùng mọi lựa chọn hiện tại. Resolve variant chỉ thành công khi tổ hợp đủ/khớp; add-cart
vẫn được server revalidate.

Gallery sort `sort_order` và reset ảnh đầu khi variant đổi. Description được DOMPurify sanitize theo allowlist;
ảnh được thêm lazy/async, link `_blank` ép `noopener noreferrer`. Rich-text upload xin signature ngắn hạn ở
`/media/sign` rồi browser POST thẳng Cloudinary; file không qua app server.

Product page tạo `<title>`, description/OG meta và JSON-LD Product runtime, cleanup khi unmount. SPA không SSR
nên crawler không chạy JS có thể không thấy chúng. JSON-LD availability hiện luôn `InStock` khi có offer,
không đối chiếu stock — limitation cần tránh coi là inventory assertion.

Quantity client clamp 1..stock quan sát; `INSUFFICIENT_STOCK` cập nhật conflict, server vẫn authoritative.
Wishlist theo **variant**, không product. Variant inactive vẫn được trình bày như lựa chọn lịch sử nhưng không cho chuyển
giỏ; variant inactive mới bị BE từ chối khi add. Chỉ customer đăng nhập mới record view/query wishlist; suggested
category là slug xuất hiện nhiều nhất trong recently-viewed, hòa lấy slug gặp trước, không phải ML.

Review eligibility client tìm order `delivered` chứa variant product rồi gửi `order_id`; server phải xác minh
ownership/delivery/duplicate. Comment trim rỗng và map field errors; review list dùng cursor.

## Cart, checkout, payment và order

Cart/query cache phản chiếu server. Mutation invalidate cart; client không tự tính giá authoritative. Nó chặn
checkout khi quantity vượt `available_stock` quan sát và nói rõ chưa reserve hàng; backend kiểm kho lại khi
tạo order. Voucher hoàn toàn do API tính; FE chỉ dịch một số code exhausted/not-applicable/network.

Checkout UUID được giữ trong Zustand và `sessionStorage` key `nestify.checkout.idempotency-key`; reload cùng
tab restore, storage bị chặn thì degrade memory. POST order gửi `Idempotency-Key`. Network ambiguity giữ key và
declaration để retry; chống duplicate thật nằm ở backend.

Trước submit, client khóa declaration gồm cart basis (item/variant/qty/price/subtotal/total), địa chỉ, payment
và voucher. Cart tải các voucher áp dụng được cho subtotal/user hiện tại và là nơi duy nhất cho khách chọn mã; Checkout nhận mã qua query string rồi xác minh lại, không lặp editor. CTA Cart và Checkout nằm trong action bar cố định theo viewport, có khoảng đệm đáy để không che nội dung. Địa chỉ chỉ thành snapshot sau server create; stock chưa reserve. Recovery record giữ order ID để
reload fetch chính order cũ thay vì POST lại. COD dừng ở order created. PayOS tạo order pending trước, rồi mở
session; FE chỉ gửi `gateway`, còn backend tự tạo PayOS return/cancel URL từ cấu hình + order ID. Session lỗi/rate-limit
giữ order và retry chỉ gọi payment-session, không tạo order thứ hai.

Return chỉ nhận `order_id` nguyên dương; sai/thiếu thì không reconcile. ID hợp lệ POST backend reconcile, không
tin query status. Pending poll sau khi response trước settle, mỗi 3 giây, tối đa 10 request tính cả request đầu;
hết budget cho retry thủ công. Rời pending invalidate order queries. Cancel/status transition/refund UI chỉ
đề nghị thao tác; eligibility, kho và gateway side effect là server enforcement.

## Auth, account, chat và admin khác

Register/login persist token+user. Profile chỉ gửi password fields khi có password, kèm current password và
confirmation. Forgot/reset/verify/resend phụ thuộc token/mail server. Address CRUD/default invalidate query;
format và ownership cuối cùng do server validate.

Chat in-memory, reload xóa lịch sử. UI trim, `maxLength=1000`, khóa send song song, append user rồi response.
Mỗi request chỉ gửi một `message`, không gửi conversation history; source response được render thành link.
Token-budget có message riêng, lỗi khác chung. Đây là stateless chat từ góc nhìn FE.

Admin product/variant form dùng RHF/Yup cho feedback, nhưng API là authority. Variant matrix là Cartesian
product/signature theo option. Media có upload multipart trực tiếp product hoặc attach reusable asset IDs;
`variant_id=null` là shared media, reorder gửi toàn bộ ID order. Client không dùng `cloudinary_id`. Product
DELETE được trình bày/đặt tên là archive, không nên gọi hard delete.

Category/product/voucher/role/user/review/order/audit/media CRUD đều qua API + query invalidation. Route/nav
permission là UX-only; protected-role, self-lock, last-admin, delete-in-use và transition invariant phải do
server reject. Dashboard chỉ render aggregate server; audit action chưa map vẫn cần fallback dữ liệu thô.

## Cơ chế platform khác

- Cart/order/stock/price nguồn thật ở server. Checkout dùng idempotency key để retry không tạo order đôi;
  payment return reconcile server-side, không tin query string browser.
- Media library tách reusable asset khỏi product attachment; `cloudinary_id` không dùng ở client. Variant tag
  nullable nghĩa media dùng chung.
- Auth store persist token; verified/customer/permission vẫn phải enforce server-side.

**Needs human confirmation:** webhook delivery, queue/scheduler, Redis persistence, mail, R2/Cloudinary CORS
và CDN cache policy là runtime configuration ngoài code.

## Phạm vi tài liệu chính thức và needs human confirmation

README, `AGENTS.md`, tài liệu này, `FE-TEAM-WORKFLOW.md` và canonical brand corpus `docs/nestify/00`–`07`
là bộ tài liệu chính thức. `docs/superpowers/{specs,plans,audits}`, `docs/spikes`, `docs/nestify/briefs`,
`docs/nestify/templates`, `.claude/skills` và backlog `TASKS.md` là decision/work records, không phải runtime
contract. Claim triển khai trong work record không được dùng làm bằng chứng nếu code và tài liệu chính thức
không xác nhận.

**Needs human confirmation:** production env/proxy/HTTPS/CSP và SPA history fallback; browser support matrix;
PayOS webhook/credential; mail/queue; R2/Cloudinary/drei environment CORS-cache-retention; số model legacy
chưa scale-confirm; visual/material QA của bake; accessibility/SEO trên crawler mục tiêu. Repo không cung cấp
bằng chứng E2E production hoặc automated visual regression để xác nhận các điểm này.

## Phụ lục A — Tier 2 frontend reference ledger (142/142)

Phụ lục này là index **đủ** cho các inventory item không cần diễn giải Tier 1. Mỗi tên dưới đây là một entry
đã check-off; path là tương đối từ `src/`. CRUD/API/hook chỉ cung cấp transport/cache/UX, còn validation và
authorization cuối cùng ở Laravel trừ khi entry nói khác.

### `pages/roomPlanner` — component/helper tham chiếu

- `CatalogTray` — lọc catalog xuống variant có model rồi gọi action add; khả dụng/stock vẫn do dữ liệu server.
- `RoomEditPanel` — form điều khiển dimension/wall của room shell; clamp thật trong editor action.
- `RoomSetupDialog` — nhận dimension dương để khởi tạo phòng; backend validate lại payload khi save.
- `RoomSummary` — group placement theo variant, nhân quantity và cộng giá quan sát; giá này không authoritative.
- `ScaleLegend` — render mốc kích thước phòng, không mutate scene.
- `SmallScreenNotice` — chặn UX planner trên viewport không phù hợp, không phải authorization/capability server.
- `Room` — render floor và ba wall theo flag; wall visibility không thay miền clamp.
- `ScaleReference` — người mannequin/view aid có thể kéo, không serialize/dirty/history.
- `SceneStage` — camera, light, environment và OrbitControls dùng chung; environment preset là runtime dependency.
- `MODEL_STATE` — enum UI cho no-model/loading/ready/error; không phải trạng thái persisted của variant.
- `visibleWalls` — default ba wall thành visible khi field thiếu.
- `snapHalf` — làm tròn room-resize handle theo bước 0.5 m.

### `features/roomPlanner` — action/helper tham chiếu

- `reset`, `initNew`, `loadScene` — lifecycle editor idle/new/load; load reset selection/history/dirty.
- `setName`, `setRoom`, `setEditMode` — setter tên/room/mode; `setRoom` thô không re-clamp item.
- `toggleScaleRef`, `setScaleRefPos` — view-only scale reference; position chỉ clamp tâm vào room.
- `markSaved` — ghi ID scene và clear dirty sau mutation thành công.
- `toPlaceableItems` — flatten product response thành variant có model dùng được trong tray.
- `summarizeItems` — group item theo variant cho summary/cart intent; không định giá server.
- `makeLocalId` — tạo ID client cho placement chưa persist.
- `clamp`, `snapToFloor`, `baseOffset`, `clampToRoom` — helper Three cơ bản; collision chính dùng footprint-aware
  projector Tier 1, còn `clampToRoom` chỉ clamp point.

### `pages/admin` và `features/admin` — CRUD/reference entries

- `AdminDashboardPage`, dashboard `getDashboard`/`useDashboard` — render aggregate read-only từ server.
- `AdminAuditLogsPage`, `actionLabels`, `getActionLabel`, `getAuditLogs`, `useAuditLogs` — filter/paginate/expand
  audit evidence; unknown action giữ raw slug.
- `AdminCategoriesPage`, `CategoryFormModal`; category `get/create/update/delete` APIs và bốn hooks — CRUD cây
  category; leaf/in-use/cycle invariant do backend enforce.
- `AdminProductsPage`; product `getProducts`, `getProduct`, `createProduct`, `updateProduct`, `archiveProduct`
  và các query/mutation hooks tương ứng — list/detail/form/archive transport; archive không phải hard-delete UI.
- `productSchema`, `flattenCategories`, `toProductPayload` — Yup feedback, flatten tree cho select và chuẩn hóa
  form payload; server vẫn là validator canonical.
- `AdminVouchersPage`, `VoucherFormModal`; voucher `get/create/update/delete` APIs và bốn hooks — CRUD cấu hình
  voucher, không quyết định applicability/usage tại client.
- `AdminDashboardPage`, `AdminProductsPage`, `AdminCategoriesPage`, `AdminVouchersPage` chỉ render action theo
  permission UX; direct API vẫn do middleware chặn.
- `AdminAuditLogsPage` không tạo audit log và không bảo đảm completeness của log sink.

### `lib` — utility tham chiếu

- `apiClient` — gắn Bearer token, unwrap envelope, chuẩn hóa Laravel error và clear auth trên 401 ngoài auth.
- `ApiError`, `normalizeError`, `NETWORK_ERROR_MESSAGE` — error shape/message dùng chung; không đổi HTTP outcome.
- `applyServerErrors`, `formLevelMessage`, `focusFirstError`, `useFocusFormAlert` — map 422 vào form và focus
  accessibility; field không map được trở thành form alert.
- `findCategoryPath` — tìm breadcrumb trong cây category.
- `formatPrice`, `formatDate` — format hiển thị locale, không dùng để tính tiền/ngày authoritative.
- `redirectToExternal` — điều hướng URL payment ngoài SPA; URL phải đến từ backend.
- `useCursorQuery`, `useOffsetQuery` — wrapper pagination TanStack Query.
- `queryClient` — stale/retry/refetch defaults dùng chung.
- `slugify` — gợi ý slug client; uniqueness do backend.
- `useReveal` — IntersectionObserver presentation-only.

### Verification entries — mỗi file test là một inventory entry

Các test sau xác minh contract gần file cùng tên; test là evidence hồi quy, không tự tạo runtime enforcement:

- Room Planner pages: `CatalogTray.test.jsx`, `OverlapNotice.test.jsx`, `PlannerToolbar.test.jsx`,
  `RoomEditPanel.test.jsx`, `RoomPlannerPage.test.jsx`, `RoomSetupDialog.test.jsx`, `RoomSummary.test.jsx`,
  `ScaleLegend.test.jsx`, `SelectedItemPanel.test.jsx`, `ShareSceneDialog.test.jsx`, `SharedRoomItems.test.jsx`,
  `SharedRoomPage.test.jsx`, `SmallScreenNotice.test.jsx`, `scene/FurnitureModel.test.jsx`,
  `scene/PlacedItem.test.jsx`, `scene/Room.test.jsx`, `scene/RoomCanvas.test.jsx`,
  `scene/RoomEditOverlay.test.jsx`, `scene/ScaleReference.test.jsx`, `scene/SceneStage.test.jsx`,
  `scene/r3fProps.test.js`, `useEditorShortcuts.test.jsx`.
- Room Planner features: `addRoomToCart.test.js`, `api.test.js`, `canvasCapture.test.js`, `collision.test.js`,
  `editorStore.test.js`, `mappers.test.js`, `placeable.test.js`, `summary.test.js`, `threeD.test.js`.
- Admin pages/components: `AdminDashboardPage.test.jsx`, `AdminHome.test.jsx`, `AdminLayout.test.jsx`,
  `PermissionDenied.test.jsx`, `adminNav.test.js`, `auditLogs/AdminAuditLogsPage.test.jsx`,
  `categories/AdminCategoriesPage.test.jsx`, `media/AdminMediaLibraryPage.test.jsx`,
  `orders/AdminOrdersPage.test.jsx`, `orders/AdminOrderDetailPage.test.jsx`,
  `products/AdminProductCreatePage.test.jsx`, `products/AdminProductEditPage.test.jsx`,
  `products/AdminProductsPage.test.jsx`, `products/AdminSeoReviewPage.test.jsx`,
  `products/VariantMatrixGenerator.test.jsx`, `products/VariantModelScaleFlow.test.jsx`,
  `products/VariantOptionsPanel.test.jsx`, `reviews/AdminReviewsPage.test.jsx`,
  `roles/AdminRolesPage.test.jsx`, `roles/RoleFormDialog.test.jsx`, `roles/RolePermissionMatrix.test.jsx`,
  `users/AdminCustomersPage.test.jsx`, `users/AdminEmployeesPage.test.jsx`,
  `users/AdminRoleDialogs.test.jsx`, `users/LockUserButton.test.jsx`, `vouchers/AdminVouchersPage.test.jsx`.
- Admin features: `auditLogs/actionLabels.test.js`, `media/MediaGrid.test.jsx`,
  `media/MediaLibraryModal.test.jsx`, `products/api.test.js`, `roles/api.test.js`, `users/api.test.js`.
- Lib: `apiClient.test.js`, `categoryPath.test.js`, `cloudinary.test.js`, `errors.test.js`,
  `formErrors.test.js`, `format.test.js`, `idempotency.test.js`, `navigation.test.js`, `pagination.test.jsx`,
  `roles.test.js`, `seoScore.test.js`, `slugify.test.js`, `stock.test.js`, `variantOptions.test.js`.

Coverage limitation: repo không có automated browser E2E/visual regression production. Unit/component test có
thể xác nhận projection, payload và UI state nhưng không xác nhận CORS/CDN/WebGL/gateway thật.

## Phụ lục B — Tier 1 check-off ledger (188/188)

Tier 1 được check theo exact mapping: spatial interaction 32; model load/footprint 6; model presign workflow 9;
SEO 17; order 13; payment/idempotency completion 1; cart/stock 3; RBAC 34; room lifecycle 27; media 23 entry
mới cộng một cross-reference product editor; AI description 3 entry mới cộng một cross-reference; review 7;
variant-option integrity 13. GLB bake, address default và outbox/expired reservation là backend-only trong
inventory đã chốt. Tổng unique frontend là **188**; **142** entry còn lại nằm ở Phụ lục A, tổng **330/330**.

## Self-check reconciliation 2026-07-17

Đã kiểm tra tài liệu trả lời độc lập: (1) xoay sofa sát tường vì sao dịch tâm, clamp xảy ra lúc nào và server
có lặp constraint không; (2) direct API có scale được không; (3) presign/PUT/measure/calculate/bake GLB fail
ở đâu và client còn state gì; (4) thảm có overlap và overlap có chặn save/cart không; (5) reload sau khi tạo
order nhưng PayOS session lỗi có POST order lần hai không; (6) emoji làm hai SEO score lệch thế nào.
