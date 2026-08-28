import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssignRolesDialog } from './AssignRolesDialog'
import { AddEmployeeDialog } from './AddEmployeeDialog'
import * as hooks from '../../../features/admin/users/hooks'

vi.mock('../../../features/admin/users/hooks')

const mutation = { mutateAsync: vi.fn(), isPending: false }
const user = { id: 2, name: 'Bao Le', email: 'bao@example.com', role_ids: [10] }

beforeEach(() => {
  vi.clearAllMocks()
  hooks.useAssignUserRoles.mockReturnValue(mutation)
  hooks.useCreateStaff.mockReturnValue(mutation)
})

describe('admin role-assignment dialogs', () => {
  it('AssignRolesDialog exposes role-query retry and cannot save an accidental empty set', async () => {
    const refetch = vi.fn()
    hooks.useRoles.mockReturnValue({ data: undefined, isLoading: false, isError: true, isFetching: false, refetch })

    render(<AssignRolesDialog user={user} open onOpenChange={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải danh sách vai trò')
    expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('AddEmployeeDialog blocks account creation when role catalogue cannot load', async () => {
    const refetch = vi.fn()
    hooks.useRoles.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, isError: true, refetch })

    render(<AddEmployeeDialog open onOpenChange={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải vai trò')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
