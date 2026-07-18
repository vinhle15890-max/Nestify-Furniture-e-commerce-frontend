# Nestify Frontend — AI Agent Guide

> **Workspace hub:** repo này là 1 nửa của `Do-An-Tot-Nghiep/`. Bản đồ context cross-repo (BE+FE) +
> bộ subagent dùng chung nằm ở `../AGENTS.md`. Đụng cả 2 repo → điều phối từ hub.

Vite + React 18 SPA, **plain JavaScript (JSX, no TypeScript)**. Customer storefront + admin
back-office for a furniture e-commerce platform, consuming a separate Laravel API over HTTP.

## Design DNA — read FIRST for any storefront UI work

Nestify's brand + design system lives in `docs/nestify/` (source of truth, read in order):
`01_Brand_Constitution.md` → `02_Story_Bible.md` → `03_Design_DNA.md` →
`04_Visual_Grammar.md` → `05_Component_Bible.md` → token implementation
layer. Consult `07_Decision_Register.md` whenever another document appears to
conflict. `00_Brand_Context.md` and `06_Brand_Manifesto.md` are
supporting context, not rule authorities.

This DNA — **"The Becoming Room"** — is the current direction and supersedes
Organic / Warm Luxury Editorial for every storefront visual decision.
`src/styles/tokens.css` is the current token implementation:
inspect it before editing, but do not assume the old cream+brass palette remains
active.

### Hard guardrails — violating any of these = stop and re-confirm
- No cream `#F4F1EA`, no terracotta `#D97757`, no blueprint/CAD tones as primary colors (they read
  as AI-generated defaults — Design DNA §0).
- `imagined` `#B5754A` is **not** a site-wide default CTA color. `confirmed` `#3D5A45` marks
  Committed-state moments only (State 4 in Component Bible). It must never appear before Committed —
  not in State 1–3, not on Cart's Transactional Commitment amplification. It may appear at every
  genuine Committed-state moment: the Checkout confirm button, and any subsequent order-success
  confirmation (e.g. CheckoutReturnPage). It is not restricted to a single DOM location — it is
  restricted to a single psychological state.
- Never use hover to trigger a purchase action (Quick Add / Buy) anywhere in the "Being Explored" state.
- Any Room Planner UI must honor the Capability Boundaries (no-WebGL, small screen) — never assume the
  device supports 3D.
- No false-urgency copy ("chỉ còn X sản phẩm", fake countdowns). Voice: a warm guide, not a
  salesperson (Extraversion 30).

### Always remember
Nestify doesn't sell the product first — it sells *seeing-it-first* (clarity); confidence and
ownership are consequences, never sold directly. The Enemy is **fear of irreversible decisions**,
not competitors.

### Skills
- Creating/editing storefront UI → use the **`nestify-ui`** skill (`/nestify-ui`).
- Checking UI against the DNA → use the **`nestify-review`** skill (`/nestify-review`) before calling
  a UI task done.

## Read before starting any feature work

1. `docs/CURRENT-STATE-MECHANISMS.md` — canonical implemented architecture, behavioral mechanisms,
   enforcement boundaries, failure modes, and known limitations.
2. `docs/FE-TEAM-WORKFLOW.md` — canonical domain-by-domain request, cache/store, error, and route walkthrough.
3. `docs/nestify/01_Brand_Constitution.md` through `05_Component_Bible.md`, plus
   `07_Decision_Register.md`, for storefront UI work.
4. `Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md` (in the BE repo) — exact request/response shapes for
   every endpoint. FE never runs the BE locally; this doc is the source of truth for payloads.

Dated specs/plans, briefs, spikes, `docs/TASKS.md`, templates, and skills are working records. They can supply
historical rationale or task procedure, but are not current architecture/runtime contracts and must not be the
only place an implemented behavior is documented.

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
- Branch off `main` for each independently reviewable change, following the team's current Git policy.
- Snyk: run a code scan on new/modified first-party source files and fix any issues found
  before committing.
