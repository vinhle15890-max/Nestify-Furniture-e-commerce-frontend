import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PersonalizedSection } from './PersonalizedSection'
import { useAuthStore } from '../../store/authStore'
import * as personalizationHooks from '../../features/personalization/hooks'
import * as catalogHooks from '../../features/catalog/hooks'

vi.mock('../../features/personalization/hooks')
vi.mock('../../features/catalog/hooks')

function renderSection() {
  return render(
    <MemoryRouter>
      <PersonalizedSection />
    </MemoryRouter>,
  )
}

describe('PersonalizedSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    catalogHooks.useInfiniteProducts.mockReturnValue({ data: undefined })
  })

  it('renders nothing for a guest', () => {
    useAuthStore.setState({ token: null, user: null })
    const { container } = renderSection()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an admin/staff user', () => {
    useAuthStore.setState({ token: 't', user: { name: 'Admin', roles: ['super_admin'] } })
    const { container } = renderSection()
    expect(container).toBeEmptyDOMElement()
  })

  it('greets a logged-in customer', () => {
    useAuthStore.setState({ token: 't', user: { name: 'Bảo', roles: ['customer'] } })
    renderSection()
    expect(screen.getByText(/Chào mừng trở lại, Bảo/)).toBeInTheDocument()
  })
})
