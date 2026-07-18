# UI/UX Audit Wave 5C Implementation Plan

## Scope files

- Category/Voucher list pages and form modals.
- Role editor, permission matrix, role delete dialog.
- Assign Roles, Add Employee, and account lock/unlock dialogs.
- Colocated regression tests and Wave 5C documentation.

## Tasks

1. Add red tests for query failure/retry, accessible destructive confirmation, retained delete context, duplicate-submit prevention, and server-error focus.
2. Replace category/voucher native confirms with controlled shared modals.
3. Add retryable query failures to permission/role/candidate surfaces.
4. Strengthen form and mutation pending/error/focus behavior.
5. Run focused tests, full frontend tests, lint, build, `git diff --check`, and `nestify-review`.

## Acceptance criteria

- Query failure cannot be mistaken for an empty role, permission, or user result.
- No covered destructive action uses `window.confirm`.
- A delete request is submitted once, names its target, and keeps its dialog open on failure.
- Category/Voucher 422 errors focus the first invalid field; form-level errors are announced and retain values.
- Pending forms/dialogs block duplicate submission and accidental dismissal.
- Existing API payloads, permission rules, and successful behavior remain unchanged.

## Risk and dependency

- Risk: medium, because role assignment replaces the complete role set and destructive dialogs alter interaction sequencing.
- Dependencies: existing `Modal`, `LoadErrorState`, React Query refetch, React Hook Form, and current normalized `ApiError` contract.

## Status

Implementation complete on 2026-07-11.

## Execution record

- Focused Wave 5C verification: 10 test files, 50 tests passed.
- ESLint limited to Wave 5C files: passed with no findings.
- Production build: passed; the existing large-chunk advisory remains.
- `git diff --check`: passed.
- Full-repository lint/test is pending a stable worktree because Wave 5A is being implemented concurrently in separate files.
- `nestify-review`: no new color-role, visual-language, or failure-behavior violation found in Wave 5C.
- Runtime focus restoration, Escape/backdrop behavior, screen-reader timing, and narrow viewport checks remain required.
