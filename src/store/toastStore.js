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
