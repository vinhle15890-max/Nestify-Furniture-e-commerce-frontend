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

Implementation in progress.