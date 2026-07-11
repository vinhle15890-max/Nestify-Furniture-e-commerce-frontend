# UI/UX Audit Wave 3 — Truthful query recovery

## Status

Implemented on 2026-07-11; runtime verification remains required.

## Scope

- Account profile, order summary/recent orders, and default address queries.
- Admin dashboard and list screens for orders, products, categories, vouchers, audit logs, reviews, media, SEO drafts, customers, employees, and roles.
- Reuse the existing `LoadErrorState`; no backend, schema, dependency, permission, payment, or Room Planner changes.

## Findings addressed

- **AUD-06 · High · P1:** Account request failures are rendered as zero statistics or genuine empty states.
- **AUD-07 · High · P1:** Admin query failures are rendered as empty tables/lists or an error without recovery.

## Interaction contract

For every covered query, render states in this order:

1. Initial loading.
2. Initial failure without usable data: an actionable `role="alert"` error with retry.
3. Successful empty response: the existing empty state.
4. Successful data: the existing content.

If a refresh fails while usable data exists, retain the data and expose a compact `role="status"` warning. Retry calls the same query's `refetch`, preserving current route, filter, tab, search, and pagination state.

Account subregions recover independently. A failed orders request must not hide profile or address content; order statistics use an em dash until orders are known. A stored profile remains usable when profile refresh fails.

## Content and accessibility

- Never expose raw server errors.
- Error copy identifies the failed resource and offers “Thử lại”.
- Error and status semantics come from `LoadErrorState`.
- Existing successful empty-state copy remains unchanged.
- Focus is not moved automatically after background failures.

## Out of scope / do not touch

- Room Scene persistence and its incomplete backend work.
- Payment, order mutation, RBAC, and API contract logic.
- Form redesign, data model changes, migrations, and dependencies.

## Verification

- Component tests cover error-versus-empty precedence and retry recovery.
- Full Vitest suite, ESLint, production build, and `git diff --check`.
- **Needs runtime verification:** offline/slow-network behavior, focus announcement timing, and screen-reader output.
