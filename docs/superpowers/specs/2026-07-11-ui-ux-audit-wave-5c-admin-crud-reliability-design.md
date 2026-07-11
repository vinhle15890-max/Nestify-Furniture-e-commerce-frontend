# UI/UX Audit Wave 5C — Admin CRUD reliability and accessibility

## Status

Implemented on 2026-07-11; runtime verification remains required.

## Evidence and scope

| Area | Verified gap | Contract evidence |
|---|---|---|
| Category/Voucher delete | Uses `window.confirm`; failure loses the confirmation context and only emits a toast. | Category delete may return `409 HAS_ACTIVE_PRODUCTS`; voucher delete may fail without changing the record. |
| Role editor | A failed permissions query becomes an empty checkbox list and still permits saving. | `GET /admin/permissions` is the authoritative permission catalogue. |
| Assign roles | A failed roles query becomes an empty list; saving can replace a user's full role set with an unintended empty set. | `PATCH /admin/users/{id}/roles` replaces the assigned role IDs. |
| Add employee | Candidate/role query failures become “not found” or an empty role list. | Adding an employee is role assignment to an existing user; no account is created. |
| Role delete / account lock | A guarded role-delete error closes the dialog; account status failures rely only on a toast and allow pending dismissal. | `409 ROLE_IN_USE` returns `details.users_count`; status changes may return `403 FORBIDDEN`. |
| Category/Voucher forms | Client and 422 field validation exist, but server field errors are not explicitly focused and submit copy does not expose pending state. | Both create/update endpoints return `422 VALIDATION_FAILED`. |

## Interaction contract

1. Query-backed dialogs render loading → retryable error → successful empty/data state. A query failure never becomes an empty permission, role, or candidate result.
2. Role-assignment save actions remain unavailable until the role catalogue is successfully loaded. Current selections and dialog context survive retry.
3. Category, voucher, role deletion, and account lock/unlock use the shared accessible modal. The target is named, pending submission cannot be duplicated or dismissed, and a failed mutation remains open with an inline alert and retry path.
4. Category/Voucher forms retain entered values after failure, focus the first 422 field error, announce form-level failures, and expose pending submit copy. Pending forms cannot be dismissed accidentally.
5. No raw network/axios messages, backend contract changes, migrations, dependencies, or unrelated admin redesign.

## Accessibility

- Radix modal semantics and focus restoration remain authoritative.
- Inline failures use `role="alert"`; query recovery uses `LoadErrorState`.
- Error summaries are programmatically focusable and focused after non-field mutation failures.
- Field errors retain `aria-invalid`/`aria-describedby` through the shared `Input`.
- Destructive actions include the record name and irreversible consequence.

## Out of scope

- Customer storefront forms (Wave 5A), checkout/payment (Wave 5B), Room Planner, permission business rules, API schema changes, and visual redesign.

## Runtime verification

Escape/backdrop behavior while pending, focus restoration across nested media dialogs, screen-reader announcement timing, and narrow-screen dialog scrolling are **Needs runtime verification**.
