# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Next.js + TypeScript scaffold with a Vite + React 18 (plain JavaScript/JSX) SPA foundation: build tooling, Tailwind v4 "Organic Editorial" design tokens, design-system primitives, API/state layer (axios, TanStack Query, Zustand), app shell, and a minimal routed skeleton with route guards — ready for Phase 1 (Auth & Account) to build on.

**Architecture:** Per `docs/superpowers/specs/2026-06-13-fe-nestify-design.md` (Sections A–F). Single Vite SPA, `src/` organized into `app/`, `pages/`, `features/`, `components/`, `lib/`, `store/`, `styles/`, `routes/`, `test/`. Axios single instance returns the BE `{ data, meta }` envelope as-is; errors are normalized to `ApiError`. Zustand `authStore` (persisted) holds `{ token, user }`; `apiClient` reads the token directly from the store. `ProtectedRoute`/`AdminRoute` reactively redirect via `<Navigate>` based on store state — no imperative `window.location` calls.

**Tech Stack:** Vite, React 18 (JS/JSX, no TS), React Router v6, TanStack Query v5, Zustand (+persist), Axios, Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme`), `@fontsource-variable/fraunces` + `@fontsource-variable/inter`, Radix UI (`react-dialog`, `react-toast`), lucide-react, Vitest + React Testing Library + jsdom + axios-mock-adapter.

---

## File Structure

**Removed (Next.js scaffold):**
- `app/` (entire directory: `favicon.ico`, `globals.css`, `layout.tsx`, `page.tsx`)
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

**Created:**
```
index.html                          # Vite HTML entry
vite.config.js                      # Vite config: React plugin, Tailwind plugin, @ alias
jsconfig.json                       # Editor support for @ -> src alias
eslint.config.js                    # ESLint 9 flat config for JS/JSX (Task 3)
.env.example                        # VITE_API_BASE_URL placeholder
package.json                        # Rewritten: Vite scripts + dependencies
src/main.jsx                        # React root render
src/App.jsx                         # Root component (providers + router) — finalized in Task 15
src/styles/globals.css              # Tailwind import + base resets
src/styles/tokens.css               # Organic Editorial @theme tokens (Task 3)
src/test/setup.js                   # Vitest + RTL setup (Task 4)
src/lib/errors.js                   # ApiError + normalizeError (Task 5)
src/lib/errors.test.js
src/store/authStore.js              # Zustand persist auth store (Task 6)
src/store/authStore.test.js
src/lib/apiClient.js                # Axios instance + interceptors (Task 7)
src/lib/apiClient.test.js
src/lib/queryClient.js              # TanStack Query client config (Task 8)
src/store/uiStore.js                # Zustand UI-only store (Task 8)
src/lib/pagination.js               # useCursorQuery / useOffsetQuery (Task 9)
src/lib/pagination.test.jsx
src/components/Button.jsx           # Design-system primitives (Task 10)
src/components/Input.jsx
src/components/Card.jsx
src/components/Badge.jsx
src/components/Spinner.jsx
src/components/primitives.test.jsx
src/store/toastStore.js             # Toast queue store (Task 11)
src/components/Toast.jsx            # Radix Toast viewport + renderer
src/components/Toast.test.jsx
src/components/Modal.jsx            # Radix Dialog wrapper (Task 12)
src/components/Modal.test.jsx
src/components/Pagination.jsx       # Offset pagination control (Task 13)
src/components/Pagination.test.jsx
src/components/layout/Header.jsx    # App shell (Task 14)
src/components/layout/Footer.jsx
src/components/layout/Layout.jsx
src/app/providers.jsx               # QueryClientProvider + Toast viewport (Task 15)
src/app/router.jsx                  # Route tree
src/routes/ProtectedRoute.jsx
src/routes/AdminRoute.jsx
src/pages/home/HomePage.jsx
src/pages/auth/LoginPage.jsx
src/pages/account/AccountPage.jsx
src/pages/admin/AdminDashboardPage.jsx
src/pages/NotFoundPage.jsx
src/App.test.jsx
```

**Modified:**
- `.gitignore` (drop Next.js-specific entries, add Vite `dist/`)

---

## Task 1: Remove Next.js scaffold; create Vite + React (JS) base files

**Files:**
- Delete: `app/` (recursive), `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
- Create: `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles/globals.css`, `jsconfig.json`
- Modify: `.gitignore`

- [ ] **Step 1: Remove the Next.js app directory and config files**

Run (PowerShell, from project root):

```powershell
Remove-Item -Recurse -Force app
Remove-Item -Force next.config.ts, tsconfig.json, eslint.config.mjs, postcss.config.mjs
Remove-Item -Force public/file.svg, public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg
```

- [ ] **Step 2: Update `.gitignore` for Vite**

Replace the `# next.js` section (lines 16-18) and `# typescript` section (lines 39-41):

```gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# vite
/dist
.vite/

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*
!.env.example

# vercel
.vercel

BE-Nestify/
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nestify</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Create a placeholder `src/App.jsx`**

This is replaced with providers + router in Task 15. For now it just proves the toolchain works.

```jsx
function App() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <h1 className="text-2xl font-bold">Nestify</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 6: Create `src/styles/globals.css`**

```css
@import "tailwindcss";

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100dvh;
}
```

(The `@theme` design tokens are added in Task 3, in `src/styles/tokens.css`, imported from this file.)

- [ ] **Step 7: Create `jsconfig.json`** for editor `@/` alias support

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

---

## Task 2: Rewrite `package.json`, install dependencies, verify dev server boots

**Files:**
- Modify: `package.json` (full rewrite)
- Delete: `package-lock.json` (regenerated by `npm install`)
- Create: `vite.config.js`, `.env.example`

- [ ] **Step 1: Rewrite `package.json`**

```json
{
  "name": "nestify",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  },
  "dependencies": {
    "@fontsource-variable/fraunces": "^5.1.0",
    "@fontsource-variable/inter": "^5.1.0",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-toast": "^1.2.6",
    "@tanstack/react-query": "^5.66.0",
    "axios": "^1.7.9",
    "lucide-react": "^0.476.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.29.0",
    "zustand": "^4.5.6"
  },
  "devDependencies": {
    "@eslint/js": "^9.20.0",
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitejs/plugin-react": "^4.3.4",
    "axios-mock-adapter": "^2.1.0",
    "eslint": "^9.20.0",
    "eslint-plugin-react": "^7.37.4",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^15.15.0",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4.0.0",
    "vite": "^6.1.0",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
```

- [ ] **Step 3: Create `.env.example`**

```
VITE_API_BASE_URL=http://localhost:8000/api
```

- [ ] **Step 4: Install dependencies**

```powershell
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

Expected: install completes with no errors (warnings about peer deps are acceptable).

- [ ] **Step 5: Verify the dev server boots**

```powershell
npm run dev
```

Expected: Vite prints a `Local: http://localhost:5173/` URL. Open it — the page shows "Nestify" centered on screen. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: replace Next.js scaffold with Vite + React JS"
```

---

## Task 3: Tailwind v4 "Organic Editorial" design tokens + fonts + ESLint config

**Files:**
- Create: `src/styles/tokens.css`, `eslint.config.js`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Create `src/styles/tokens.css`** with the Organic Editorial palette and type scale from spec Section F

```css
@theme {
  /* Colors */
  --color-background: #F5F0E1;
  --color-surface: #FBF8F3;
  --color-foreground: #2B2420;
  --color-muted-foreground: #8C8275;
  --color-border: #E3D7C8;
  --color-primary: #C67B5C;
  --color-primary-hover: #B5651D;
  --color-secondary: #6B7B3C;
  --color-accent: #D97706;
  --color-destructive: #C0392B;
  --color-ring: #C67B5C;

  /* Typography */
  --font-display: "Fraunces Variable", "Fraunces", serif;
  --font-sans: "Inter Variable", "Inter", sans-serif;

  /* Radii */
  --radius-control: 12px;
  --radius-card: 20px;

  /* Shadows */
  --shadow-soft: 0 4px 16px rgba(43, 36, 32, 0.06);
}
```

- [ ] **Step 2: Update `src/styles/globals.css`** to import fonts and tokens, and set base body styles

```css
@import "tailwindcss";
@import "./tokens.css";
@import "@fontsource-variable/fraunces";
@import "@fontsource-variable/inter";

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100dvh;
  font-family: var(--font-sans);
  background-color: var(--color-background);
  color: var(--color-foreground);
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: var(--font-display);
  line-height: 1.15;
}
```

- [ ] **Step 3: Create `eslint.config.js`** (ESLint 9 flat config for JS/JSX)

```js
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
```

- [ ] **Step 4: Verify dev server picks up the new theme**

```powershell
npm run dev
```

Expected: page background is now soft cream (`#F5F0E1`) and the "Nestify" heading renders in the Fraunces display font. Stop the server once confirmed.

- [ ] **Step 5: Run lint**

```powershell
npm run lint
```

Expected: no errors (the placeholder `App.jsx` and `main.jsx` are valid JSX).

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/globals.css eslint.config.js
git commit -m "feat: add Organic Editorial design tokens, fonts, and ESLint config"
```

---

## Task 4: Vitest + React Testing Library setup

**Files:**
- Create: `src/test/setup.js`, `src/App.test.jsx`

- [ ] **Step 1: Create `src/test/setup.js`**

```js
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Write a failing smoke test — `src/App.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the Nestify heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Nestify' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test**

```powershell
npm test
```

Expected: the test PASSES immediately, since `App.jsx` (Task 1) already renders an `<h1>Nestify</h1>`. This confirms Vitest + RTL + jsdom + `setupFiles` are wired correctly end-to-end.

(Note: `src/App.test.jsx` and `src/App.jsx` are both rewritten in Task 15 once the router/providers are in place — this test exists now purely to validate the test toolchain.)

- [ ] **Step 4: Commit**

```bash
git add src/test/setup.js src/App.test.jsx
git commit -m "test: add Vitest + RTL setup with App smoke test"
```

---

## Task 5: `lib/errors.js` — `ApiError` + `normalizeError`

Per spec Section C: `ApiError` carries `code`, `message` (Vietnamese, user-facing), `details`, and `status`. `normalizeError` converts an Axios error into an `ApiError`, mapping the BE envelope `{ error: { code, message, details } }` when present, or falling back to a generic `NETWORK_ERROR`.

**Files:**
- Create: `src/lib/errors.js`
- Test: `src/lib/errors.test.js`

- [ ] **Step 1: Write the failing test — `src/lib/errors.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { ApiError, normalizeError } from './errors'

describe('ApiError', () => {
  it('stores code, message, details, and status', () => {
    const err = new ApiError('INSUFFICIENT_STOCK', 'Không đủ hàng', { variant_id: 1, available: 2 }, 409)
    expect(err.code).toBe('INSUFFICIENT_STOCK')
    expect(err.message).toBe('Không đủ hàng')
    expect(err.details).toEqual({ variant_id: 1, available: 2 })
    expect(err.status).toBe(409)
    expect(err).toBeInstanceOf(Error)
  })

  it('defaults details to null when not provided', () => {
    const err = new ApiError('UNAUTHENTICATED', 'Unauthorized', undefined, 401)
    expect(err.details).toBeNull()
  })
})

describe('normalizeError', () => {
  it('maps a BE error envelope to an ApiError', () => {
    const axiosError = {
      response: {
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Dữ liệu không hợp lệ',
            details: { email: ['required'] },
          },
        },
      },
    }

    const result = normalizeError(axiosError)

    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('VALIDATION_FAILED')
    expect(result.message).toBe('Dữ liệu không hợp lệ')
    expect(result.details).toEqual({ email: ['required'] })
    expect(result.status).toBe(422)
  })

  it('falls back to NETWORK_ERROR when there is no error envelope', () => {
    const axiosError = { message: 'Network Error', response: undefined }

    const result = normalizeError(axiosError)

    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toBe('Network Error')
    expect(result.status).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/lib/errors.test.js
```

Expected: FAIL — `Failed to resolve import "./errors"` (file does not exist yet).

- [ ] **Step 3: Implement `src/lib/errors.js`**

```js
export class ApiError extends Error {
  constructor(code, message, details, status) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details ?? null
    this.status = status
  }
}

export function normalizeError(error) {
  const status = error.response?.status
  const body = error.response?.data?.error

  if (body) {
    return new ApiError(body.code, body.message, body.details, status)
  }

  return new ApiError('NETWORK_ERROR', error.message, null, status)
}
```

- [ ] **Step 4: Run the test to verify it passes**

```powershell
npx vitest run src/lib/errors.test.js
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.js src/lib/errors.test.js
git commit -m "feat: add ApiError and normalizeError"
```

---

## Task 6: `store/authStore.js` — Zustand auth store (persisted)

Per spec Section D: `{ token, user }` plus `login(token, user)`, `logout()`, `setUser(user)`, persisted to `localStorage` under key `'nestify-auth'`. `user.roles` (array of role names, e.g. `['super_admin']` or `['customer']`) drives `AdminRoute` (Task 15).

**Files:**
- Create: `src/store/authStore.js`
- Test: `src/store/authStore.test.js`

- [ ] **Step 1: Write the failing test — `src/store/authStore.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
    localStorage.clear()
  })

  it('starts with no token and no user', () => {
    const { token, user } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(user).toBeNull()
  })

  it('login sets token and user', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao', roles: ['customer'] })

    const { token, user } = useAuthStore.getState()
    expect(token).toBe('abc123')
    expect(user).toEqual({ id: 1, name: 'Bao', roles: ['customer'] })
  })

  it('logout clears token and user', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao' })
    useAuthStore.getState().logout()

    const { token, user } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(user).toBeNull()
  })

  it('setUser updates the user without touching the token', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao', roles: [] })
    useAuthStore.getState().setUser({ id: 1, name: 'Bao', roles: ['customer'] })

    const { token, user } = useAuthStore.getState()
    expect(token).toBe('abc123')
    expect(user.roles).toEqual(['customer'])
  })

  it('persists state to localStorage under "nestify-auth"', () => {
    useAuthStore.getState().login('abc123', { id: 1, name: 'Bao' })

    const stored = JSON.parse(localStorage.getItem('nestify-auth'))
    expect(stored.state.token).toBe('abc123')
    expect(stored.state.user).toEqual({ id: 1, name: 'Bao' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/store/authStore.test.js
```

Expected: FAIL — `Failed to resolve import "./authStore"` (file does not exist yet).

- [ ] **Step 3: Implement `src/store/authStore.js`**

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setUser: (user) => set({ user }),
    }),
    { name: 'nestify-auth' },
  ),
)
```

- [ ] **Step 4: Run the test to verify it passes**

```powershell
npx vitest run src/store/authStore.test.js
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/authStore.js src/store/authStore.test.js
git commit -m "feat: add persisted auth store"
```

---

## Task 7: `lib/apiClient.js` — Axios instance + interceptors

Per spec Section C: request interceptor injects `Authorization: Bearer <token>` from `authStore`; response interceptor returns the BE `{ data, meta }` envelope as-is on success, and on error normalizes via `normalizeError` into an `ApiError`. On `401` for non-`/auth/*` routes, clears `authStore` (so `ProtectedRoute`, built in Task 15, reactively redirects to `/login`).

**Files:**
- Create: `src/lib/apiClient.js`
- Test: `src/lib/apiClient.test.js`

- [ ] **Step 1: Write the failing test — `src/lib/apiClient.test.js`**

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from './apiClient'
import { useAuthStore } from '../store/authStore'
import { ApiError } from './errors'

describe('apiClient', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    useAuthStore.setState({ token: null, user: null })
  })

  afterEach(() => {
    mock.restore()
  })

  it('attaches an Authorization header when a token is present', async () => {
    useAuthStore.setState({ token: 'abc123' })
    mock.onGet('/account').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer abc123')
      return [200, { data: { id: 1 } }]
    })

    const result = await apiClient.get('/account')
    expect(result).toEqual({ data: { id: 1 } })
  })

  it('omits the Authorization header when there is no token', async () => {
    mock.onGet('/categories').reply((config) => {
      expect(config.headers.Authorization).toBeUndefined()
      return [200, { data: [] }]
    })

    await apiClient.get('/categories')
  })

  it('normalizes a BE error envelope into an ApiError', async () => {
    mock.onPost('/cart/items').reply(409, {
      error: { code: 'INSUFFICIENT_STOCK', message: 'Không đủ hàng', details: { available: 2 } },
    })

    await expect(apiClient.post('/cart/items')).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      message: 'Không đủ hàng',
      details: { available: 2 },
      status: 409,
    })
  })

  it('clears auth on 401 for non-/auth/* routes', async () => {
    useAuthStore.setState({ token: 'abc123', user: { id: 1 } })
    mock.onGet('/orders').reply(401, {
      error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' },
    })

    await expect(apiClient.get('/orders')).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('does not clear auth on 401 from /auth/* routes', async () => {
    useAuthStore.setState({ token: 'abc123', user: { id: 1 } })
    mock.onPost('/auth/login').reply(401, {
      error: { code: 'UNAUTHENTICATED', message: 'Email hoặc mật khẩu không đúng.' },
    })

    await expect(apiClient.post('/auth/login')).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().token).toBe('abc123')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/lib/apiClient.test.js
```

Expected: FAIL — `Failed to resolve import "./apiClient"` (file does not exist yet).

- [ ] **Step 3: Implement `src/lib/apiClient.js`**

```js
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { normalizeError } from './errors'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const isAuthRoute = error.config?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !isAuthRoute) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(normalizeError(error))
  },
)
```

- [ ] **Step 4: Run the test to verify it passes**

```powershell
npx vitest run src/lib/apiClient.test.js
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/apiClient.js src/lib/apiClient.test.js
git commit -m "feat: add axios apiClient with auth and error interceptors"
```

---

## Task 8: `lib/queryClient.js` + `store/uiStore.js`

Per spec Section D: `uiStore` holds purely client-side, non-persisted UI state — cart drawer open/closed, mobile nav open/closed, and the active checkout idempotency key (regenerated per checkout attempt, per spec Section C). Room-planner transient selection state is added when Phase 6 is built (YAGNI for now).

**Files:**
- Create: `src/lib/queryClient.js`, `src/store/uiStore.js`
- Test: `src/store/uiStore.test.js`

- [ ] **Step 1: Create `src/lib/queryClient.js`**

```js
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})
```

- [ ] **Step 2: Write the failing test — `src/store/uiStore.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      isCartOpen: false,
      isMobileNavOpen: false,
      checkoutIdempotencyKey: null,
    })
  })

  it('toggles the cart drawer', () => {
    useUiStore.getState().toggleCart()
    expect(useUiStore.getState().isCartOpen).toBe(true)

    useUiStore.getState().toggleCart()
    expect(useUiStore.getState().isCartOpen).toBe(false)
  })

  it('closes the cart drawer', () => {
    useUiStore.setState({ isCartOpen: true })
    useUiStore.getState().closeCart()
    expect(useUiStore.getState().isCartOpen).toBe(false)
  })

  it('toggles the mobile nav', () => {
    useUiStore.getState().toggleMobileNav()
    expect(useUiStore.getState().isMobileNavOpen).toBe(true)

    useUiStore.getState().closeMobileNav()
    expect(useUiStore.getState().isMobileNavOpen).toBe(false)
  })

  it('sets and resets the checkout idempotency key', () => {
    useUiStore.getState().setCheckoutIdempotencyKey('key-1')
    expect(useUiStore.getState().checkoutIdempotencyKey).toBe('key-1')

    useUiStore.getState().resetCheckoutIdempotencyKey()
    expect(useUiStore.getState().checkoutIdempotencyKey).toBeNull()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

```powershell
npx vitest run src/store/uiStore.test.js
```

Expected: FAIL — `Failed to resolve import "./uiStore"` (file does not exist yet).

- [ ] **Step 4: Implement `src/store/uiStore.js`**

```js
import { create } from 'zustand'

export const useUiStore = create((set) => ({
  isCartOpen: false,
  isMobileNavOpen: false,
  checkoutIdempotencyKey: null,

  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  closeCart: () => set({ isCartOpen: false }),

  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  closeMobileNav: () => set({ isMobileNavOpen: false }),

  setCheckoutIdempotencyKey: (key) => set({ checkoutIdempotencyKey: key }),
  resetCheckoutIdempotencyKey: () => set({ checkoutIdempotencyKey: null }),
}))
```

- [ ] **Step 5: Run the test to verify it passes**

```powershell
npx vitest run src/store/uiStore.test.js
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/queryClient.js src/store/uiStore.js src/store/uiStore.test.js
git commit -m "feat: add query client config and UI store"
```

---

## Task 9: `lib/pagination.js` — `useCursorQuery` / `useOffsetQuery`

Per spec Section C, two pagination patterns exist against `apiClient`'s `{ data, meta }` envelope:
- **Cursor** (`meta.pagination = { next_cursor, has_more, limit }`) → `useInfiniteQuery`-based `useCursorQuery`.
- **Offset** (`meta.pagination = { total, page, last_page, per_page }`) → `useQuery`-based `useOffsetQuery`, keyed on `[...queryKey, { page }]`.

**Files:**
- Create: `src/lib/pagination.js`
- Test: `src/lib/pagination.test.jsx`

- [ ] **Step 1: Write the failing test — `src/lib/pagination.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useCursorQuery, useOffsetQuery } from './pagination'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCursorQuery', () => {
  it('fetches the first page and follows next_cursor via fetchNextPage', async () => {
    const queryFn = (cursor) => {
      if (!cursor) {
        return Promise.resolve({
          data: [{ id: 1 }, { id: 2 }],
          meta: { pagination: { next_cursor: 'cursor-2', has_more: true, limit: 2 } },
        })
      }
      return Promise.resolve({
        data: [{ id: 3 }],
        meta: { pagination: { next_cursor: null, has_more: false, limit: 2 } },
      })
    }

    const { result } = renderHook(
      () => useCursorQuery({ queryKey: ['products'], queryFn }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.pages[0].data).toEqual([{ id: 1 }, { id: 2 }])
    expect(result.current.hasNextPage).toBe(true)

    await result.current.fetchNextPage()

    await waitFor(() => expect(result.current.data.pages).toHaveLength(2))
    expect(result.current.data.pages[1].data).toEqual([{ id: 3 }])
    expect(result.current.hasNextPage).toBe(false)
  })
})

describe('useOffsetQuery', () => {
  it('fetches data for the given page and refetches when page changes', async () => {
    const queryFn = (page) =>
      Promise.resolve({
        data: [{ id: page }],
        meta: { pagination: { total: 30, page, last_page: 3, per_page: 10 } },
      })

    const { result, rerender } = renderHook(
      ({ page }) => useOffsetQuery({ queryKey: ['admin', 'orders'], queryFn, page }),
      { wrapper: createWrapper(), initialProps: { page: 1 } },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.data).toEqual([{ id: 1 }])
    expect(result.current.data.meta.pagination.page).toBe(1)

    rerender({ page: 2 })

    await waitFor(() => expect(result.current.data.data).toEqual([{ id: 2 }]))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/lib/pagination.test.jsx
```

Expected: FAIL — `Failed to resolve import "./pagination"` (file does not exist yet).

- [ ] **Step 3: Implement `src/lib/pagination.js`**

```js
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

export function useCursorQuery({ queryKey, queryFn, enabled = true }) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.pagination?.has_more ? lastPage.meta.pagination.next_cursor : undefined,
    enabled,
  })
}

export function useOffsetQuery({ queryKey, queryFn, page, enabled = true }) {
  return useQuery({
    queryKey: [...queryKey, { page }],
    queryFn: () => queryFn(page),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

```powershell
npx vitest run src/lib/pagination.test.jsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pagination.js src/lib/pagination.test.jsx
git commit -m "feat: add cursor and offset pagination query hooks"
```

---

## Task 10: Design-system primitives — Button, Input, Card, Badge, Spinner

Per spec Section F: 12px rounded controls, 20px rounded cards, soft warm shadow, terracotta primary / espresso secondary / olive "in stock" / brick-red "out of stock" / amber "sale" tones. Components reference only the semantic Tailwind tokens from `tokens.css` (Task 3) — never raw hex values.

**Files:**
- Create: `src/components/Button.jsx`, `src/components/Input.jsx`, `src/components/Card.jsx`, `src/components/Badge.jsx`, `src/components/Spinner.jsx`
- Test: `src/components/primitives.test.jsx`

- [ ] **Step 1: Write the failing test — `src/components/primitives.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import { Input } from './Input'
import { Card } from './Card'
import { Badge } from './Badge'
import { Spinner } from './Spinner'

describe('Button', () => {
  it('renders children and responds to clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Mua ngay</Button>)

    const button = screen.getByRole('button', { name: 'Mua ngay' })
    await userEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies the primary variant by default', () => {
    render(<Button>Mua ngay</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('can be disabled', () => {
    render(<Button disabled>Mua ngay</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input id="email" label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows an error message and marks the field invalid', () => {
    render(<Input id="email" label="Email" error="Email không hợp lệ" />)

    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Email không hợp lệ')
  })
})

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Nội dung</Card>)
    expect(screen.getByText('Nội dung')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders the sale tone', () => {
    render(<Badge tone="sale">Sale</Badge>)
    expect(screen.getByText('Sale')).toHaveClass('bg-accent')
  })
})

describe('Spinner', () => {
  it('exposes a status role with an accessible label', () => {
    render(<Spinner label="Đang tải sản phẩm..." />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Đang tải sản phẩm...')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/components/primitives.test.jsx
```

Expected: FAIL — `Failed to resolve import "./Button"` (none of the components exist yet).

- [ ] **Step 3: Implement `src/components/Button.jsx`**

```jsx
const variantClasses = {
  primary: 'bg-primary text-surface hover:bg-primary-hover',
  secondary: 'border border-foreground text-foreground hover:bg-surface',
  ghost: 'text-foreground hover:bg-surface',
  destructive: 'bg-destructive text-surface hover:opacity-90',
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Implement `src/components/Input.jsx`**

```jsx
export function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${error ? 'border-destructive' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/components/Card.jsx`**

```jsx
export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-card border border-border bg-surface p-6 shadow-soft ${className}`} {...props}>
      {children}
    </div>
  )
}
```

- [ ] **Step 6: Implement `src/components/Badge.jsx`**

```jsx
const toneClasses = {
  sale: 'bg-accent text-surface',
  'in-stock': 'bg-secondary text-surface',
  'out-of-stock': 'bg-destructive text-surface',
  neutral: 'bg-border text-foreground',
}

export function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]} ${className}`} {...props}>
      {children}
    </span>
  )
}
```

- [ ] **Step 7: Implement `src/components/Spinner.jsx`**

```jsx
export function Spinner({ className = '', label = 'Đang tải...' }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

```powershell
npx vitest run src/components/primitives.test.jsx
```

Expected: PASS (7 tests).

- [ ] **Step 9: Commit**

```bash
git add src/components/Button.jsx src/components/Input.jsx src/components/Card.jsx src/components/Badge.jsx src/components/Spinner.jsx src/components/primitives.test.jsx
git commit -m "feat: add design-system primitives"
```

---

## Task 11: `store/toastStore.js` + `Toaster` (Radix Toast)

Per UX guidelines: toasts auto-dismiss (handled by Radix's `duration` prop), are dismissible, and announce via an ARIA live region (built into `@radix-ui/react-toast`). The store holds a plain queue; the `Toaster` component renders it.

**Files:**
- Create: `src/store/toastStore.js`, `src/components/Toast.jsx`
- Test: `src/store/toastStore.test.js`, `src/components/Toast.test.jsx`

- [ ] **Step 1: Write the failing test — `src/store/toastStore.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore } from './toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('adds a toast with a generated id and default variant', () => {
    const id = useToastStore.getState().addToast({ title: 'Hello' })

    expect(useToastStore.getState().toasts).toEqual([
      { id, title: 'Hello', description: undefined, variant: 'default' },
    ])
  })

  it('removes a toast by id', () => {
    const id = useToastStore.getState().addToast({ title: 'Hello' })
    useToastStore.getState().removeToast(id)

    expect(useToastStore.getState().toasts).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/store/toastStore.test.js
```

Expected: FAIL — `Failed to resolve import "./toastStore"` (file does not exist yet).

- [ ] **Step 3: Implement `src/store/toastStore.js`**

```js
import { create } from 'zustand'

let nextId = 0

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ title, description, variant = 'default' }) => {
    const id = ++nextId
    set((state) => ({ toasts: [...state.toasts, { id, title, description, variant }] }))
    return id
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
```

- [ ] **Step 4: Run the test to verify it passes**

```powershell
npx vitest run src/store/toastStore.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test — `src/components/Toast.test.jsx`**

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from './Toast'
import { useToastStore } from '../store/toastStore'

describe('Toaster', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('renders a toast added to the store', async () => {
    render(<Toaster />)

    useToastStore.getState().addToast({ title: 'Đã thêm vào giỏ', description: 'Sản phẩm đã được thêm.' })

    expect(await screen.findByText('Đã thêm vào giỏ')).toBeInTheDocument()
    expect(screen.getByText('Sản phẩm đã được thêm.')).toBeInTheDocument()
  })

  it('removes the toast from the store when the close button is clicked', async () => {
    render(<Toaster />)

    useToastStore.getState().addToast({ title: 'Đã xóa khỏi giỏ' })
    await screen.findByText('Đã xóa khỏi giỏ')

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))

    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(0))
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

```powershell
npx vitest run src/components/Toast.test.jsx
```

Expected: FAIL — `Failed to resolve import "./Toast"` (file does not exist yet).

- [ ] **Step 7: Implement `src/components/Toast.jsx`**

```jsx
import * as RadixToast from '@radix-ui/react-toast'
import { useToastStore } from '../store/toastStore'

const variantClasses = {
  default: 'border-border',
  success: 'border-secondary',
  error: 'border-destructive',
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <RadixToast.Root
          key={toast.id}
          duration={4000}
          className={`relative rounded-control border bg-surface p-4 pr-8 shadow-soft ${variantClasses[toast.variant] ?? variantClasses.default}`}
          onOpenChange={(open) => {
            if (!open) removeToast(toast.id)
          }}
        >
          {toast.title && <RadixToast.Title className="font-medium text-foreground">{toast.title}</RadixToast.Title>}
          {toast.description && (
            <RadixToast.Description className="text-sm text-muted-foreground">
              {toast.description}
            </RadixToast.Description>
          )}
          <RadixToast.Close aria-label="Đóng" className="absolute right-2 top-2 cursor-pointer text-muted-foreground">
            ×
          </RadixToast.Close>
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport className="fixed bottom-0 right-0 z-100 flex w-96 max-w-full flex-col gap-2 p-4" />
    </RadixToast.Provider>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

```powershell
npx vitest run src/components/Toast.test.jsx
```

Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/store/toastStore.js src/store/toastStore.test.js src/components/Toast.jsx src/components/Toast.test.jsx
git commit -m "feat: add toast store and Toaster component"
```

---

## Task 12: `components/Modal.jsx` (Radix Dialog)

A reusable Modal wrapper around `@radix-ui/react-dialog`, styled with Organic Editorial tokens. Used by Phase 1+ for confirmations (e.g. cancel order, delete address).

**Files:**
- Create: `src/components/Modal.jsx`
- Test: `src/components/Modal.test.jsx`

- [ ] **Step 1: Write the failing test — `src/components/Modal.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders title, description, and children when open', () => {
    render(
      <Modal open title="Xác nhận" description="Bạn có chắc chắn không?" onOpenChange={() => {}}>
        <p>Nội dung modal</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Xác nhận')).toBeInTheDocument()
    expect(screen.getByText('Bạn có chắc chắn không?')).toBeInTheDocument()
    expect(screen.getByText('Nội dung modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal open={false} title="Xác nhận" onOpenChange={() => {}}>
        <p>Nội dung modal</p>
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onOpenChange(false) when the close button is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <Modal open title="Xác nhận" onOpenChange={onOpenChange}>
        <p>Nội dung modal</p>
      </Modal>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/components/Modal.test.jsx
```

Expected: FAIL — `Failed to resolve import "./Modal"` (file does not exist yet).

- [ ] **Step 3: Implement `src/components/Modal.jsx`**

```jsx
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export function Modal({ open, onOpenChange, title, description, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface p-6 shadow-soft">
          {title && <Dialog.Title className="font-display text-xl text-foreground">{title}</Dialog.Title>}
          {description && (
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
          <Dialog.Close aria-label="Đóng" className="absolute right-4 top-4 cursor-pointer text-muted-foreground">
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```powershell
npx vitest run src/components/Modal.test.jsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.jsx src/components/Modal.test.jsx
git commit -m "feat: add Modal component"
```

---

## Task 13: `components/Pagination.jsx` — offset pagination control

Per spec Section C: drives `page` state for `useOffsetQuery`-backed lists (admin products/orders/vouchers/users/audit-logs, room scenes). Renders nothing for single-page result sets.

**Files:**
- Create: `src/components/Pagination.jsx`
- Test: `src/components/Pagination.test.jsx`

- [ ] **Step 1: Write the failing test — `src/components/Pagination.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} lastPage={1} onPageChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a button per page and marks the current page', () => {
    render(<Pagination page={2} lastPage={3} onPageChange={() => {}} />)

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
  })

  it('disables prev on the first page and not next', () => {
    render(<Pagination page={1} lastPage={3} onPageChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Trang sau' })).not.toBeDisabled()
  })

  it('calls onPageChange with the target page when a page button is clicked', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} lastPage={3} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with page + 1 when the next button is clicked', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} lastPage={3} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/components/Pagination.test.jsx
```

Expected: FAIL — `Failed to resolve import "./Pagination"` (file does not exist yet).

- [ ] **Step 3: Implement `src/components/Pagination.jsx`**

```jsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({ page, lastPage, onPageChange }) {
  if (lastPage <= 1) return null

  const pages = Array.from({ length: lastPage }, (_, index) => index + 1)

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-2">
      <Button
        variant="ghost"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </Button>

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'primary' : 'ghost'}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
        >
          {p}
        </Button>
      ))}

      <Button
        variant="ghost"
        aria-label="Trang sau"
        disabled={page >= lastPage}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={18} />
      </Button>
    </nav>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```powershell
npx vitest run src/components/Pagination.test.jsx
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Pagination.jsx src/components/Pagination.test.jsx
git commit -m "feat: add offset Pagination component"
```

---

## Task 14: App shell — `Header`, `Footer`, `Layout`

Per spec Section F: minimal top nav with a serif wordmark logo (Fraunces) and generous letter-spacing on nav links. The header is auth-aware: shows "Đăng nhập" when logged out, account/logout when logged in, and a "Quản trị" link only for users whose `roles` include `super_admin` (per `RolePermissionSeeder` — confirmed the only roles are `super_admin` and `customer`).

**Files:**
- Create: `src/components/layout/Header.jsx`, `src/components/layout/Footer.jsx`, `src/components/layout/Layout.jsx`
- Test: `src/components/layout/layout.test.jsx`

- [ ] **Step 1: Write the failing test — `src/components/layout/layout.test.jsx`**

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Layout } from './Layout'
import { useAuthStore } from '../../store/authStore'

describe('Header', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
  })

  it('shows "Đăng nhập" when logged out', () => {
    render(<Header />, { wrapper: MemoryRouter })
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument()
  })

  it('shows account and logout links when logged in', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    render(<Header />, { wrapper: MemoryRouter })

    expect(screen.getByLabelText('Tài khoản')).toBeInTheDocument()
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument()
  })

  it('shows the admin link only for super_admin users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Admin', roles: ['super_admin'] } })
    render(<Header />, { wrapper: MemoryRouter })

    expect(screen.getByText('Quản trị')).toBeInTheDocument()
  })

  it('hides the admin link for customer users', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    render(<Header />, { wrapper: MemoryRouter })

    expect(screen.queryByText('Quản trị')).not.toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('renders the brand name', () => {
    render(<Footer />)
    expect(screen.getByText(/Nestify/)).toBeInTheDocument()
  })
})

describe('Layout', () => {
  it('renders the header, footer, and routed content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>Nội dung trang</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Nestify')).toBeInTheDocument()
    expect(screen.getByText('Nội dung trang')).toBeInTheDocument()
    expect(screen.getByText(/© /)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/components/layout/layout.test.jsx
```

Expected: FAIL — `Failed to resolve import "./Header"` (none of the files exist yet).

- [ ] **Step 3: Implement `src/components/layout/Header.jsx`**

```jsx
import { Link, NavLink } from 'react-router-dom'
import { ShoppingCart, Menu, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'

const navLinkClass = ({ isActive }) =>
  `text-sm tracking-wide transition-colors duration-200 ease-out ${
    isActive ? 'text-primary' : 'text-foreground hover:text-primary'
  }`

export function Header() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav)
  const toggleCart = useUiStore((state) => state.toggleCart)

  const isAdmin = user?.roles?.includes('super_admin')

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="font-display text-2xl text-foreground">
          Nestify
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass} end>
            Trang chủ
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Quản trị
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Giỏ hàng"
            className="cursor-pointer text-foreground hover:text-primary"
            onClick={toggleCart}
          >
            <ShoppingCart size={20} />
          </button>

          {user ? (
            <>
              <Link to="/account" aria-label="Tài khoản" className="text-foreground hover:text-primary">
                <User size={20} />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="cursor-pointer text-sm text-foreground hover:text-primary"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm text-foreground hover:text-primary">
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            aria-label="Mở menu"
            className="cursor-pointer text-foreground hover:text-primary md:hidden"
            onClick={toggleMobileNav}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Implement `src/components/layout/Footer.jsx`**

```jsx
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Nestify. Mọi quyền được bảo lưu.</p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Implement `src/components/layout/Layout.jsx`**

```jsx
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

```powershell
npx vitest run src/components/layout/layout.test.jsx
```

Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/Header.jsx src/components/layout/Footer.jsx src/components/layout/Layout.jsx src/components/layout/layout.test.jsx
git commit -m "feat: add app shell (Header, Footer, Layout)"
```

---

## Task 15: Routing skeleton, route guards, and placeholder pages

Final wiring per spec Sections D/E: `providers.jsx` supplies `QueryClientProvider` + `Toaster`; `router.jsx` defines the route tree; `ProtectedRoute` redirects to `/login` when `authStore.token` is falsy; `AdminRoute` redirects to `/login` (no token) or `/` (authenticated but not `super_admin`) — the only roles that exist per `RolePermissionSeeder` are `super_admin` and `customer`. A minimal placeholder route set ships now (Home, Login, Account, Admin dashboard, NotFound); remaining routes from spec Section E are added incrementally by the phases that build them (YAGNI).

**Files:**
- Create: `src/app/providers.jsx`, `src/app/router.jsx`, `src/routes/ProtectedRoute.jsx`, `src/routes/AdminRoute.jsx`, `src/pages/home/HomePage.jsx`, `src/pages/auth/LoginPage.jsx`, `src/pages/account/AccountPage.jsx`, `src/pages/admin/AdminDashboardPage.jsx`, `src/pages/NotFoundPage.jsx`
- Modify: `src/App.jsx`, `src/App.test.jsx`

- [ ] **Step 1: Replace `src/App.test.jsx` with the failing routing test**

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './app/router'
import { Providers } from './app/providers'
import { useAuthStore } from './store/authStore'

function renderAt(initialPath, user = null) {
  if (user) {
    useAuthStore.setState({ token: 'abc', user })
  }
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
}

describe('App routes', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
  })

  it('renders the home page at "/"', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Nestify', level: 1 })).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown route', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
  })

  it('redirects /account to /login when not authenticated', () => {
    renderAt('/account')
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('renders /account when authenticated', () => {
    renderAt('/account', { id: 1, name: 'Bao', roles: ['customer'] })
    expect(screen.getByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument()
  })

  it('redirects /admin to home for a non-admin user', () => {
    renderAt('/admin', { id: 1, name: 'Bao', roles: ['customer'] })
    expect(screen.getByRole('heading', { name: 'Nestify', level: 1 })).toBeInTheDocument()
  })

  it('renders the admin dashboard for a super_admin user', () => {
    renderAt('/admin', { id: 1, name: 'Admin', roles: ['super_admin'] })
    expect(screen.getByRole('heading', { name: 'Quản trị' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx vitest run src/App.test.jsx
```

Expected: FAIL — `Failed to resolve import "./app/router"` (none of this task's files exist yet).

- [ ] **Step 3: Implement `src/app/providers.jsx`**

```jsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { Toaster } from '../components/Toast'

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 4: Implement `src/routes/ProtectedRoute.jsx`**

```jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
```

- [ ] **Step 5: Implement `src/routes/AdminRoute.jsx`**

```jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function AdminRoute() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user?.roles?.includes('super_admin')) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
```

- [ ] **Step 6: Implement the placeholder pages**

`src/pages/home/HomePage.jsx`:

```jsx
export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl text-foreground">Nestify</h1>
      <p className="mt-2 text-muted-foreground">Nội thất cho không gian sống của bạn.</p>
    </div>
  )
}
```

`src/pages/auth/LoginPage.jsx`:

```jsx
export function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Đăng nhập</h1>
    </div>
  )
}
```

`src/pages/account/AccountPage.jsx`:

```jsx
export function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Tài khoản</h1>
    </div>
  )
}
```

`src/pages/admin/AdminDashboardPage.jsx`:

```jsx
export function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Quản trị</h1>
    </div>
  )
}
```

`src/pages/NotFoundPage.jsx`:

```jsx
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="font-display text-3xl text-foreground">Không tìm thấy trang</h1>
      <p className="mt-2 text-muted-foreground">Trang bạn tìm không tồn tại.</p>
      <Link to="/" className="mt-4 inline-block text-primary">
        Về trang chủ
      </Link>
    </div>
  )
}
```

- [ ] **Step 7: Implement `src/app/router.jsx`**

```jsx
import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { HomePage } from '../pages/home/HomePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { AccountPage } from '../pages/account/AccountPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: 'account', element: <AccountPage /> }],
      },
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [{ index: true, element: <AdminDashboardPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
```

- [ ] **Step 8: Replace `src/App.jsx`**

```jsx
import { RouterProvider } from 'react-router-dom'
import { Providers } from './app/providers'
import { router } from './app/router'

function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}

export default App
```

- [ ] **Step 9: Run the test to verify it passes**

```powershell
npx vitest run src/App.test.jsx
```

Expected: PASS (6 tests).

- [ ] **Step 10: Run the full test suite**

```powershell
npm test
```

Expected: every test file from Tasks 4–15 passes.

- [ ] **Step 11: Commit**

```bash
git add src/app src/routes src/pages src/App.jsx src/App.test.jsx
git commit -m "feat: add routing skeleton with auth and admin route guards"
```

---

## Task 16: Final verification

**Files:** none (verification only — fix forward in the relevant task's files if anything fails)

- [ ] **Step 1: Run the full test suite**

```powershell
npm test
```

Expected: all test files from Tasks 4–15 pass (errors, authStore, apiClient, uiStore, pagination, primitives, toastStore, Toast, Modal, Pagination, layout, App routes).

- [ ] **Step 2: Run lint**

```powershell
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Run a production build**

```powershell
npm run build
```

Expected: build succeeds and emits `dist/`.

- [ ] **Step 4: Manual smoke check**

```powershell
npm run dev
```

In the browser:
- `/` — Home page renders with the soft-cream background, Fraunces "Nestify" heading, header (logo + "Đăng nhập") and footer.
- `/login` — Login placeholder heading renders.
- `/account` — redirects to `/login` (not authenticated).
- `/admin` — redirects to `/` (not authenticated).
- A nonexistent path, e.g. `/foo` — renders the "Không tìm thấy trang" page with a link back to `/`.

Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 5: Commit any fixes**

If Steps 1–4 required fixes, stage and commit them:

```bash
git add -A
git commit -m "fix: address issues found in Phase 0 final verification"
```

If no fixes were needed, skip this step — Phase 0 is complete.
