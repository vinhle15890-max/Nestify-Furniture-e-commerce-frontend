export function HomeEntryRoute({ children }) {
  // `/` is always the storefront. Admin authentication is kept in its own
  // session slot and remains available at `/admin` in another tab.
  return children
}
