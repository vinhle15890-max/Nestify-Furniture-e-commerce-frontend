# Nestify Frontend — AI Agent Guide

Vite + React 18 SPA, **plain JavaScript (JSX, no TypeScript)**. Customer storefront + admin
back-office for a furniture e-commerce platform, consuming a separate Laravel API over HTTP.

## Read before starting any feature work

1. `docs/superpowers/specs/2026-06-13-fe-nestify-design.md` — full design spec: architecture,
   project structure, routing/page map, design system ("Organic Editorial"), and the
   FE/BE contract per domain (Section G).
2. `docs/TASKS.md` — remaining work broken down by phase/module, with a checklist per module
   and a prompt template for AI-assisted work.
3. `BE_Nestify/docs/FE_AI_CONTEXT.md` (in the BE repo) — exact request/response shapes for
   every endpoint. FE never runs the BE locally; this doc is the source of truth for payloads.

## Stack

| Concern | Choice |
|---|---|
| Build | Vite (`react` template — plain JS) |
| UI | React 18, React Router v6 (`createBrowserRouter`) |
| Server state | TanStack Query v5 |
| Client state | Zustand + `persist` |
| HTTP | Single axios instance (`src/lib/apiClient.js`) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`, tokens in `src/styles/tokens.css`) |
| Headless UI | Radix UI primitives (Dialog, Toast, ...) |
| Icons | lucide-react (SVG only — no emoji icons) |
| Forms | React Hook Form + Yup |
| Testing | Vitest + React Testing Library + jsdom |

## Conventions

- **No TypeScript.** Plain `.js` / `.jsx` only — do not add `.ts`/`.tsx` files or type annotations.
- **Feature folders** (`src/features/<domain>/`): `api.js` (axios calls for that domain) +
  `hooks.js` (TanStack Query hooks wrapping `api.js`). Pages (`src/pages/`) stay thin —
  compose `features/` + `components/`, no direct `apiClient` calls from a page.
- **Errors**: every API error surfaces as `ApiError` (`src/lib/errors.js`) with `code`,
  `message` (already Vietnamese, user-facing — show directly in toasts), and `details`.
  Never show a raw axios/network error to the user.
- **Pagination**: use `useCursorQuery` / `useOffsetQuery` from `src/lib/pagination.js`.
  Cursor → infinite scroll/"load more"; offset → `<Pagination>` component.
- **Design tokens only**: use Tailwind semantic classes (`bg-primary`, `text-foreground`,
  `bg-surface`, `border-border`, etc.) from `src/styles/tokens.css`. Never raw hex colors.
- **Language**: all UI copy is Vietnamese. No i18n — don't add translation infrastructure.
- **Path alias**: `@/` → `src/` (configured in `vite.config.js` and `jsconfig.json`).
- **State boundaries**: server data → TanStack Query. Auth → `authStore`. Ephemeral UI-only
  state (drawers, transient selections) → `uiStore`, not persisted.

## Reference implementations (Phase 0 — follow these patterns)

| Pattern | File |
|---|---|
| Zustand store + `persist` | `src/store/authStore.js` (+ `authStore.test.js`) |
| Axios instance + interceptors | `src/lib/apiClient.js` |
| Error normalization | `src/lib/errors.js` |
| Pagination hooks | `src/lib/pagination.js` |
| Component + colocated test | `src/components/Pagination.jsx` + `Pagination.test.jsx` |
| Route guard | `src/routes/ProtectedRoute.jsx`, `src/routes/AdminRoute.jsx` |
| Route tree | `src/app/router.jsx` |
| Toast usage | `src/store/toastStore.js` + `src/components/Toast.jsx` |

## Workflow

- TDD: write the failing test first (Vitest + RTL), then implement.
- Before committing: `npm run lint` and `npm test -- --run` must both be clean.
- Branch off `main` per module/phase (see `docs/TASKS.md`).
- Snyk: run a code scan on new/modified first-party source files and fix any issues found
  before committing.
