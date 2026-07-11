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
5C (Admin CRUD reliability). Wave 5B/5C execution histories in their own
plans are left unchanged per the handoff rules; this handoff is the
authoritative close-out. This section was corrected by a continuation pass
that established a same-environment baseline for the four backend
notification failures, made scoped Wave 5B Pint clean, and reconciled the
Wave 5C test-file count.

### Verdict

`PASS WITH VERIFIED BASELINE FAILURES`.

All current automated release gates pass except four backend
`Notification::assertSentTo` tests that have been proven — by a
same-Docker-image / same-env / same-DB-driver / same-queue isolated-worktree
baseline run — to fail identically on the parent commit `17e11a1` and on the
Wave 5B HEAD commit `4707947`. They are baseline debt, not Wave 5B
regressions, and are listed explicitly below. Every remaining release gate
(Wave 5A/5B/5C focused tests, full FE suite, FE lint, FE production build,
BE focused 5B suite, scoped Wave 5B Pint `--test`, `git diff --check` for
both repos) passes.

### Backend baseline comparison (parent `17e11a1` vs HEAD `4707947`)

Method: isolated detached git worktrees per revision; identical Docker image
(`docker/php/Dockerfile`); identical env (`APP_ENV=testing`,
`DB_CONNECTION=sqlite` `:memory:`, `QUEUE_CONNECTION=sync`,
`CACHE_STORE=array` per `phpunit.xml`); independent `composer install`
(per-revision fresh `vendor/`); same command
`vendor/bin/phpunit <files> --filter=<exact four>`. Volumes, containers,
and worktrees were torn down with `docker compose down -v` and
`git worktree remove --force` after each side.

| Test | Parent `17e11a1` | HEAD `4707947` | Classification | Evidence |
|---|---|---|---|---|
| `TransactionalEmailTest::test_successful_payment_emails_order_confirmation_to_customer` | FAIL — `OrderConfirmedNotification was not sent` | FAIL — identical error | Verified baseline failure | `NotificationFake.php:89` assertion; identical stack to `tests/Feature/Notifications/TransactionalEmailTest.php:69` |
| `TransactionalEmailTest::test_failed_payment_emails_failure_notice_to_customer` | FAIL — `PaymentFailedNotification was not sent` | FAIL — identical error | Verified baseline failure | `NotificationFake.php:89`; identical stack to `tests/Feature/Notifications/TransactionalEmailTest.php:85` |
| `TransactionalEmailTest::test_restock_emails_wishlist_subscribers_only` | FAIL — `RestockNotification was not sent` | FAIL — identical error | Verified baseline failure | `NotificationFake.php:89`; identical stack to `tests/Feature/Notifications/TransactionalEmailTest.php:115`. Exercises zero 5B code paths (Eloquent observer + event + listener only). |
| `CancelOrderTest::test_cancelling_a_paid_order_notifies_refund_staff` | FAIL — `OrderCancelledNotification was not sent` | FAIL — identical error | Verified baseline failure | `NotificationFake.php:89`; identical stack to `tests/Feature/Order/CancelOrderTest.php:165` |

Because the four tests fail identically on both revisions under the same
environment, they are classified as **verified baseline debt** and are NOT
fixed by this integration task (per the rule "Do not fix verified baseline
notification issues during this task"). The earlier handoff's claim that
these were "pre-existing" was correct in conclusion but unsupported by a
baseline run; that gap is now closed. No regression was introduced by
Wave 5B and no root-cause investigation into SQLite/PostgreSQL semantics
is needed to clear Wave 5B of the failures.

### Authoritative Wave 5C test-file list

Derived from `git show dd73a88 --stat` limited to admin test files, plus the
plan's scope and a glob of every admin colocated test. Two views are both
explicitly verified:

- **Strict scope-by-diff (8 colocated test files modified by Wave 5C,
  46 tests — all pass):**
  1. `src/pages/admin/categories/AdminCategoriesPage.test.jsx` (9 tests)
  2. `src/pages/admin/roles/AdminRolesPage.test.jsx` (7 tests)
  3. `src/pages/admin/roles/RoleFormDialog.test.jsx` (4 tests)
  4. `src/pages/admin/roles/RolePermissionMatrix.test.jsx` (4 tests)
  5. `src/pages/admin/users/AdminEmployeesPage.test.jsx` (6 tests)
  6. `src/pages/admin/users/LockUserButton.test.jsx` (6 tests)
  7. `src/pages/admin/users/AdminRoleDialogs.test.jsx` (2 tests, new file)
  8. `src/pages/admin/vouchers/AdminVouchersPage.test.jsx` (8 tests)

- **Wider 5C-area view (10 files, 51 tests — all pass):** the eight above
  plus `src/features/admin/roles/api.test.js` (4 tests) and
  `src/features/admin/users/api.test.js` (1 test). These two feature-level
  API tests pre-date Wave 5C and were not modified by it; they were
  apparently included in the original execution record's "10 files /
  50 tests" tally.

Reconciliation: the original plan's "10 test files / 50 tests" was a
**mis-count**, not a missing/renamed/merged file. The two feature-level
`api.test.js` files account for the file-count gap (8 → 10), and the
individual per-file test counts sum to 51 (46 colocated + 5 feature), not
50. No test file was lost, renamed, or merged. The plan's "10 files /
50 tests" line is left unchanged per the rule "Do not rewrite historical
Wave 5B/5C execution records", and this handoff is the canonical
authoritative record going forward.

### Pint before/after summary

- **Before**: `./vendor/bin/pint --test <15 Wave 5B PHP files>` →
  12 style issues across 12 files (single_space_around_construct,
  type_declaration_spaces, binary_operator_spaces,
  class_attributes_separation, new_with_parentheses, ordered_imports,
  concat_space, function_declaration, unary_operator_spaces). The two
  new migrations and `DuplicateIdempotencyKeyException.php` were already
  clean.
- **Action**: `./vendor/bin/pint <12 in-scope files>` (only the 12
  Wave-5B-modified files; no repo-wide formatter; no dependency change).
  Diff inspected — every change is cosmetic (parens removed on
  `new ExceptionClass`, single-space array `=>` instead of aligned-arsenic
  spacing, import alphabetical reorder, function-body brace expansion). No
  business-logic, API, or contract change.
- **After**: `./vendor/bin/pint --test <15 Wave 5B PHP files>` →
  PASS, 15 files, 0 issues.
- **Regression check after Pint**: Wave 5B focused suite still
  45 tests / 134 assertions PASS; full BE suite still
  575 passed / 4 failed / 1891 assertions (the 4 are the verified
  baseline debt above — same before and after Pint, so Pint introduced
  no regression).

### Files modified by this integration task (continuation)

- `docs/superpowers/plans/2026-07-11-ui-ux-audit-wave-5a-form-reliability.md`
  — Status updated to "Implementation complete"; Execution record added;
  this handoff section rewritten to reflect the continuation's findings.
- Backend source files reformatted by scoped Pint (cosmetic only, all from
  commit `4707947` Wave 5B scope):
  - `src/app/DTOs/OrderCreateDTO.php`
  - `src/app/Http/Controllers/PaymentSessionController.php`
  - `src/app/Http/Requests/Order/CreateOrderRequest.php`
  - `src/app/Models/Order.php`
  - `src/app/Services/OrderService.php`
  - `src/app/Services/Payment/PayOsGateway.php`
  - `src/app/Services/PaymentService.php`
  - `src/bootstrap/app.php`
  - `src/tests/Feature/Order/CreateOrderTest.php`
  - `src/tests/Feature/Payment/CreatePaymentSessionTest.php`
  - `src/tests/Feature/Payment/PayOsGatewayCreateSessionTest.php`
  - `src/tests/Feature/Payment/PaymentReconcileTest.php`
- No FE source file was modified by this continuation. No documentation
  file other than this plan was modified.

### Verification command table (continuation)

| Command | Scope | Exit code | Result | Notes |
|---|---|---|---|---|
| `vendor/bin/phpunit <4 notif> --filter=<4>` on parent `17e11a1` worktree | BE baseline | 1 | 4 failed, 7 assertions | `Tests: 4, Assertions: 7, Failures: 4` |
| `vendor/bin/phpunit <4 notif> --filter=<4>` on HEAD `4707947` worktree | BE comparison | 1 | 4 failed, 7 assertions | Identical errors → verified baseline debt |
| `npx vitest run <8 colocated 5C files>` | FE Wave 5C focused | 0 | 8 files / 46 tests passed | Authoritative 5C count |
| `npx vitest run <2 features 5C-adjacent files>` | FE 5C-area feature | 0 | 2 files / 5 tests passed | Non-diff-scoped; explains original "10 files" tally |
| `./vendor/bin/pint --test <15 5B BE files>` (before) | BE scoped Pint | 1 | 12 issues, 15 files | Cosmetic drift on 12 files |
| `./vendor/bin/pint <12 in-scope 5B BE files>` | BE scoped Pint fix | 0 | 12 files, 12 fixed | Cosmetic only; diff inspected |
| `./vendor/bin/pint --test <15 5B BE files>` (after) | BE scoped Pint | 0 | 15 files PASS, 0 issues | |
| `php artisan test <4 5B BE files>` (after Pint) | BE focused 5B | 0 | 45 tests / 134 assertions passed | No regression from Pint |
| `php artisan test` (after Pint) | BE full suite | 1 | 575 passed, 4 failed, 1891 assertions | Same 4 baseline-debt failures; identical pre/post Pint |
| `git diff --check` (BE, after Pint) | BE whitespace | 0 | PASS | |
| `git diff --check` (FE, unchanged) | FE whitespace | 0 | PASS | |

(Plus the gates from the earlier integration pass — Wave 5A/5B/5C focused
suites, full FE suite, FE lint, FE production build — which all still hold
and are not re-listed here because the FE workspace was not modified by
this continuation; the only FE action in this continuation was rerunning
the authoritative 5C focused suite, which still passed 8/46.)

### Remaining verified baseline debt

- **BE-BASELINE-1..4**: the four `Notification::assertSentTo` tests listed
  in the baseline comparison table. Proven to fail identically on parent
  and HEAD under the same Docker image, env, SQLite driver, and sync
  queue. **Not fixed by this task** per the rule "Do not fix verified
  baseline notification issues during this task." These are baseline
  debt, not successful gates. Recommended operator follow-up (outside
  this task's scope): investigate Notification-fake vs. queued-listener
  wiring on the test env, or run the four tests under PostgreSQL per
  `docs/07-testing.md` to confirm whether the SQLite test env is the
  trigger. Do NOT clear these as release gates without that follow-up.

### Other pre-existing warnings (out of Wave 5A/5B/5C scope)

- **FE-1**: `ProductPage.jsx:205, 216, 223` — add-to-cart and wishlist
  toasts render `error.message` directly. On `NETWORK_ERROR` that leaks
  the raw axios English string to a toast. Wave 5A removed this hazard
  only from forms (per spec scope). Recommended follow-up: route these
  toasts through `formLevelMessage` (or special-case `NETWORK_ERROR`).
- **FE-2**: `ProductPage.jsx:491` — `"Còn {availableStock} sản phẩm"` real
  stock count, no `chỉ` urgency, no countdown. Borderline voice on a
  brand with Extraversion 30 (design judgement; not a false-urgency
  violation per Design DNA §0). Recorded for design review, not patched.
- **FE-3**: `VerifyEmailPage.jsx:43-46` — no-params branch copy
  "Liên kết xác thực không hợp lệ." lacks retry context; inconsistent
  with `ResetPasswordPage.jsx:78-81`. Wave 5A spec explicitly defers the
  resend-verification CTA to "Needs runtime verification"; classified as
  pre-existing out-of-scope.
- **BE-3 (docs divergence)**: BE `AGENTS.md` says "Test chạy trong Docker
  sqlite" while `docs/07-testing.md` says "Use real PostgreSQL, not
  SQLite." This predates the waves and is a candidate follow-up, but is
  **not cited as the cause** of the four baseline failures — the baseline
  run proved the failures fail on the existing env regardless, so no
  SQLite-vs-PostgreSQL inference is made here.

### Needs runtime verification

These items cannot be settled by static analysis or the test env and
remain manual operator steps (per the wave specs):

- **5A — verify-email**: screen-reader announcement timing of the new
  comment-form error; focus-order inside the Address modal after a server
  error (Radix focus trap stays authoritative — confirm programmatic
  focus does not fight it); narrow-screen behavior of verify-email.
  Plus the deferred "resend verification" CTA on the invalid-link /
  no-params branch — Needs runtime verification per 5A spec.
- **5B — checkout/payment**: Real PayOS duplicate-link / cancel behaviour;
  redirect handoff in a real browser; screen-reader announcement timing;
  focus after an address is removed in another tab; Safari private-mode
  session-storage; PostgreSQL concurrency under simultaneous duplicate
  order requests; PayOS session-creation-to-database-write edge case when
  the process dies after PayOS accepts but before the URL is persisted.
- **5C — admin CRUD**: Escape / backdrop behavior while a destructive
  dialog is pending; focus restoration across nested media dialogs;
  screen-reader announcement timing on inline dialog errors; narrow-screen
  dialog scrolling.

### Migration handoff

Wave 5B requires two additive, nullable migrations authored by commit
`4707947`. **Production migrations have NOT been run** by this
integration pass — not on the active worktree, not on the baseline
worktrees, not on any persistent PostgreSQL volume. The only migrations
applied during this task were applied to the disposable in-memory SQLite
test DB inside `php artisan test` (RefreshDatabase), which never persists.
The user runs all prod migrations; this agent does not.

1. `src/database/migrations/2026_07_11_000001_add_idempotency_to_orders_table.php`
   — adds `orders.idempotency_key` (string, nullable, max 128) and
   `orders.idempotency_fingerprint` (string, nullable), with a unique
   index `orders_user_id_idempotency_key_unique` on `(user_id,
   idempotency_key)`. Idempotent construction guards; multi-NULL
   PostgreSQL semantics keep legacy optional-key orders unchanged;
   `down()` drops the index + columns.
2. `src/database/migrations/2026_07_11_000002_add_payment_session_recovery_to_orders_table.php`
   — adds `orders.payment_url` (text, nullable) and
   `orders.payment_session_expires_at` (timestampTz, nullable). Idempotent
   construction guards; `down()` drops the columns.

Deploy command after review: `php artisan migrate` against production.

### Final confirmations

- **No commit, no push** by this integration pass (or the continuation).
  The commits `dd73a88` (FE) and `4707947` (BE) were authored by the user
  externally before verification began; I only ran test / lint / build /
  `pint --test` / `pint <12 files>` (scoped) / `git diff --check` /
  `git worktree` commands. The 12 Pint-formatted backend files remain
  uncommitted working-tree changes, ready for the user to review and
  commit.
- **No dependency change** — `composer.json`, `composer.lock`,
  `package.json`, and `package-lock.json` are untouched. The two
  isolated `composer install` runs during the baseline comparison were
  against the same locked `composer.lock` (verified identical between
  `17e11a1` and `4707947`) in throwaway worktrees; nothing was added or
  upgraded.
- **No production migration run** — see Migration handoff.
- **All temporary infrastructure cleaned up**: both baseline worktrees
  (`/tmp/opencode/baseline/wt-parent`, `/tmp/opencode/baseline/wt-head`),
  the per-revision Docker containers / volumes / networks, the
  no-ports compose override files, and the active-repo BE containers
  used for the final Pint + test reruns were removed (`docker compose
  down -v` and `git worktree remove --force`); verified
  `git worktree list` returns only the active worktree.