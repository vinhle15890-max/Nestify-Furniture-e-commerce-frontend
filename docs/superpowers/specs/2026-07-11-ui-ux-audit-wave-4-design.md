# UI/UX Audit Wave 4 — Detail and transaction recovery

## Status

Implemented on 2026-07-11; runtime verification remains required.

## Scope

Resolve false not-found and false terminal states on Product Detail, customer Order Detail, Shared Room, Checkout Return, My Rooms, the homepage best-seller section, and the Room Planner catalog tray. Reuse `LoadErrorState`; do not change API contracts, payment logic, Room Scene persistence, dependencies, or migrations.

## Findings

- **AUD-08 · High · P1:** transient detail failures are presented as “not found”, implying that products, orders, or shared rooms were removed.
- **AUD-09 · High · P1:** payment reconciliation failures fall through to a pending/unknown terminal message without an explicit retry.
- **AUD-10 · Medium · P2:** My Rooms and Planner catalog failures have no recovery or are presented as legitimate empty inventories.

## Behavior contract

- HTTP 404 may retain the existing not-found state.
- Any other first-load failure renders a resource-specific alert and retry action.
- Checkout Return never labels a request failure as a payment result. It stops automatic polling, explains that payment status is unknown, and offers an explicit retry.
- Retry preserves identifiers, search, page, and route context.
- A successful empty response retains the existing empty-state treatment.
- Raw server messages are not rendered.

## Verification

Focused and full automated suites, lint, production build, and diff validation. Offline, gateway delay, focus announcement, WebGL, and screen-reader behavior are **Needs runtime verification**.
