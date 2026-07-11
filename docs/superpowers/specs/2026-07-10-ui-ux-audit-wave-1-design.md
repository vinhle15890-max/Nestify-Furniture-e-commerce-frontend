# Nestify UI/UX Audit — Wave 1 Remediation Design

**Date:** 2026-07-10

**Status:** Implemented — automated verification complete; runtime verification pending

**Repos:** Nestify frontend + backend

**Source:** Static UI/UX audit, issue IDs AUD-01, AUD-02, AUD-03

**Evidence level:** Verified from code and automated tests. Browser/runtime behavior still needs runtime verification.

---

## 1. Context

Wave 1 fixes the smallest set of P0/P1 issues that currently break a flow or expose a high-consequence
admin action without enough error prevention. It is not a visual redesign and does not include the
remaining P2/P3 audit backlog.

| Issue | Severity | Priority | Verified evidence |
|---|---|---|---|
| AUD-01 — Admin order detail cannot recover from a direct URL or refresh | High | P0 | AdminOrderDetailPage reads only React Router location state or an already-populated list cache. The backend exposes list/status/refund endpoints but no admin detail endpoint. |
| AUD-02 — Refund and cancellation actions execute without confirmation | High | P1 | AdminOrderDetailPage calls both mutations directly. Refund records money state; full refund may cancel/restock. Admin cancellation reverses inventory/voucher holds and is terminal in the UI. |
| AUD-03 — Mobile Room Planner enters setup before showing a desktop-only dead end | High | P1 | RoomSetupDialog is rendered outside the CSS-only desktop shell and opens for a new route. SmallScreenNotice is static and offers no continuation link. Hidden editor code can still mount because CSS hiding is not a capability gate. |

### Existing strengths to preserve

- Admin routes are permission-gated with manage_orders; refund visibility is separately gated with
  refund.
- Order transitions are enforced by the backend state machine.
- Radix-based Modal already provides focus trap, Escape handling, title/description association, and
  focus restoration.
- Room Planner deep-link intent already lives in the URL as product and variant query parameters.
- Room Planner state is already preserved in memory while the page remains mounted.

---

## 2. Goals

1. An authorized admin can open or refresh any valid admin order detail URL and receive canonical,
   current data from the server.
2. No admin cancellation or refund request is sent until the admin reviews and confirms the exact
   action.
3. A viewport below the Planner desktop breakpoint never opens setup, fetches Planner-only data, or
   mounts the 3D editor.
4. A mobile visitor can preserve the current route/deep-link and deliberately continue on a desktop.
5. All changes stay inside the existing route, API, component, token, and permission conventions.

### Success criteria

- Direct navigation to /admin/orders/:id renders the order after one detail request.
- Refreshing that URL no longer depends on navigation state or list cache.
- A 404 is distinguishable from a temporary request failure; temporary failure offers Retry.
- Clicking “Đã hủy” or submitting the refund form sends zero mutations before confirmation.
- Repeated clicks while a mutation is pending cannot create duplicate requests.
- On a viewport below lg, RoomSetupDialog and RoomCanvas are absent from the rendered tree.
- Copying the continuation link retains pathname, search parameters, and hash.
- No database migration, new dependency, token migration, or business-rule change is required.

---

## 3. Scope

### In scope

- A read-only admin order detail endpoint protected by manage_orders.
- Canonical TanStack Query loading for AdminOrderDetailPage, with router/list data used only as initial
  data.
- Loading, 404, recoverable error, and retry states on admin order detail.
- Confirmation dialogs for admin cancellation and refund.
- Accurate consequence copy based only on fields available in the API.
- Synchronizing the frontend processing transition with the backend-supported cancellation path.
- A JavaScript media-query capability gate aligned with Tailwind lg.
- A continuation-link action and feedback in SmallScreenNotice.
- Targeted feature/component tests and contract documentation.

### Out of scope

- Automatic PayOS refund, payment gateway changes, refund idempotency redesign, or new refund rules.
- Adding payment history or calculating the remaining refundable amount in the detail response.
- A mobile 3D editor, touch manipulation, or a responsive redesign of the desktop editor.
- Persisting an unsaved room across devices, emailing a link, QR codes, or anonymous scene storage.
- RBAC/role management changes.
- Refactoring the whole Admin OrderController or OrderService.
- Design-token migration, global component redesign, or unrelated audit issues.
- Database schema changes or migrations.

---

## 4. Design decisions

### 4.1 AUD-01 — Canonical admin order detail

#### Backend contract

Add the following route inside the existing manage_orders permission group:

| Method and path | Permission | Success | Errors |
|---|---|---|---|
| GET /api/admin/orders/{id} | manage_orders | 200 with data: Admin OrderResource | 401 unauthenticated, 403 forbidden, 404 NOT_FOUND |

The endpoint loads:

- user with id, name, email;
- items;
- shippingAddress.

The response uses the existing Admin OrderResource. Add payment_method to that resource so the admin
resource matches its documented “standard order fields plus user” contract and cancellation copy can
distinguish COD from PayOS without guessing.

No payment relation, gateway payload, or cloudinary_id is serialized.

The implementation remains deliberately narrow: the show query may follow the current Admin
OrderController query style. Refactoring index/updateStatus into a new repository or service is a
separate architecture task.

#### Frontend data ownership

Server data belongs to TanStack Query. AdminOrderDetailPage must not keep a second editable order copy
in local component state.

Use this precedence:

1. Canonical source: GET /api/admin/orders/{id}.
2. Initial render acceleration: location.state.order.
3. Initial render fallback: an order found in an existing admin list cache.
4. Neither initial source may suppress the canonical request.

The detail query key must be a child of the existing admin-order prefix so the current mutation
invalidation strategy can refresh both lists and details:

- all/list prefix: admin, orders
- detail: admin, orders, detail, orderId

Initial data is considered stale immediately. A list-to-detail navigation can render without a blank
flash, while the background request still reconciles the record with the server.

#### Page states

| Condition | Required UI |
|---|---|
| No initial data, first request pending | Centered Spinner with a Vietnamese loading label |
| Data available, background refetch pending | Keep the detail visible; do not replace it with a blocking loader |
| Request returns 404 and no data exists | “Không tìm thấy đơn hàng” plus link back to the order list |
| Request fails for another reason and no data exists | User-facing ApiError message, “Thử lại” button, and link back |
| Route id is invalid | Do not issue a request; show the not-found state |
| Initial data exists but background refresh fails | Keep the usable snapshot visible; surface a non-blocking error rather than erasing content |

#### Mutation/cache behavior

- A successful status transition updates the active detail cache immediately from its response,
  preserving fields absent from a partial response, then invalidates the admin-order prefix.
- A successful refund invalidates the admin-order prefix. This refetch is required because a full
  refund may also change the order status to cancelled.
- AdminOrdersPage may keep passing location.state.order as an initial-data optimization.

#### UI fields

Wave 1 does not redesign the page. Existing customer, item, total, status, and action sections remain.
The API may return shipping_address, but adding a new address section is not required for this wave
unless it is needed to avoid an empty or broken existing state.

---

### 4.2 AUD-02 — Confirmation for cancellation and refund

Cancellation and refund are separate operations and their copy must not imply identical side effects.

#### Action matrix

| Action | First click/submit | Confirmation required | Backend fact that UI must communicate |
|---|---|---|---|
| Routine transition to processing, shipped, or delivered | Execute current transition flow | No | It is a forward operational state transition |
| Transition to cancelled | Open cancellation confirmation | Yes | It reverses applicable inventory/voucher holds and changes the order to a terminal UI state |
| Refund any amount | Validate the form, freeze a payload snapshot, open refund confirmation | Yes | Nestify records the refund; PayOS money transfer remains manual. A full remaining refund may cancel/restock |

The frontend transition map must match the backend evidence:

- pending_payment → cancelled
- paid → processing or cancelled
- processing → shipped or cancelled
- shipped → delivered

This wave does not add cancellation from shipped or delivered.

#### Cancellation confirmation

Use the existing admin Modal and Button components. Do not use window.confirm.

Required content:

- Title: “Hủy đơn hàng”
- Identity: order number, with #id fallback
- Consequence: the order changes to “Đã hủy”; applicable inventory and voucher holds are reversed;
  the action cannot be undone in the current UI.
- Payment note only when evidence supports it:
  - paid PayOS or processing PayOS: cancellation does not transfer money automatically; staff must
    process/record the refund separately;
  - COD or pending payment: do not show a paid-order refund claim.
- Secondary action: “Quay lại”
- Destructive action: “Xác nhận hủy đơn”

Behavior:

- Opening and closing the dialog sends no request.
- Confirm sends exactly one cancelled transition.
- Both actions and dialog dismissal are disabled/ignored while pending.
- On success, close the dialog, refresh the detail/list caches, and show a success toast.
- On failure, keep the dialog open and show the ApiError message in an element with role alert so the
  admin can retry or cancel.

#### Refund confirmation

The existing form remains the data-entry surface. Keep backend validation unchanged:

- amount: required numeric, minimum 1000;
- reason: optional, maximum 500 characters.

Submitting a valid form creates an immutable pending payload and opens a confirmation dialog. It does
not call the API.

Required dialog content:

- Title: “Xác nhận hoàn tiền”
- Order number
- Exact formatted amount from the frozen payload
- Reason, or “Không có”
- Clear notice that the system records the refund but does not transfer money through PayOS
- Cautious consequence copy: if this amount completes the remaining refundable balance, the backend
  may cancel the order and reverse stock/voucher effects
- Secondary action: “Quay lại”
- Primary destructive action: “Xác nhận hoàn [amount]”

Do not label the request “full” or “partial” by comparing it with order.total. Prior partial refunds
are not present in the current response, so such a conclusion would be unverified.

Behavior:

- Closing before confirm preserves the editable form values.
- Confirm sends exactly the frozen amount/reason once.
- Pending state blocks duplicate confirmation and dismissal.
- On success, close the dialog, clear amount/reason, show the existing result plus a success toast,
  and refetch order detail/list data.
- On error, keep the dialog open, retain the payload, and announce the ApiError inline with role alert.

#### Accessibility requirements

- Modal title and description must be present so Radix creates an accessible dialog name and
  description.
- Initial focus may use the safe secondary action; destructive confirmation must never be the only
  focusable control.
- Escape/overlay close works only while no mutation is pending.
- Pending button labels change to “Đang hủy...” or “Đang hoàn tiền...” and remain disabled.
- Error text is not color-only and is announced.

---

### 4.3 AUD-03 — Room Planner small-screen capability boundary

#### Breakpoint and rendering contract

Use one JavaScript media-query hook with the same threshold as Tailwind lg:

- query: min-width 64rem;
- matchMedia unavailable: fail closed and treat the editor as unsupported;
- subscribe to query changes so resizing is handled without reloading.

Below the breakpoint:

- render SmallScreenNotice as the page result;
- do not render RoomSetupDialog;
- do not render RoomCanvas or the desktop editor shell;
- do not fetch an existing scene or product deep-link preload solely for the editor;
- do not install active editor keyboard shortcuts.

At or above the breakpoint:

- preserve the existing setup, scene loading, deep-link, editor, save, share, cart, and checkout
  behavior;
- opening a new route triggers RoomSetupDialog;
- resizing back to desktop in the same mounted tab resumes in-memory editor state.

The route-reset effect must depend on the route id, not the viewport. A breakpoint change must never
reset the editor store.

#### Continuation URL

Build the continuation URL from browser origin plus React Router location pathname, search, and hash.
This keeps MemoryRouter/runtime behavior deterministic and preserves:

- product and variant deep-link parameters;
- unrelated UTM parameters;
- an existing scene id;
- hash, if present.

SmallScreenNotice offers:

- Heading: “Tiếp tục thiết kế trên máy tính”
- Explanation that the editor requires a larger screen
- Primary button: “Sao chép liên kết”
- Secondary action: “Về cửa hàng”
- Success feedback with role status
- Failure feedback with role alert and a read-only/selectable URL for manual copy

Use navigator.clipboard.writeText when available. Clipboard absence or rejection is a recoverable UI
state, not a silent failure.

#### Intent and unsaved-state honesty

The continuation URL preserves route intent; it does not serialize an unsaved room.

| Situation | Required message/behavior |
|---|---|
| Mobile enters a new plain Planner URL | Setup never opens; copied URL reopens the new Planner entry on desktop |
| Mobile enters with product/variant | Do not fetch or clear params on mobile; copied URL retains the exact deep-link |
| Mobile opens /room-planner/:id | Copied URL retains the saved scene id; desktop authentication/authorization remains unchanged |
| Desktop editor is resized below lg with unsaved work | Keep in-memory state in the tab; state clearly that copied URL contains only the last saved route/version |
| User chooses “Về cửa hàng” with dirty work | Reuse the existing dirty-exit confirmation; do not bypass it with a plain Link |

No copy may claim that unsaved dimensions/items were synchronized across devices.

#### Visual constraints

- Reuse semantic tokens, Button/Input primitives, and lucide icons.
- No new palette, raw hex value, or site-wide CTA treatment.
- The notice should remain a calm capability boundary, not an error page.
- Touch targets and focus rings inherit existing primitives.

---

## 5. User flows

### 5.1 Admin opens an order from the list

1. List navigation passes an order snapshot.
2. Detail renders immediately from initial data.
3. Detail query fetches canonical server data.
4. UI reconciles without a blocking flash.

### 5.2 Admin opens or refreshes a direct order URL

1. Route validates id.
2. Page shows loading.
3. GET admin order detail succeeds.
4. Page renders the same detail/action surface as list navigation.

Failure branches:

- 404 → not-found state;
- network/5xx → recoverable error with Retry;
- 401/403 remain owned by global auth/permission handling.

### 5.3 Admin cancels an order

1. Admin selects “Đã hủy”.
2. Modal describes terminal/inventory/payment consequences.
3. Admin goes back → zero mutation, or confirms → one mutation.
4. Success closes and refreshes; error remains recoverable in the modal.

### 5.4 Admin records a refund

1. Admin enters amount and optional reason.
2. Native/form constraints validate input.
3. Submit opens a review modal with a frozen payload.
4. Admin goes back → form preserved, or confirms → one refund mutation.
5. Success refetches the order because full refund may change its status.

### 5.5 Mobile visitor follows a Planner deep-link

1. Media query fails the desktop capability gate.
2. No setup/editor/product preload is mounted.
3. Notice explains the boundary and lets the visitor copy the exact URL.
4. On desktop, the normal protected Planner route processes the retained deep-link.

---

## 6. Error and edge-case policy

- Invalid admin order id: no request and no raw exception.
- Initial admin snapshot plus refetch failure: snapshot remains usable; no false not-found.
- Refund error: do not clear amount/reason.
- Cancellation error: do not silently close.
- Modal Escape/overlay during pending: ignore close request.
- Clipboard permission denied: expose the URL for manual copy.
- matchMedia change: toggle capability UI without resetting store.
- Mobile deep-link fetch: remain disabled so product/variant params cannot be consumed or redirected
  before desktop continuation.
- No API retry may duplicate a mutation.

---

## 7. Testing strategy

### Backend feature tests

- Authorized admin can show one order with user, items, shipping_address, payment_method.
- Missing order returns 404.
- Guest returns 401.
- Customer without manage_orders returns 403.
- Existing list, transition, refund, inventory, and audit tests stay green.

### Frontend admin tests

- Direct URL loads through getOrder.
- location.state displays initial data and still performs canonical fetch.
- loading, 404, recoverable error, and Retry states.
- routine transition remains direct.
- cancellation opens modal and does not mutate before confirm.
- cancellation cancel/confirm/pending/error paths.
- processing exposes both shipped and cancelled, matching backend.
- refund review modal freezes and displays payload.
- refund cancel/confirm/pending/success/error paths.
- full-refund response causes detail/list refetch.
- refund button remains hidden without refund permission.

### Frontend Planner tests

- useMediaQuery initial match, change subscription, cleanup, and unsupported fallback.
- editor shortcuts disabled below the capability boundary.
- below lg: notice visible; setup and canvas absent; scene/product preload calls absent.
- above lg: existing setup/editor tests remain green.
- mobile deep-link copy retains product, variant, UTM, scene id, and hash.
- clipboard success and failure/manual-copy feedback.
- resizing does not reset current editor state.
- dirty “Về cửa hàng” path uses the existing confirmation.

### Manual runtime verification

- Hard refresh a real /admin/orders/:id URL.
- Test 404 and temporary API failure/retry.
- Keyboard through both confirmation dialogs; verify focus return and Escape behavior.
- Attempt double click under network throttling.
- Test Planner at 1023 px and 1024 px, then resize across the boundary.
- Test clipboard allowed and denied on a mobile browser.
- Copy a product/variant Planner URL to a desktop browser and verify the intended variant is retained.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Initial list snapshot hides stale server data | Initial data is stale immediately and canonical query always runs |
| Mutation response lacks every loaded relation | Merge only changed fields, then invalidate/refetch canonical detail |
| Cancellation copy implies an automatic refund | Conditional PayOS note explicitly separates cancellation from refund |
| Refund dialog incorrectly calls a request full/partial | Never infer from order.total; let backend response determine status |
| CSS and JavaScript breakpoint drift | Reuse the lg-equivalent 64rem query and cover 1023/1024 runtime boundary |
| Resizing resets unsaved work | Keep viewport state out of the route-reset dependency |
| Copied URL is mistaken for unsaved-scene persistence | Explicit last-saved/route-intent copy; no cross-device persistence claim |
| Hidden mobile editor still consumes WebGL/network | Conditional rendering and gated queries, not CSS hiding alone |

---

## 9. Do not touch in Wave 1

- Role/permission management and the recently completed RBAC UI.
- PaymentService refund calculations, inventory actions, voucher release logic, or gateway behavior.
- Customer order cancellation semantics.
- Room scene persistence schema or public sharing contract.
- Room Planner geometry, snapping, scale, snapshot, commerce handoff, or 3D controls.
- Global admin/storefront palette and typography.
- Other P2/P3 audit findings.

---

## 10. Definition of done

- All acceptance criteria above are covered by automated tests.
- Targeted backend and frontend suites pass.
- Full frontend lint and test suite pass.
- No migration or dependency change exists.
- API and workflow docs describe the new detail endpoint and accurate cancellation/refund behavior.
- Component Bible and FE workflow docs no longer describe SmallScreenNotice as a static dead end.
- Storefront UI changes pass nestify-review.
- Runtime verification items are recorded as pass/fail; unresolved items are not silently marked done.
