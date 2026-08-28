import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuthStore } from './authStore'
import { usePreviewStore, useEffectiveUser } from './previewStore'

describe('useEffectiveUser', () => {
  beforeEach(() => {
    useAuthStore.setState({ adminToken: null, adminUser: null })
    usePreviewStore.setState({ previewRole: null })
  })

  it('trả về user thật khi không preview', () => {
    useAuthStore.setState({ adminUser: { id: 1, permissions: ['manage_orders'] } })
    const { result } = renderHook(() => useEffectiveUser())
    expect(result.current.permissions).toEqual(['manage_orders'])
  })

  it('thay permissions bằng permissions của role đang preview', () => {
    useAuthStore.setState({ adminUser: { id: 1, name: 'Bao', permissions: ['manage_orders'] } })
    usePreviewStore.setState({ previewRole: { name: 'order_staff', display_name: 'Nhân viên đơn', permissions: ['manage_orders', 'view_dashboard'] } })

    const { result } = renderHook(() => useEffectiveUser())
    expect(result.current.permissions).toEqual(['manage_orders', 'view_dashboard'])
    expect(result.current.id).toBe(1) // giữ nguyên danh tính thật, chỉ đổi permissions
  })

  it('role preview không có permissions → coi như rỗng, không throw', () => {
    useAuthStore.setState({ adminUser: { id: 1, permissions: ['manage_orders'] } })
    usePreviewStore.setState({ previewRole: { name: 'empty_role', display_name: 'Rỗng' } })

    const { result } = renderHook(() => useEffectiveUser())
    expect(result.current.permissions).toEqual([])
  })
})
