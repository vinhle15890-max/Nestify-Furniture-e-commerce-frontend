import { create } from 'zustand'
import { useAuthStore } from './authStore'

// Ephemeral "xem với vai trò" (view-as-role) state — never persisted, always
// resets on reload. Lets an admin preview the nav/route-gating a given role
// would see WITHOUT touching the real session: the auth token and the real
// user's own permissions are untouched, so the backend keeps enforcing every
// action against the real account regardless of what's being previewed.
export const usePreviewStore = create((set) => ({
  previewRole: null,
  setPreviewRole: (role) => set({ previewRole: role }),
  clearPreview: () => set({ previewRole: null }),
}))

// Combines the real user with an active role preview: while previewing, the
// user's `permissions` are swapped for the previewed role's so `can`/`canAny`
// (and anything built on them — nav, route guards, the 403 page) render
// exactly as that role would. No preview → the real user, unchanged.
export function useEffectiveUser() {
  const user = useAuthStore((state) => state.adminUser)
  const previewRole = usePreviewStore((state) => state.previewRole)
  return previewRole ? { ...user, permissions: previewRole.permissions ?? [] } : user
}
