# Nestify — Furniture E-commerce Frontend

A Vite + React 18 single-page app (plain JavaScript, no TypeScript) for the Nestify furniture
e-commerce platform — customer storefront + admin back-office, consuming a separate Laravel API.

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the environment file and point it at your API:

```bash
cp .env.example .env
```

```
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the app.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint |

## Tech Stack

- **Build:** Vite
- **UI:** React 18, React Router v6
- **Server state:** TanStack Query v5
- **Client state:** Zustand (+ `persist`)
- **HTTP:** Axios (single instance with interceptors)
- **Styling:** Tailwind CSS v4 (CSS-first `@theme`; storefront visual decisions follow the current
  “The Becoming Room” Design DNA in `docs/nestify/`; older “Organic Editorial” material is historical)
- **Headless UI:** Radix UI primitives
- **Icons:** lucide-react
- **Forms:** React Hook Form + Yup
- **Testing:** Vitest + React Testing Library + jsdom

## Project Documentation

- [`docs/CURRENT-STATE-MECHANISMS.md`](./docs/CURRENT-STATE-MECHANISMS.md) — canonical runtime and
  architecture reference: route/auth boundaries, Room Planner mechanics, model-scale confirmation,
  SEO, commerce, media, admin, failure behavior, and known enforcement gaps.
- [`docs/FE-TEAM-WORKFLOW.md`](./docs/FE-TEAM-WORKFLOW.md) — durable, reviewer-oriented walkthrough of
  each frontend domain from route/page through hooks, API calls, cache/store effects, and errors.
- [`docs/nestify/`](./docs/nestify/) — canonical storefront brand and design system. Read Constitution →
  Story Bible → Design DNA → Visual Grammar → Component Bible; use the Decision Register for conflicts.
- [`AGENTS.md`](./AGENTS.md) — contributor conventions, implementation boundaries, and verification rules.

Files under `docs/superpowers/`, `docs/spikes/`, `docs/nestify/briefs/`, `docs/nestify/templates/`,
`.claude/skills/`, and `docs/TASKS.md` are working records or tooling instructions, not canonical product
documentation. They may explain how a decision was reached, but reviewers should not need them to understand
implemented behavior. When they disagree with the official references above, current code and the official
references win.

## Project Structure

```
src/
  app/        # Root component, router, providers
  pages/      # Route-level components (thin — compose features)
  features/   # Domain logic: api.js + hooks.js per domain
  components/ # Shared design-system primitives
  lib/        # apiClient, error handling, pagination helpers
  store/      # Zustand stores (auth, ui, toast)
  routes/     # Route guards (ProtectedRoute, AdminRoute)
  styles/     # Design tokens and global styles
  test/       # Vitest setup
```
