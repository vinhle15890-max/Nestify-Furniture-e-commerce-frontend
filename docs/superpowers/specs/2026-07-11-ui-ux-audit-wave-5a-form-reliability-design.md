# UI/UX Audit Wave 5A — Storefront form reliability and accessibility

## Status

Proposed for implementation on 2026-07-11.

## Evidence and scope

Verified from source (not assumed). `applyServerErrors` in `src/lib/formErrors.js`
already routes `422 VALIDATION_FAILED → details.fields` to React-Hook-Form `setError`
on the Auth, Profile and Address forms, and the shared `Input` already wires
`aria-invalid`/`aria-describedby`/`role="alert"`. The gaps below are the remaining
reliability holes, verified from code:

| Flow | File | Verified gap | Contract evidence |
|---|---|---|---|
| Login | `pages/auth/LoginPage.jsx` | Non-field failures fall back to `error.message`; `NETWORK_ERROR` carries the raw axios English message (`lib/errors.js:19`) → raw English shown in a Vietnamese UI. No submit loading copy. No focus to first error after submit failure. | `401 UNAUTHENTICATED` (already mapped) · `403 ACCOUNT_INACTIVE` (already mapped) · `422 VALIDATION_FAILED` (fields handled) · any other code → `error.message`. |
| Register | `pages/auth/RegisterPage.jsx` | Same raw `error.message` fallback for non-field failures. No loading copy. No focus-first-error. | `422 VALIDATION_FAILED` (fields handled); no other documented codes beyond the validation path. |
| Forgot password | `pages/auth/ForgotPasswordPage.jsx` | Same raw `error.message` fallback. No loading copy. No focus-first-error. | `422 RESET_FAILED` (e.g. throttle) and `RESET_FAILED` can be a non-field code — currently shown raw. |
| Reset password | `pages/auth/ResetPasswordPage.jsx` | Same raw `error.message` fallback. No loading copy. No focus-first-error. | `422 RESET_FAILED` (invalid/expired token); no `details.fields` documented for it — currently rendered raw. |
| Verify email | `pages/auth/VerifyEmailPage.jsx` | `error.message` rendered raw for `403 INVALID_LINK`/`403 LINK_EXPIRED`/`404`/`422` and `NETWORK_ERROR`. No retry affordance when the link is expired/invalid. | `403 INVALID_LINK` · `403 LINK_EXPIRED` · `404` · `422` (missing params). |
| Account profile | `pages/account/ProfileForm.jsx` | Raw `error.message` fallback for non-field failures. No focus-first-error (loading copy already present). | `PATCH /auth/profile` returns `422 VALIDATION_FAILED` (fields handled); other codes undocumented. |
| Address create/edit | `pages/account/AddressFormModal.jsx` | No form-level error alert — only a toast with `title:'Có lỗi xảy ra.'` + raw `description: error.message`. No submit loading copy. `AddressSelect` error is a plain `<span>` with no `role`/`aria-describedby` and the `<select>` is never `aria-invalid`. No focus-first-error. | `422 VALIDATION_FAILED` (fields handled). Region selects validated locally (province/ward). |
| Review create | `pages/product/ProductPage.jsx` (review form) | No field-level error mapping at all — `422` is caught as a single `setReviewError(error.message)`. Body `<textarea>` is not linked to its error (`aria-invalid`/`aria-describedby` absent). `403 FORBIDDEN` (not a verified purchase) shown raw. No focus-first-error. | `422 VALIDATION_FAILED` (`rating`/`title`/`body`) · `403 FORBIDDEN` (not verified purchase). |
| Review comment | `pages/product/ProductPage.jsx` (comment form) | **Silent failure**: `createComment.mutate(..., { onSuccess })` has no `onError` — a failed comment submission shows nothing. No per-row loading copy. Comment `<textarea>` has no error linkage. | `422 VALIDATION_FAILED` (`body`) · `404 NOT_FOUND`. |

Shared root cause: there is no helper to convert a non-field `ApiError` into a
trustworthy Vietnamese form-level message; every fallback path renders
`error.message`, which for `NETWORK_ERROR` is the raw axios English string.

## Interaction contract

1. **No request failure looks like success or empty state.** Every submit in
   scope renders a visible Vietnamese message on failure; the comment form stops
   failing silently.
2. **Field-level errors come from the backend when present.** `422
   VALIDATION_FAILED` with `details.fields` is mapped to each field (existing on
   RHF forms; added on the review/comment useState forms). Field errors link to
   their input via the shared `Input` (already wired) and, for the raw textareas
   in the review/comment forms and the Address `<select>`s, via `aria-invalid` +
   `aria-describedby` + a `role="alert"` message.
3. **Form-level failures use friendly Vietnamese copy, never raw server/axios
   text.** A new `formLevelMessage(error)` helper in `src/lib/formErrors.js`
   maps `NETWORK_ERROR` (and, where a form passes a per-flow code map, named
   codes) to safe Vietnamese copy; otherwise it returns `error.message` (which
   the backend promises is Vietnamese user-facing per
   `Nestify-…-backend/docs/00-conventions.md:89-101`).
4. **Values are retained after failure.** RHF forms already retain values;
   useState-based review/comment forms retain by not resetting on error. Region
   selects in the address modal are preserved on failure (no `reset` on the
   error path).
5. **Errors clear on edit and on successful submit.** RHF clears `server`-type
   errors on the next validation pass; useState forms clear their field-error
   state on input change and on a successful submit. The form-level alert clears
   at the start of the next submit.
6. **Pending + duplicate-submit.** Every submit button shows pending copy and is
   disabled while pending; a duplicate submit cannot start while a mutation is
   in-flight (RHF `isSubmitting` / mutation `.isPending` / a per-row submitting
   id for comments). No endpoint, payload, or flow changes.

## Accessibility

- Every input already has an accessible `<label htmlFor>` (shared `Input`) or a
  wrapping `<label>` (Address select, raw textareas). Keep it.
- Field errors keep `aria-invalid`/`aria-describedby` via the shared `Input`; add
  the same wiring to the Address `<select>` and the review/comment `<textarea>`s.
- After a failed submit, focus moves to the first field in error
  (`[aria-invalid="true"]`); if only a form-level error exists, focus the
  `role="alert"` summary. Implemented by a shared `focusFirstError(formEl)`
  helper, called in each form's catch block.
- The comment form's failure alert uses `role="alert"` so screen readers
  announce it (previously there was nothing to announce).

## Out of scope

- Checkout/payment, admin CRUD (Wave 5C), Room Planner, moderation business
  rules, Address default/delete flows (only the create/edit form modal is
  touched), review display, ratings UX, and any backend/contract/migration/
  dependency change.
- If the verify-email flow needs a domain-bound "resend verification" CTA that
  the current contract does not fully support, it is left as **Needs runtime
  verification** rather than extended via an API change.

## Runtime verification

Screen-reader announcement timing of the newly-added comment-form error,
focus order inside the Address modal after a server error (Radix focus trap
remains authoritative — must confirm programmatic focus does not fight it),
and narrow-screen behaviour of the verify-email page are **Needs runtime
verification**.