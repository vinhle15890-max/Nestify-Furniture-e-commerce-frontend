import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminAuditLogsPage } from './AdminAuditLogsPage'
import * as auditLogsApi from '../../../features/admin/auditLogs/api'

vi.mock('../../../features/admin/auditLogs/api')

const auditLogsPage1 = {
  data: [
    {
      id: 1,
      user: { id: 1, name: 'Bao Le', email: 'bao@example.com', status: 'active', roles: ['super_admin'], email_verified_at: null },
      action: 'update',
      entity_type: 'Product',
      entity_id: 5,
      old_values: { status: 'active' },
      new_values: { status: 'archived' },
      ip_address: '127.0.0.1',
      created_at: '2026-01-10T08:00:00Z',
    },
  ],
  meta: { pagination: { total: 30, page: 1, last_page: 3, per_page: 10 } },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminAuditLogsPage />
    </QueryClientProvider>,
  )
}

describe('AdminAuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auditLogsApi.getAuditLogs.mockResolvedValue(auditLogsPage1)
  })

  it('renders the paginated audit log list', async () => {
    renderPage()

    expect(await screen.findByText('Bao Le')).toBeInTheDocument()
    expect(screen.getByText('update')).toBeInTheDocument()
    expect(screen.getByText('Product #5')).toBeInTheDocument()
  })

  it('requests the next page when pagination changes', async () => {
    renderPage()
    await screen.findByText('Bao Le')

    await userEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => expect(auditLogsApi.getAuditLogs).toHaveBeenCalledWith(2))
  })

  it('expands a row to show old and new values', async () => {
    renderPage()
    await screen.findByText('Bao Le')

    await userEvent.click(screen.getByText('Chi tiết'))

    expect(screen.getByText(/"archived"/)).toBeInTheDocument()
  })
})
