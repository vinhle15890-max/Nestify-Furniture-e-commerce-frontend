# UI/UX Audit Wave 4 Implementation Plan

## Tasks

1. Cover transient failure versus 404/empty precedence.
2. Add retryable errors to Product Detail, Order Detail, Shared Room, and Checkout Return.
3. Add retryable errors to My Rooms and the Planner catalog tray.
4. Verify with focused/full tests, lint, build, Design DNA review, and `git diff --check`.

## Acceptance criteria

- Network/5xx failures never claim that data is absent or a payment outcome is known.
- 404 states remain distinct where the server supplies that evidence.
- Every transient first-load failure has “Thử lại”.
- Existing route/query context and successful empty states remain intact.
- No API, backend, payment mutation, persistence, dependency, or migration changes.

## Status

Completed on 2026-07-11. Focused suite: 40/40; full suite: 612/612; lint: 0 errors with 2 pre-existing Fast Refresh warnings; production build and `git diff --check`: passed. Runtime verification remains required.
