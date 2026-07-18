# UI/UX Audit Wave 3 Implementation Plan

## Status

Completed on 2026-07-11; runtime verification remains.

## Tasks

1. Add regression coverage for Account partial failures and admin query retry behavior.
2. Expose React Query error/refetch state in covered screens.
3. Apply the shared loading → error → empty → data precedence.
4. Preserve usable stale data during background failures.
5. Run focused tests, full tests, lint, build, and diff validation.

## Acceptance criteria

- Failed queries never produce zero metrics or a successful empty-state message.
- Every blocking query failure has a retry action.
- Account regions fail independently.
- Admin filters/search/tab/page remain unchanged when retrying.
- No backend, dependency, migration, payment, permission, or Room Planner changes.

## Risk and dependency

- Risk: low; presentation-only query-state handling.
- Dependency: existing `LoadErrorState` and React Query `refetch` behavior.

## Execution record

- Added consistent query failure handling across the scoped Account/admin screens.
- Automated verification results are recorded in the delivery summary.
- Manual runtime and assistive-technology verification is still required.
