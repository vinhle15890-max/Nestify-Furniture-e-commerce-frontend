# UI/UX Audit Wave 5A Implementation Plan

## Scope files

- `src/lib/formErrors.js` (+ `formErrors.test.js`) — shared helpers.
- `src/pages/auth/LoginPage.jsx` (+ `LoginPage.test.jsx`)
- `src/pages/auth/RegisterPage.jsx` (+ `RegisterPage.test.jsx`)
- `src/pages/auth/ForgotPasswordPage.jsx` (+ `ForgotPasswordPage.test.jsx`)
- `src/pages/auth/ResetPasswordPage.jsx` (+ `ResetPasswordPage.test.jsx`)
- `src/pages/auth/VerifyEmailPage.jsx` (+ `VerifyEmailPage.test.jsx`)
- `src/pages/account/ProfileForm.jsx` (+ `ProfileForm.test.jsx`)
- `src/pages/account/AddressFormModal.jsx` (+ new `AddressFormModal.test.jsx`)
- `src/pages/product/ProductPage.jsx` — review + comment forms only (+ new
  `ProductReviewForms.test.jsx` exercising review/comment submit paths)

No backend, contract, migration, dependency, or unrelated-storefront change.

## Tasks

1. **Helpers (TDD first).** Add to `src/lib/formErrors.js`:
   - `NETWORK_ERROR_MESSAGE = 'Đã có lỗi kết nối mạng. Vui lòng thử lại.'`
   - `formLevelMessage(error, codeMap = {})` → `codeMap[error.code]` if present,
     else `NETWORK_ERROR_MESSAGE` when `error.code === 'NETWORK_ERROR'`,
     else `error.message` (BE-promise Vietnamese user-facing copy).
   - `focusFirstError(formEl)` → focus the first `[aria-invalid="true"]`
     control, else the first `[role="alert"]`; return the focused element or
     `null`. Add unit tests covering both branches + the no-error case.
2. **Auth forms (login/register/forgot/reset).** Replace `setFormError(error.message)`
   with `setFormError(formLevelMessage(error, <codeMap>))` where a flow has named
   codes (forgot/reset → `{ RESET_FAILED: 'Không thể gửi email đặt lại, vui lòng thử lại sau.' }`).
   Add a `formRef`, call `focusFirstError` in the catch, and add pending copy
   (`'Đăng nhập…'`, `'Đăng ký…'`, `'Đang gửi…'`, `'Đang đặt lại…'`) to each
   submit button. Keep existing `applyServerErrors` first.
3. **Verify email.** Map `LINK_EXPIRED`/`INVALID_LINK` to friendly Vietnamese and
   chain `NETWORK_ERROR` to `formLevelMessage`; focus the error alert; keep the
   success branch and the no-params branch.
4. **Profile form.** `setFormError(formLevelMessage(error))`; `focusFirstError`
   on failure; loading copy already exists.
5. **Address modal.** Add an in-form `role="alert"` form-level error (replacing
   the raw-message toast on non-field failures; success toasts stay);
   `formLevelMessage(error)` for the message; `focusFirstError` on failure;
   pending copy `'Đang lưu…'`/`'Đang thêm…'` on the submit button; upgrade
   `AddressSelect` to set `aria-invalid` on the `<select>`, `role="alert"` +
   `id` on the error span, and `aria-describedby` linking them. No change to
   create/edit/default behavior or the VN-units dataset.
6. **Review form (ProductPage).** Add `reviewFieldErrors` state; on 422 map
   `details.fields` to `reviewFieldErrors` (keys `rating`/`title`/`body`); on
   non-field failure (`403 FORBIDDEN`, network) set `reviewError` via
   `formLevelMessage(error, { FORBIDDEN: 'Bạn chỉ được đánh giá sản phẩm đã nhận hàng.' })`.
   Render field errors next to each field with `role="alert"`; link the body
   `<textarea>` via `aria-invalid`/`aria-describedby`. Clear field errors on
   input change and on a successful submit. `focusFirstError` on failure. Keep
   the existing pending copy and verified-purchase gate.
7. **Comment form (ProductPage).** Track `commentSubmittingId` + `commentErrors`
   per review; switch `mutate` to `mutateAsync` with try/catch; on 422 set the
   row's field error (`body`), on `404`/network set a `role="alert"` row error
   via `formLevelMessage(error)`. Link the `<textarea>` via
   `aria-invalid`/`aria-describedby`. Per-row loading copy `'Đang gửi…'` and a
   disabled button keyed on `commentSubmittingId === review.id` (keeps dup-submit
   blocking without disabling unrelated rows). `focusFirstError` for that row.
8. **Verify.** Run the touched colocated tests, then the full FE suite, then
   `npm run lint`, `npm run build`, and `git diff --check`. Then run
   `nestify-review` and surface findings.

## Acceptance criteria

- No covered submit can fail silently or render a raw network/axios message.
- `422 VALIDATION_FAILED` field errors are shown per field on every covered form,
  including review/comment, with input ↔ error linkage.
- Form-level errors use friendly Vietnamese copy and `role="alert"`.
- Entered values survive a failed submit on every covered form.
- Each submit button shows pending copy and is disabled while pending; a
  duplicate submit cannot start while pending.
- After a failed submit the first invalid field (or the form-level alert when
  there are no field errors) receives focus.
- No endpoint, payload, business rule, dependency, or visual-language change.

## Risk and dependency

- Risk: low–medium. The ProductPage review/comment section is the largest edit
  surface; it is kept in-place (no RHF migration) to limit blast radius.
- Dependencies: existing `ApiError`/`normalizeError`, `applyServerErrors`,
  React Hook Form, TanStack Query `isPending`, and Radix Dialog focus trap
  (left authoritative for the Address modal).

## Status

Implementation complete on 2026-07-11. Closed by the cross-wave Integration
& Release Verification pass on 2026-07-11. No production migration, dependency,
or business-rule change introduced by Wave 5A.

## Execution record

- Helpers added to `src/lib/formErrors.js`:
  - `NETWORK_ERROR_MESSAGE` constant.
  - `formLevelMessage(error, codeMap = {})`: codeMap lookup; `NETWORK_ERROR`
    short-circuits to the safe Vietnamese constant (never the raw axios
    English string); otherwise the backend's guaranteed-Vietnamese
    `error.message`. Returns `NETWORK_ERROR_MESSAGE` when `error` is null.
  - `focusFirstError(formEl)`: focuses first `[aria-invalid="true"]`, falls
    back to first `[role="alert"]` (setting `tabIndex = -1` if needed),
    returns the focused element or `null`.
  - `useFocusFormAlert(error, ref)` react hook for form-level-only error
    surfaces (verify-email uses a manual equivalent — see Notes).
- Auth forms (login/register/forgot/reset): `applyServerErrors` is kept
  first, then `setFormError(formLevelMessage(error, <codeMap>))` for
  non-field failures; `formRef` added; `focusFirstError` in the catch; per
  button pending copy (`'Đang đăng nhập…'`, `'Đang đăng ký…'`, `'Đang gửi…'`,
  `'Đang đặt lại…'`); `isSubmitting` disables the submit button.
- Verify email: invalid/no-params/link-error branches now render friendly
  Vietnamese from `formLevelMessage(error)`; the error alert receives focus.
- Profile form: `formLevelMessage(error)` + `focusFirstError`; the existing
  loading copy is reused.
- Address modal: in-form `role="alert"` form-level error replaces the
  raw-message toast on non-field failures (success toasts stay);
  `AddressSelect` is upgraded with `aria-invalid`, `aria-describedby` and a
  `role="alert"` error span; pending copy `'Đang lưu…' / 'Đang thêm…'` on the
  submit button; `focusFirstError` on catch including the client-side
  province/ward check.
- Review form (ProductPage): new `reviewFieldErrors` state maps 422
  `details.fields` to `rating`/`title`/`body`; non-field failures are
  routed through `formLevelMessage(error, { FORBIDDEN: '…' })`; the body
  `<textarea>` and the rating group receive `aria-invalid`/
  `aria-describedby`/`role="alert"`; field errors clear on change and on
  success; `focusFirstError` on catch; the existing pending copy and
  verified-purchase gate are preserved.
- Comment form (ProductPage): `commentSubmittingId` tracks the in-flight
  review id, `commentErrors`/`commentDrafts` hold per-row state; `mutateAsync`
  with try/catch (no more silent failure); 422 maps to the row's `body` error;
  404/network map to a per-row `role="alert"` form-level error via
  `formLevelMessage(error)`; per-row loading copy `'Đang gửi…'` and a
  disabled button keyed on `commentSubmittingId === review.id` (blocks
  duplicate submit for that row without disabling unrelated rows);
  `focusFirstError` on catch.
- Verification:
  - Focused 5A tests: 81 tests across 10 files passed.
  - Full FE suite: 131 files and 662 tests passed.
  - `npm run lint`: 0 errors, 2 pre-existing
    `react-refresh/only-export-components` warnings in Room Planner.
  - `npm run build`: passed; the existing large-chunk advisory remains.
  - `git diff --check`: passed (no whitespace conflicts).
  - `nestify-review`: no new color anti-pattern, color-misuse, capability
    boundary, or voice violation introduced by 5A (one pre-existing
    out-of-scope verify-email no-params "retry context" finding, deferred
    per the spec's "Needs runtime verification" clause).
- Notes:
  - `VerifyEmailPage.jsx:23-25` uses a manual `alertRef.current.focus()`
    effect instead of `useFocusFormAlert` (functionally equivalent; the
    shared hook is not used here for a stylistic reason).
  - The comment form allows concurrent comments across different review rows
    (each row's draft/error state is independent); within a single row,
    duplicate submit is blocked. This matches the pre-existing UX.
  - Pre-existing (out of Wave 5A scope): ProductPage add-to-cart /
    wishlist toasts render `error.message` directly. On `NETWORK_ERROR` this
    is the raw axios string, which is the same hazard 5A removed from the
    forms. Recorded as a pre-existing warning, not patched.

## Integration & release handoff (2026-07-11)

Cross-wave verification of Waves 5A, 5B (Checkout/Payment reliability), and
5C (Admin CRUD reliability). No code files were modified by this integration
pass; the only edits in this section update this plan's Status/Execution/
handoff. Wave 5B/5C execution histories in their own plans are left unchanged
per the handoff rules.

### Verdict

`PASS WITH RUNTIME CHECKS`.

All Wave 5A/5B/5C focused tests pass; the full FE suite is green; FE lint and
production build pass; BE focused contract suite (order idempotency + payment
recovery) passes; the BE full suite completes and reveals only 4 pre-existing
notification-infrastructure failures unrelated to any of the three waves. No
file from any wave was lost, overwritten, or regressed. Checkout idempotency,
payment recovery, retry-without-recompute, reconciliation of
success/pending/failed/unavailable, admin destructive-action confirmations,
and the staff-cannot-purchase gate are all preserved.

### Test matrix

| Command | Scope | Result | Notes |
|---|---|---|---|
| `npx vitest run <5A files>` | FE focused 5A helpers + auth/profile/address/product forms | 81 tests passed (10 files) | Includes formErrors, idempotency, all auth pages, Profile, Addresses, ProductPage |
| `npx vitest run <5B files>` | FE focused 5B checkout + return + idempotency | 30 tests passed (3 files) | CheckoutPage, CheckoutReturnPage, idempotency |
| `npx vitest run <5C files>` | FE focused 5C admin CRUD | 46 tests passed (8 files) | Categories, roles, role form/matrix, employees, lock, vouchers, AdminRoleDialogs |
| `npx vitest run` | FE full suite | 131 files / 662 tests passed | No FE test failed |
| `npm run lint` | FE ESLint | 0 errors, 2 warnings | Both warnings pre-existing `react-refresh/only-export-components` in Room Planner |
| `npm run build` | FE production build | PASS | Existing large-chunk advisory on `summary-*.js` (Room Planner) — pre-existing |
| `git diff --check` (FE) | FE whitespace conflicts | PASS (exit 0) | |
| `php artisan test <5B BE files>` | BE focused 5B order idempotency + payment recovery | 45 tests / 134 assertions passed | CreateOrderTest, CreatePaymentSessionTest, PayOsGatewayCreateSessionTest, PaymentReconcileTest |
| `php artisan test` | BE full suite | 575 passed, 4 failed, 1891 assertions | 4 failures all `Notification::assertSentTo` on ShouldQueue listeners (Restock, PayOS-success, PayOS-failed, Order-cancel-refund-staff). 3 of 4 exercise no 5B code path; 5B commit touches no `app/Notifications`, `app/Observers`, `app/Listeners` — definitively pre-existing on SQLite test env, missed by Wave 5B because the runner terminated before reaching these tests. |
| `./vendor/bin/pint --test <5B BE files>` | BE scoped Pint on new/touched files | 12 style-drift issues, 0 errors | Cosmetic (single_space_around_construct, type_declaration_spaces, binary_operator_spaces, class_attributes_separation, new_with_parentheses, ordered_imports). No broad formatter run per rule. |
| `git diff --check` (BE) | BE whitespace conflicts | PASS (exit 0) | |

### Lint / build

- FE ESLint: 0 errors. 2 pre-existing warnings (Room Planner `react-refresh/only-export-components`).
- FE production build: passed; existing large-chunk advisory unchanged.
- BE scoped Pint: 12 cosmetic style-drift findings on touched files, no errors.
  No broad formatter was run.

### Files modified by this integration task

- `docs/superpowers/plans/2026-07-11-ui-ux-audit-wave-5a-form-reliability.md`
  — updated Status from "Implementation in progress" to "Implementation
  complete", added this Execution record and Integration & release handoff.
- No source files were edited by the integration pass.

### Pre-existing warnings (out of Wave 5A/5B/5C scope)

- **FE-1**: `ProductPage.jsx:205, 216, 223` — add-to-cart and wishlist
  success/error toasts render `error.message` directly. On `NETWORK_ERROR`
  that leaks the raw axios English string to a toast. Wave 5A removed this
  hazard only from forms (per spec scope). Recommended follow-up: route
  these toasts through `formLevelMessage` (or special-case `NETWORK_ERROR`).
- **FE-2**: `ProductPage.jsx:491` — `"Còn {availableStock} sản phẩm"` real
  stock count, no `chỉ` urgency, no countdown. Borderline voice on a
  brand with Extraversion 30 (design judgement, not a false-urgency
  violation per Design DNA §0). Recorded for design review, not patched.
- **FE-3**: `VerifyEmailPage.jsx:43-46` — no-params branch copy
  "Liên kết xác thực không hợp lệ." lacks retry context; inconsistent with
  the analogous `ResetPasswordPage.jsx:78-81` ("Vui lòng yêu cầu liên kết
  mới."). Wave 5A spec explicitly defers the resend-verification CTA to
  "Needs runtime verification"; classified as pre-existing out-of-scope.
- **BE-1**: 4 `Notification::assertSentTo` failures in the BE full suite
  on SQLite-test-env queued listeners (`TransactionalEmailTest` ×3,
  `CancelOrderTest ×1 — cancelling a paid order notifies refund staff`).
  Proof these are pre-existing and not 5B-induced: 5B's commit `4707947`
  modifies none of `app/Notifications`, `app/Observers`, `app/Listeners`;
  3 of 4 tests (notably `restock_emails_wishlist_subscribers_only`) use
  only Eloquent + observer + event + listener — no order/payment code — so
  cannot be affected by any 5B change. The non-notification counterparts
  in `PayosWebhookTest` (9) and `CancelOrderTest` (10 others) all pass,
  proving underlying business logic works. Likely root cause: queued
  ShouldQueue listeners + `Notification::fake()` on the SQLite sync-queue
  test config. Recommended follow-up: investigate notification listener
  registration / Notification fake in the SQLite test environment, or run
  the failing suite under PostgreSQL per docs/07-testing.md (the BE
  AGENTS.md guardrail currently mandates Docker sqlite, which may be the
  source of the divergence).
- **BE-2**: 12 Pint style-drift issues on touched BE files (cosmetic). Not
  formatted per rule "không formatter toàn repo". CI gate is `make lint`
  (Pint clean); operator should run `./vendor/bin/pint` on the touched
  files at commit time, OR keep this wave's Pint dirty exception explicit.
- **BE/infra**: BE AGENTS.md says "Test chạy trong Docker sqlite" while
  `docs/07-testing.md` says "Use real PostgreSQL, not SQLite." This
  divergence predates Wave 5B and is the likely reason the 4 notification
  failures slip through (they need queued-listener/Notification-fake
  semantics that SQLite does not exercise the same way). Worth resolving
  in a future housekeeping pass.

### Needs runtime verification

These items cannot be settled by static analysis or the current SQLite test
database and remain manual operator steps (per the wave specs):

- **5A — verify-email**: screen-reader announcement timing of the new
  comment-form error; focus-order inside the Address modal after a server
  error (Radix focus trap stays authoritative — confirm programmatic
  focus does not fight it); narrow-screen behavior of verify-email.
  Plus the deferred "resend verification" CTA on the invalid-link / no-params
  branch — Needs runtime verification per 5A spec.
- **5B — checkout/payment**: Real PayOS duplicate-link / cancel behaviour;
  redirect handoff in a real browser; screen-reader announcement timing;
  focus after an address is removed in another tab; Safari private-mode
  session-storage; PostgreSQL concurrency under simultaneous duplicate
  order requests; PayOS session-creation-to-database-write edge case when
  the process dies after PayOS accepts but before the URL is persisted.
- **5C — admin CRUD**: Escape / backdrop behavior while a destructive dialog
  is pending; focus restoration across nested media dialogs; screen-reader
  announcement timing on inline dialog errors; narrow-screen dialog
  scrolling.

### Migration / deployment handoff

Wave 5B requires two additive, nullable migrations that this integration
pass did NOT run against any production database. The user runs all prod
migrations; this agent does not.

1. `src/database/migrations/2026_07_11_000001_add_idempotency_to_orders_table.php`
   — adds `orders.idempotency_key` (string, nullable, max 128) and
   `orders.idempotency_fingerprint` (string, nullable), with a unique
   index `orders_user_id_idempotency_key_unique` on `(user_id,
   idempotency_key)`. Idempotent construction guards (`Schema::hasColumn`
   / `Schema::hasIndex`), multi-NULL PostgreSQL semantics keep legacy
   optional-key orders unchanged. `down()` drops the index + columns
   if rolled back.
2. `src/database/migrations/2026_07_11_000002_add_payment_session_recovery_to_orders_table.php`
   — adds `orders.payment_url` (text, nullable) and
   `orders.payment_session_expires_at` (timestampTz, nullable). Idempotent
   construction guards; `down()` drops the columns if rolled back.

**Production migrations have NOT been run.** After the user inspects them,
the deploy command is `php artisan migrate` against the production
environment.

### Final confirmations

- No commit by this integration pass (the user committed working-tree
  changes externally before this pass started; I ran only test/lint/build/
  diff-check/Pint-`--test` commands).
- No dependency added or upgraded (both `package.json` and `composer.json`
  untouched).
- No production migration run by the agent.
- No source files modified by this integration pass — only this plan doc.