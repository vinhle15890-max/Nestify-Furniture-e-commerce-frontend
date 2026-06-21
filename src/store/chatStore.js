import { create } from 'zustand'

// Ephemeral, in-memory only (NOT persisted): the chat history lives for the
// browsing session and resets on a hard reload — matching the stateless backend
// (each /ai/chat call is independent; the server keeps no conversation memory).
let idCounter = 0
const nextId = () => `msg-${++idCounter}`

export const useChatStore = create((set) => ({
  isOpen: false,
  // messages: { id, role: 'user' | 'assistant' | 'error', text, sources? }
  messages: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, { id: nextId(), ...message }] })),

  reset: () => set({ messages: [] }),
}))
