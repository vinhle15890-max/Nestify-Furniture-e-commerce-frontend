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
