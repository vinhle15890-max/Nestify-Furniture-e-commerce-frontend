import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminUsersPage } from './AdminUsersPage'
import * as usersApi from '../../../features/admin/users/api'

vi.mock('../../../features/admin/users/api')

const usersResponse = {
  data: [
    {
      id: 1,
      name: 'Bao Le',
      email: 'bao@example.com',
      status: 'active',
      roles: ['super_admin'],
      email_verified_at: '2026-01-01T00:00:00+00:00',
    },
    {
      id: 2,
      name: 'Mai Anh',
      email: 'mai@example.com',
      status: 'active',
      roles: ['customer'],
      email_verified_at: null,
    },
  ],
  meta: { pagination: { total: 2, page: 1, last_page: 1, per_page: 20 } },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminUsersPage />
    </QueryClientProvider>,
  )
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usersApi.getUsers.mockResolvedValue(usersResponse)
  })

  it('renders the user list with role badges and status', async () => {
    renderPage()

    expect(await screen.findByText('Bao Le')).toBeInTheDocument()
    expect(screen.getByText('bao@example.com')).toBeInTheDocument()
    expect(screen.getByText('super_admin')).toBeInTheDocument()
    expect(screen.getByText('customer')).toBeInTheDocument()
    expect(screen.getAllByText('Hoạt động')).toHaveLength(2)
  })
})
