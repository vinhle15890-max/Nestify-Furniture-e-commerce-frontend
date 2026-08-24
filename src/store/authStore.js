import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      adminToken: null,
      adminUser: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setUser: (user) => set({ user }),
      adminLogin: (adminToken, adminUser) => set({ adminToken, adminUser }),
      adminLogout: () => set({ adminToken: null, adminUser: null }),
      setAdminUser: (adminUser) => set({ adminUser }),
    }),
    {
      name: 'nestify-auth',
      version: 2,
      migrate: (persisted) => {
        const state = persisted ?? {}
        const roles = state.user?.roles
        const legacyWasStaff = Array.isArray(roles) && roles.some((role) => role !== 'customer')
        if (!legacyWasStaff) return state

        // Existing browsers may have a staff session in the former shared slot.
        // Move it once so the new customer slot is never populated with staff credentials.
        return {
          ...state,
          token: null,
          user: null,
          adminToken: state.adminToken ?? state.token,
          adminUser: state.adminUser ?? state.user,
        }
      },
    },
  ),
)
