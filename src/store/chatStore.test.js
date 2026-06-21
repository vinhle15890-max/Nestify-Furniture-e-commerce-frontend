import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from './chatStore'

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({ isOpen: false, messages: [] })
  })

  it('toggles, opens and closes the panel', () => {
    useChatStore.getState().toggle()
    expect(useChatStore.getState().isOpen).toBe(true)

    useChatStore.getState().close()
    expect(useChatStore.getState().isOpen).toBe(false)

    useChatStore.getState().open()
    expect(useChatStore.getState().isOpen).toBe(true)
  })

  it('appends messages with a generated id', () => {
    useChatStore.getState().addMessage({ role: 'user', text: 'Xin chào' })
    useChatStore.getState().addMessage({ role: 'assistant', text: 'Chào bạn' })

    const { messages } = useChatStore.getState()
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ role: 'user', text: 'Xin chào' })
    expect(messages[0].id).toBeTruthy()
    expect(messages[1].id).not.toBe(messages[0].id)
  })

  it('resets the message history', () => {
    useChatStore.getState().addMessage({ role: 'user', text: 'Test' })
    useChatStore.getState().reset()
    expect(useChatStore.getState().messages).toEqual([])
  })
})
