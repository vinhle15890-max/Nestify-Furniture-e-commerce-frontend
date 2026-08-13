import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { JourneyContinuation } from './JourneyContinuation'
import { useAuthStore } from '../../store/authStore'
import * as personalizationHooks from '../../features/personalization/hooks'

vi.mock('../../features/personalization/hooks')

function renderSection() {
  return render(<MemoryRouter><JourneyContinuation /></MemoryRouter>)
}

describe('JourneyContinuation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    personalizationHooks.useJourneyContext.mockReturnValue({ data: { data: { enabled: true, continuation: null, signals: {}, discovery: [] } }, isLoading: false })
  })

  it('does not mount personalization data for guests or staff', () => {
    useAuthStore.setState({ token: null, user: null })
    const { rerender } = renderSection()
    expect(personalizationHooks.useJourneyContext).not.toHaveBeenCalled()

    act(() => useAuthStore.setState({ token: 'staff', user: { roles: ['admin'], email_verified_at: '2026-08-01' } }))
    rerender(<MemoryRouter><JourneyContinuation /></MemoryRouter>)
    expect(personalizationHooks.useJourneyContext).not.toHaveBeenCalled()
  })

  it('prioritizes the latest saved room and keeps recommendations evidence-based', () => {
    useAuthStore.setState({ token: 'customer', user: { name: 'Nguyễn Bảo', roles: ['customer'], email_verified_at: '2026-08-01' } })
    personalizationHooks.useJourneyContext.mockReturnValue({ data: { data: {
      enabled: true,
      continuation: { type: 'room', room: { id: 7, name: 'Phòng khách', preview_url: null, item_count: 1 } },
      signals: { wishlist_count: 1 },
      discovery: [{ product: { id: 3, slug: 'ghe-moi', name: 'Ghế mới', base_price: 300, variants: [] }, reason: { category: { slug: 'ghe' } } }],
    } }, isLoading: false })

    renderSection()

    expect(screen.getByRole('heading', { name: 'Bảo, tiếp tục từ nơi bạn đã dừng lại' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mở lại phòng/ })).toHaveAttribute('href', '/room-planner/7')
    expect(screen.getByText('Ghế mới')).toBeInTheDocument()
  })

  it('hides itself when there is no personal evidence', () => {
    useAuthStore.setState({ token: 'customer', user: { name: 'Bảo', roles: ['customer'], email_verified_at: '2026-08-01' } })
    const { container } = renderSection()
    expect(container).toBeEmptyDOMElement()
  })
})
