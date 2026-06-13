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
- **Styling:** Tailwind CSS v4 (CSS-first `@theme`, design tokens for the "Organic Editorial" theme)
- **Headless UI:** Radix UI primitives
- **Icons:** lucide-react
- **Forms:** React Hook Form + Yup
- **Testing:** Vitest + React Testing Library + jsdom

## Project Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions and reference patterns (for contributors and AI assistants)
- [`docs/superpowers/specs/2026-06-13-fe-nestify-design.md`](./docs/superpowers/specs/2026-06-13-fe-nestify-design.md) — full design spec: architecture, project structure, routing, design system, FE/BE contract
- [`docs/TASKS.md`](./docs/TASKS.md) — remaining work broken down by phase/module

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
