import { Outlet, ScrollRestoration } from 'react-router-dom'

/** Applies browser-like scroll behavior consistently across every route shell. */
export function RootRoute() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
