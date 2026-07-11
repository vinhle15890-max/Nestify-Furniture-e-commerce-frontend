# Nestify UI/UX Audit — Wave 1 Implementation Plan

**Date:** 2026-07-10

**Status:** Implemented — automated verification complete; runtime verification pending

**Design spec:** docs/superpowers/specs/2026-07-10-ui-ux-audit-wave-1-design.md

**Issues:** AUD-01 (P0), AUD-02 (P1), AUD-03 (P1)

**Repos:** Nestify-Furniture-e-commerce-backend and Nestify-Furniture-e-commerce-frontend

---

## Execution record

- AUD-01, AUD-02, and AUD-03 are implemented in the scoped frontend/backend files.
- Automated proof: AdminOrderTest 22/22; focused frontend Wave 1 suite 52/52; full frontend suite
  599/599; frontend lint has zero errors and two pre-existing React Refresh warnings.
- A full backend informational run is not green in the existing environment: Redis-backed deep-health
  checks and the in-progress Room Scene feature fail outside this wave. The targeted admin-order suite
  is green, and no Room Scene backend file was changed.
- The local Snyk scanner is unavailable, so no Snyk pass is claimed.
- No migration, dependency manifest, or production data was changed. No commit was created.
- Every row in the manual runtime matrix below is **Needs runtime verification**.
- The detailed checklists below are retained as the original execution procedure; this section is the
  implementation handoff record.

---

## Goal

Deliver three narrow remediations:

1. make admin order detail independently loadable from its URL;
2. add explicit, accessible confirmation before admin cancellation/refund;
3. enforce the Room Planner desktop boundary before setup/editor work and preserve mobile route intent.

This plan is TDD-first. It deliberately excludes redesign, migrations, dependency changes, RBAC work,
and business-rule changes.

---

## Execution order

| Order | Task | Dependency | Primary repo |
|---|---|---|---|
| 0 | Preflight and WIP guard | None | Both |
| 1 | Admin order detail API contract | None | Backend |
| 2 | Canonical admin order detail query and states | Task 1 | Frontend |
| 3 | Admin cancellation/refund confirmation | Task 2 | Frontend |
| 4 | Responsive capability primitives | None | Frontend |
| 5 | Small-screen continuation notice | Task 4 | Frontend |
| 6 | Room Planner capability orchestration | Tasks 4–5 | Frontend |
| 7 | Contract/workflow/design documentation sync | Tasks 1–6 | Both |
| 8 | Full verification and handoff | Tasks 1–7 | Both |

Tasks 1 and 4 can be implemented independently, but do not merge partial behavior into the page until
their tests pass.

---

## Global guardrails

- Read the workspace AGENTS.md, each repo AGENTS.md, and the design spec before editing.
- Plain JavaScript/JSX only in the frontend.
- Do not add or update dependencies.
- Do not create or run a migration.
- Do not alter PaymentService, inventory actions, voucher logic, customer cancellation, or RBAC.
- Do not expose cloudinary_id.
- Keep AdminOrderDetailPage protected by manage_orders and the refund action protected by refund.
- Reuse Modal for admin confirmation; do not create a second dialog primitive.
- Reuse semantic tokens and lucide icons; no raw colors.
- Use nestify-ui for the storefront SmallScreenNotice change and nestify-review before declaring the
  Room Planner task complete.
- Do not commit unless the user explicitly asks.
- Preserve unrelated work. Stop and report if an overlapping file becomes dirty during execution.

---

## Task 0 — Preflight and WIP guard

**Files:** none

- [ ] Read:
  - workspace AGENTS.md;
  - frontend AGENTS.md;
  - backend AGENTS.md;
  - design spec linked above;
  - backend docs/FE_AI_CONTEXT.md order section;
  - backend docs/14-workflows.md refund/admin sections;
  - frontend docs/nestify/03_Design_DNA.md and 04_Component_Bible.md capability boundary.
- [ ] Capture git status separately in both repos.
- [ ] Confirm no uncommitted work overlaps:
  - backend OrderController, Admin OrderResource, api routes, AdminOrderTest;
  - frontend admin orders feature/page/tests;
  - frontend Room Planner page/notice/shortcuts/tests and shared hooks.
- [ ] If overlap exists, inspect and preserve it. Do not overwrite or reset it.
- [ ] Confirm the current baseline targeted tests pass before changing behavior. If a baseline test
  already fails, record it separately rather than attributing it to Wave 1.

**Exit gate:** clean or understood worktrees; no source file changed yet.

---

## Task 1 — Backend: add the admin order detail contract (AUD-01)

### Files

- Modify: Nestify-Furniture-e-commerce-backend/src/routes/api.php
- Modify: Nestify-Furniture-e-commerce-backend/src/app/Http/Controllers/Admin/OrderController.php
- Modify: Nestify-Furniture-e-commerce-backend/src/app/Http/Resources/Admin/OrderResource.php
- Modify: Nestify-Furniture-e-commerce-backend/src/tests/Feature/Admin/AdminOrderTest.php

### Interface produced

- GET /api/admin/orders/{id}
- Permission: manage_orders
- Response: data containing the Admin OrderResource
- Required detail fields: id, order_number, status, payment_method, subtotal, discount_amount, total,
  notes, user, items, shipping_address, created_at
- Errors: existing 401/403/404 envelopes

### TDD steps

- [ ] Add imports for any test fixtures used, including OrderItem and OrderShippingAddress.
- [ ] Add a happy-path feature test:
  - create an order owned by a customer;
  - set payment_method to payos;
  - create at least one order item;
  - create the order shipping-address snapshot;
  - request GET /api/admin/orders/{id} as the super admin;
  - assert 200;
  - assert the exact order id/status/payment_method;
  - assert user id/name/email;
  - assert one item;
  - assert shipping-address recipient/address fields.
- [ ] Add a missing-order test that asserts 404.
- [ ] Add a guest test that asserts 401.
- [ ] Add a customer-without-permission test that asserts 403.
- [ ] Run AdminOrderTest and confirm the new happy path fails because the route does not exist.

Suggested targeted command, following backend docs/internal/AI_CONTEXT.md:

    sg docker -c "docker compose -f docker-compose.yml -f docker-compose.test.tmp.yml run --rm --no-deps --entrypoint php app artisan test --filter=AdminOrderTest"

If the documented temporary Compose overlay is absent, create it exactly as prescribed in the
backend testing instructions and remove it after verification. Do not run migrations.

- [ ] Add GET orders/{id} inside the existing check.permission:manage_orders route group.
- [ ] Add OrderController.show:
  - load user:id,name,email, items, and shippingAddress;
  - use findOrFail;
  - return data with a new Admin OrderResource;
  - do not add payment/refund logic.
- [ ] Add payment_method to Admin OrderResource.
- [ ] Confirm no new relation or sensitive infrastructure field is serialized.
- [ ] Re-run AdminOrderTest.
- [ ] Run targeted Pint only on the changed PHP files if formatting is needed; do not reformat
  unrelated files.

### Acceptance criteria

- [ ] Authorized GET detail returns all fields needed by the current page and consequence copy.
- [ ] Missing/guest/forbidden branches are covered.
- [ ] Existing list, transition, refund, inventory, and audit assertions remain green.
- [ ] No migration, model, service, or payment behavior changed.

### Risk

Low. The endpoint is read-only. The main risk is accidentally returning an under-loaded conditional
resource or broadening serialized data.

---

## Task 2 — Frontend: canonical admin order detail query and page states (AUD-01)

### Files

- Modify: Nestify-Furniture-e-commerce-frontend/src/features/admin/orders/api.js
- Modify: Nestify-Furniture-e-commerce-frontend/src/features/admin/orders/hooks.js
- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/admin/orders/AdminOrderDetailPage.jsx
- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/admin/orders/AdminOrderDetailPage.test.jsx

### Interfaces produced

- ordersApi.getOrder(id)
- adminOrderKeys.all
- adminOrderKeys.detail(id)
- useAdminOrder(id, options)

Keep the existing list hook API stable.

### TDD steps: direct loading and states

- [ ] Update the test setup so getOrder has a valid default response for tests that begin with
  location.state.
- [ ] Add a direct-URL test with no router state and an empty QueryClient:
  - getOrder resolves with baseOrder;
  - the page renders order/customer/items;
  - getOrder is called with numeric id 101.
- [ ] Add an initial-data reconciliation test:
  - location.state contains the order;
  - getOrder is deferred;
  - initial detail is visible before resolution;
  - getOrder is still called;
  - resolving a changed server status updates the rendered badge/actions.
- [ ] Add a first-load spinner test with a deferred getOrder promise.
- [ ] Replace the old “no state means not found” assumption with a real 404 test using ApiError status
  404.
- [ ] Add a non-404 failure test:
  - show the ApiError message;
  - show a “Thử lại” button;
  - second request succeeds after Retry.
- [ ] Add an invalid route-id test:
  - no getOrder request;
  - not-found state renders.
- [ ] Run the page test and confirm these tests fail before implementation:

    npm test -- --run src/pages/admin/orders/AdminOrderDetailPage.test.jsx

### Implementation steps

- [ ] Add getOrder(id) calling GET /admin/orders/{id}.
- [ ] Export a stable query-key helper:
  - all equals the existing admin/orders prefix;
  - detail nests detail and the numeric id under that prefix.
- [ ] Add useAdminOrder:
  - calls getOrder;
  - is enabled only for a positive finite integer id;
  - accepts initialData/options without allowing callers to replace queryKey/queryFn;
  - treats initial data as stale so mount still reconciles with the server.
- [ ] Keep findOrderInCache, but use its result and location.state only to construct query initial data.
- [ ] Remove local order/setOrder server-state duplication.
- [ ] Derive order from query.data.data.
- [ ] Implement state order exactly:
  1. valid data exists → render detail even if refetching or a background refresh failed;
  2. first request pending → Spinner;
  3. no data plus 404/invalid id → not-found state;
  4. no data plus other error → recoverable error with Retry and list link.
- [ ] If a background refresh fails while initial data is visible, keep the detail on screen and show
  non-blocking feedback; do not convert it to not-found.
- [ ] Keep AdminOrdersPage navigation state unchanged as a fast-path optimization.
- [ ] Re-run the targeted page test.

### Cache requirements

- [ ] Detail query key is a descendant of adminOrderKeys.all.
- [ ] Existing invalidateQueries on the admin-order prefix reaches list and detail.
- [ ] Do not set a positive staleTime that suppresses canonical refetch after list navigation.

### Acceptance criteria

- [ ] Direct URL, refresh, and list navigation all converge on the same server-backed page.
- [ ] 404 and temporary failure have different recovery UI.
- [ ] Initial data prevents a blank flash but never becomes the only source of truth.
- [ ] No raw axios error is rendered.

### Risk

Medium. Query initialization can accidentally suppress refetch or erase usable initial data on a
background error. Tests must cover both.

---

## Task 3 — Frontend: confirm admin cancellation and refund (AUD-02)

### Files

- Modify: Nestify-Furniture-e-commerce-frontend/src/features/admin/orders/hooks.js
- Modify: Nestify-Furniture-e-commerce-frontend/src/features/admin/orders/statusTransitions.js
- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/admin/orders/AdminOrderDetailPage.jsx
- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/admin/orders/AdminOrderDetailPage.test.jsx

Do not create a new dialog primitive.

### TDD steps: transition parity

- [ ] Update baseOrder with payment_method so consequence branches are explicit.
- [ ] Change the processing transition test to expect both “Đang giao” and “Đã hủy”, matching
  OrderService.transition.
- [ ] Preserve tests for paid, shipped, and terminal statuses.

### TDD steps: cancellation confirmation

- [ ] Add a test that clicking “Đã hủy” opens an accessible dialog named “Hủy đơn hàng”.
- [ ] Assert updateOrderStatus has not been called at dialog open.
- [ ] Add “Quay lại” test: close and assert zero mutation.
- [ ] Add confirm test: one call with id and cancelled.
- [ ] Add a PayOS paid/processing consequence-copy assertion.
- [ ] Add a COD assertion that does not claim an automatic/manual paid refund is owed.
- [ ] Add pending test with a deferred mutation:
  - confirm button label changes;
  - confirm and back buttons are disabled;
  - a second click cannot send a second request;
  - onOpenChange requests do not close the dialog.
- [ ] Add error test:
  - ApiError message appears inside the open dialog with role alert;
  - payload can be retried.
- [ ] Keep a routine shipped transition test proving “Đang giao” still executes without a
  confirmation modal.

### TDD steps: refund confirmation

- [ ] Change the current refund test so form submission opens a dialog and sends zero API calls.
- [ ] Assert the dialog shows:
  - order number;
  - formatted amount;
  - exact reason or “Không có”;
  - recorded-refund/manual-PayOS warning.
- [ ] Add “Quay lại” test:
  - zero mutation;
  - form amount and reason remain.
- [ ] Add confirm test:
  - one call with the frozen numeric amount and trimmed reason;
  - modifying unrelated state cannot alter the frozen payload.
- [ ] Add no-reason test that omits reason from the API payload.
- [ ] Add pending/double-submit/dismissal test with a deferred promise.
- [ ] Change the refund error test so the error is announced inside the still-open confirmation
  dialog and amount/reason remain available.
- [ ] Add success test:
  - dialog closes;
  - amount and reason clear;
  - success/result feedback renders;
  - getOrder is called again or the detail query is otherwise demonstrably invalidated/refetched.
- [ ] Preserve the permission test: no refund control when the user lacks refund.
- [ ] Run the targeted test and confirm failures precede implementation.

### Implementation steps: cache synchronization

- [ ] In useUpdateOrderStatus on success:
  - merge response.data into the existing detail record for that id without dropping user/items;
  - invalidate the admin-order prefix for canonical reconciliation.
- [ ] In useRefundOrder on success:
  - invalidate the admin-order prefix;
  - do not infer the resulting order status from the refund response.

### Implementation steps: page interaction

- [ ] Add local UI-only state for:
  - pending cancellation;
  - frozen pending refund payload;
  - confirmation error.
- [ ] Route transition clicks:
  - cancelled opens confirmation;
  - all other valid transitions call the existing transition handler.
- [ ] Add cancelled to the processing transition list.
- [ ] Use Modal title and description, existing Button variants, and semantic tokens.
- [ ] Render exact consequence copy from the spec. Condition payment messaging on status and
  payment_method; do not guess.
- [ ] During pending:
  - disable both modal actions;
  - ignore close requests;
  - use explicit progress labels.
- [ ] Keep errors inline with role alert and keep the modal open.
- [ ] Change refund form submit into “freeze payload then open modal”.
- [ ] Add maxLength 500 to the optional reason input.
- [ ] After refund success, clear the form and pending payload; preserve the existing result display
  and add a success toast if not already present.
- [ ] Re-run:

    npm test -- --run src/pages/admin/orders/AdminOrderDetailPage.test.jsx

### Acceptance criteria

- [ ] Zero destructive/money mutation occurs before explicit confirmation.
- [ ] One confirmation produces at most one request.
- [ ] Error recovery does not lose the form/payload.
- [ ] Cancellation and refund copy do not imply the same payment behavior.
- [ ] Processing cancellation is available because backend evidence supports it.
- [ ] Routine transitions do not gain unnecessary friction.

### Risk

Medium. Incorrect consequence copy can mislead staff, and stale detail state after full refund can
show the wrong status. Conditional copy and canonical refetch are mandatory.

---

## Task 4 — Frontend: responsive capability primitives (AUD-03)

### Files

- Create: Nestify-Furniture-e-commerce-frontend/src/hooks/useMediaQuery.js
- Create: Nestify-Furniture-e-commerce-frontend/src/hooks/useMediaQuery.test.jsx
- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/useEditorShortcuts.js
- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/useEditorShortcuts.test.jsx

### Interfaces produced

- useMediaQuery(query) returns a boolean.
- useEditorShortcuts(enabled = true) keeps current behavior by default and installs no active listener
  when disabled.

### TDD steps: useMediaQuery

- [ ] Build a controllable window.matchMedia mock that records:
  - initial matches;
  - addEventListener/removeEventListener calls;
  - a change callback.
- [ ] Add tests:
  - returns the synchronous initial match;
  - updates after a change event;
  - removes the listener on unmount;
  - falls back to false when matchMedia is unavailable;
  - optionally supports legacy addListener/removeListener without changing the public API.
- [ ] Run:

    npm test -- --run src/hooks/useMediaQuery.test.jsx

- [ ] Implement the hook with a lazy state initializer and an effect subscribed to the query object.
- [ ] Re-run the test.

### TDD steps: editor shortcuts

- [ ] Add a Harness variant that calls useEditorShortcuts(false).
- [ ] Seed a ready room and dispatch Delete/Ctrl+D.
- [ ] Assert no item mutation when disabled.
- [ ] Preserve all existing enabled and input-field tests.
- [ ] Run:

    npm test -- --run src/pages/roomPlanner/useEditorShortcuts.test.jsx

- [ ] Add the enabled argument and make the effect return without installing a listener when false.
- [ ] Include enabled in the effect dependency.
- [ ] Re-run the test.

### Acceptance criteria

- [ ] Media-query state is synchronous on first render and reacts to resize.
- [ ] Unsupported matchMedia fails closed.
- [ ] Hidden/unsupported Planner state cannot react to editor keyboard shortcuts.
- [ ] Existing callers of useEditorShortcuts remain compatible.

### Risk

Low. The main risk is a leaked listener or test-global matchMedia state. Restore mocks after each test.

---

## Task 5 — Frontend: actionable SmallScreenNotice (AUD-03)

### Files

- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/SmallScreenNotice.jsx
- Create: Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/SmallScreenNotice.test.jsx

### Proposed props

- continueUrl: absolute URL to copy
- hasUnsavedChanges: boolean, default false
- onExit: callback that owns dirty-state confirmation/navigation

SmallScreenNotice owns only clipboard UI state. It does not save scenes or navigate itself.

### TDD steps

- [ ] Render the notice and assert:
  - heading “Tiếp tục thiết kế trên máy tính”;
  - explanation;
  - “Sao chép liên kết” button;
  - “Về cửa hàng” action.
- [ ] Clipboard success test:
  - writeText receives the exact continueUrl;
  - role status announces success;
  - no manual URL input is shown.
- [ ] Clipboard rejection test:
  - role alert explains manual recovery;
  - a labeled read-only URL field appears;
  - its value equals continueUrl.
- [ ] Clipboard-unavailable test follows the same manual recovery path.
- [ ] Unsaved-state test clearly says the link contains only the current saved route/version, not
  unsaved edits.
- [ ] Exit test calls onExit rather than using a raw Link.
- [ ] Run:

    npm test -- --run src/pages/roomPlanner/SmallScreenNotice.test.jsx

### Implementation steps

- [ ] Use existing Button and Input primitives where suitable.
- [ ] Use lucide Monitor plus Copy/Check icons; mark decorative icons aria-hidden.
- [ ] Use semantic tokens only.
- [ ] Remove CSS-only lg visibility ownership from this component; RoomPlannerPage will decide when
  it renders.
- [ ] Implement clipboard success/error state with role status/alert.
- [ ] Make the manual URL field selectable on focus.
- [ ] Call onExit for the secondary action.
- [ ] Keep copy warm and factual; do not call the boundary a device error.
- [ ] Run nestify-review on SmallScreenNotice and resolve any DNA violations.
- [ ] Re-run the targeted test.

### Acceptance criteria

- [ ] Copy success and failure are both perceivable and recoverable.
- [ ] Exact URL is preserved.
- [ ] Dirty-state copy does not promise cross-device persistence.
- [ ] Exit cannot silently bypass Room Planner dirty protection.

### Risk

Low. Clipboard APIs can be unavailable outside secure contexts; the manual-copy fallback is required.

---

## Task 6 — Frontend: enforce Room Planner boundary before work begins (AUD-03)

### Files

- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/RoomPlannerPage.jsx
- Modify: Nestify-Furniture-e-commerce-frontend/src/pages/roomPlanner/RoomPlannerPage.test.jsx

### Constants and data flow

- PLANNER_DESKTOP_QUERY: min-width 64rem
- isDesktop: useMediaQuery(PLANNER_DESKTOP_QUERY)
- continueUrl: window.location.origin + router location pathname + search + hash
- scene query id: id only when isDesktop; otherwise null
- product preload slug: slug only when hasDeepLink and isDesktop; otherwise null
- editor shortcuts enabled: isDesktop

### Test harness first

- [ ] Add a reusable matchMedia mock to RoomPlannerPage.test.jsx.
- [ ] Default existing tests to desktop matches true so current editor tests keep their intent.
- [ ] Allow a test to dispatch breakpoint changes.

### New mobile tests

- [ ] New-room mobile route:
  - SmallScreenNotice visible;
  - no “Tạo phòng” dialog button;
  - no RoomCanvas;
  - no create/fetch side effect.
- [ ] Existing-scene mobile route:
  - getScene is not called;
  - notice visible;
  - copied URL includes /room-planner/:id.
- [ ] Product deep-link mobile route:
  - getProduct is not called;
  - location still contains product, variant, and unrelated UTM;
  - copied URL contains all of them.
- [ ] Clipboard test includes hash if the router harness supports it.
- [ ] Breakpoint resize test:
  - desktop editor/store is made ready and dirty;
  - change to mobile shows notice;
  - change back to desktop restores the same in-memory item/room;
  - no route-id reset occurred.
- [ ] Dirty exit test:
  - click “Về cửa hàng”;
  - existing confirm is invoked;
  - rejecting confirmation keeps the route/state.
- [ ] matchMedia unavailable test renders the safe notice, not editor/setup.
- [ ] Run and confirm failures:

    npm test -- --run src/pages/roomPlanner/RoomPlannerPage.test.jsx

### Implementation steps

- [ ] Import useLocation and useMediaQuery.
- [ ] Compute the absolute continuation URL from origin and the router location object.
- [ ] Call useEditorShortcuts(isDesktop).
- [ ] Gate useScene and useProductPreload inputs so they are disabled on small screens.
- [ ] Initialize setupOpen as false.
- [ ] Split effects:
  - route-id effect resets the store and closes setup only when id changes;
  - capability effect closes setup below desktop and opens setup for a new idle room when desktop
    becomes available.
- [ ] Do not include isDesktop in the route-reset effect dependency.
- [ ] Keep scene hydration/deep-link effects unchanged except that their queries cannot settle on
  mobile.
- [ ] Before desktop loading/error/editor rendering, return SmallScreenNotice when isDesktop is false.
- [ ] Pass continueUrl, store.dirty, and handleExit to the notice.
- [ ] Render the desktop editor shell as a real desktop branch rather than relying on hidden/lg:flex
  to prevent mounting.
- [ ] Render RoomSetupDialog and ShareSceneDialog only inside the desktop-capable branch.
- [ ] Verify no RoomCanvas or catalog/scene query mounts below the boundary.
- [ ] Re-run:

    npm test -- --run src/pages/roomPlanner/RoomPlannerPage.test.jsx

- [ ] Run all focused Planner tests affected by the hook/page change:

    npm test -- --run src/hooks/useMediaQuery.test.jsx src/pages/roomPlanner/useEditorShortcuts.test.jsx src/pages/roomPlanner/SmallScreenNotice.test.jsx src/pages/roomPlanner/RoomPlannerPage.test.jsx

- [ ] Run nestify-review on RoomPlannerPage and SmallScreenNotice.

### Acceptance criteria

- [ ] Mobile cannot enter setup or mount hidden 3D work.
- [ ] Deep-link parameters remain untouched until desktop.
- [ ] Resizing does not reset editor state.
- [ ] Desktop setup, existing scene, deep-link merge, save, cart, checkout, and share tests stay green.
- [ ] The mobile notice gives a truthful continuation path.

### Risk

Medium. RoomPlannerPage coordinates many effects. The key regression risks are resetting the store on
resize, consuming deep-link params on mobile, and making existing desktop tests default to the safe
mobile fallback unintentionally.

---

## Task 7 — Synchronize contract and design documentation

### Files

- Modify: Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md
- Modify: Nestify-Furniture-e-commerce-backend/docs/14-workflows.md
- Modify: Nestify-Furniture-e-commerce-frontend/docs/nestify/04_Component_Bible.md
- Modify: Nestify-Furniture-e-commerce-frontend/docs/FE-TEAM-WORKFLOW.md

Do not rewrite unrelated sections.

### Steps

- [ ] FE_AI_CONTEXT:
  - document GET /api/admin/orders/{id};
  - document manage_orders permission;
  - list detail relations and payment_method;
  - preserve the separate refund permission/contract.
- [ ] 14-workflows:
  - change Admin Order summary from list-only to list + detail + transition;
  - retain the recorded-refund/manual-PayOS distinction;
  - do not imply status cancellation automatically transfers money.
- [ ] Component Bible:
  - replace the stale note that SmallScreenNotice is a static gap;
  - document capability gate, exact-link continuation, clipboard fallback, and unsaved-state honesty.
- [ ] FE-TEAM-WORKFLOW:
  - document that below lg the editor/setup/queries do not mount;
  - document desktop continuation URL behavior.
- [ ] Check all referenced paths and endpoint names against code.

### Acceptance criteria

- [ ] API docs and code agree.
- [ ] Design docs no longer call the mobile boundary incomplete.
- [ ] No documentation claims unsaved scenes sync across devices.

### Risk

Low. Avoid broad cleanup of known stale docs outside these exact contracts.

---

## Task 8 — Verification and handoff

### Automated verification

- [ ] Backend targeted feature suite:

    sg docker -c "docker compose -f docker-compose.yml -f docker-compose.test.tmp.yml run --rm --no-deps --entrypoint php app artisan test --filter=AdminOrderTest"

- [ ] Frontend focused Wave 1 suite:

    npm test -- --run src/pages/admin/orders/AdminOrderDetailPage.test.jsx src/hooks/useMediaQuery.test.jsx src/pages/roomPlanner/useEditorShortcuts.test.jsx src/pages/roomPlanner/SmallScreenNotice.test.jsx src/pages/roomPlanner/RoomPlannerPage.test.jsx

- [ ] Frontend full suite:

    npm test -- --run

- [ ] Frontend lint:

    npm run lint

- [ ] Run the repository-prescribed security scan on changed first-party frontend files if the local
  scanner is available. Record an unavailable scanner rather than silently claiming it passed.
- [ ] Run git diff --check in both repos.
- [ ] Confirm no migration or dependency manifest changed.
- [ ] Remove the temporary backend Compose test overlay if it was created.

### Manual runtime matrix

| Case | Expected result |
|---|---|
| Open admin order from list | Detail paints immediately, then reconciles |
| Paste/refresh valid admin order URL | Loading then canonical detail |
| Missing order | Not-found state and back link |
| Temporary detail failure | ApiError, Retry succeeds |
| Cancel modal keyboard path | Focus trapped, consequence readable, Escape works before pending |
| Cancel double click under throttle | One request |
| Refund back action | No request, form preserved |
| Refund error | Modal remains open, error announced |
| Refund success | Result shown and order status refreshed |
| Planner 1023 px | Notice only; no setup/canvas request |
| Planner 1024 px | Desktop setup/editor flow |
| Resize desktop → mobile → desktop | Same in-memory room resumes |
| Clipboard denied | Manual URL visible |
| Product/variant URL copied to desktop | Params preserved and normal desktop preload runs |

Mark any unexecuted row “Needs runtime verification”; do not infer a pass from static tests.

### Final review checklist

- [ ] Review the diff only for Wave 1 scope.
- [ ] Confirm no RBAC, payment, inventory, voucher, or 3D editor logic drift.
- [ ] Confirm all UI copy is Vietnamese and evidence-based.
- [ ] Confirm no raw color values or new global component variants.
- [ ] Confirm nestify-review verdict is addressed.
- [ ] Report changed files, commands run, results, runtime items, and remaining risks.
- [ ] Do not commit unless explicitly requested.

---

## Acceptance traceability

| Spec outcome | Implemented by | Primary proof |
|---|---|---|
| Direct/refreshed admin detail works | Tasks 1–2 | Backend show tests + direct URL RTL test |
| Canonical data replaces router-state dependency | Task 2 | initial-data reconciliation test |
| 404 vs retryable error | Task 2 | separate error-state tests |
| Cancellation requires confirmation | Task 3 | zero-before-confirm and one-after-confirm tests |
| Refund requires payload review | Task 3 | frozen-payload modal tests |
| Full refund can refresh order status | Task 3 | detail invalidation/refetch test |
| Processing cancellation matches backend | Task 3 | transition parity test |
| Mobile never mounts setup/3D/query work | Tasks 4–6 | mobile branch RTL tests |
| Exact continuation URL survives | Tasks 5–6 | clipboard/deep-link tests |
| Dirty state is not falsely promised as synced | Tasks 5–6 | copy assertion + resize test |
| Contracts remain documented | Task 7 | docs diff review |

---

## Recommended execution prompt

Implement the approved Wave 1 plan at
docs/superpowers/plans/2026-07-10-ui-ux-audit-wave-1.md using TDD in the listed order. Limit scope to
AUD-01, AUD-02, and AUD-03; preserve unrelated work; do not run migrations, change dependencies,
alter payment/inventory/RBAC business logic, or commit. Run the specified targeted/full checks,
nestify-review the Room Planner UI, and report any manual item as “Needs runtime verification” unless
it was actually exercised.
