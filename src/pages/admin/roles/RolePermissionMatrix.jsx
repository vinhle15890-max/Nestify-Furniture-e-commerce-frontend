import { Check } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { Spinner } from '../../../components/Spinner'
import { PERMISSION_LABELS } from '../adminNav'
import { usePermissions } from '../../../features/admin/roles/hooks'

function labelFor(permission) {
  return PERMISSION_LABELS[permission.slug] ?? permission.display_name ?? permission.slug
}

const thBase = 'text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'

// Read-only Role×Permission overview. Rows = roles (customer hidden — it's the
// non-staff baseline with no admin permissions), columns = the full permission
// catalogue. Editing still goes through RoleFormDialog via onEdit (SP2); this grid
// never writes.
export function RolePermissionMatrix({ roles, onEdit }) {
  const { data: permData, isLoading } = usePermissions()
  const permissions = permData?.data ?? []
  const rows = roles.filter((role) => role.name !== 'customer')

  if (isLoading) {
    return <Spinner label="Đang tải quyền..." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Ma trận quyền theo vai trò</caption>
        <thead>
          <tr className="border-b border-border">
            <th className={`sticky left-0 z-10 bg-surface px-4 py-3 text-left ${thBase}`}>Vai trò</th>
            {permissions.map((permission) => (
              <th key={permission.slug} className={`px-3 py-3 text-center ${thBase}`} title={permission.display_name ?? permission.slug}>
                {labelFor(permission)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((role) => (
            <tr key={role.id} className="border-b border-border/60">
              <td className="sticky left-0 z-10 bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{role.display_name}</span>
                      <span className="text-xs text-muted-foreground">{role.name}</span>
                      {role.locked && (
                        <Badge tone="neutral">Hệ thống</Badge>
                      )}
                    </div>
                    {role.name === 'super_admin' && (
                      <span className="text-xs text-muted-foreground">Toàn quyền (bypass)</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => onEdit(role)}
                    aria-label={`${role.locked ? 'Xem' : 'Sửa'} vai trò ${role.display_name}`}
                    className="ml-auto"
                  >
                    {role.locked ? 'Xem' : 'Sửa'}
                  </Button>
                </div>
              </td>
              {permissions.map((permission) => {
                const has = role.permissions?.includes(permission.slug)
                return (
                  <td key={permission.slug} className="px-3 py-3 text-center">
                    {has ? (
                      <span role="img" aria-label={`${role.display_name} có quyền ${labelFor(permission)}`}>
                        <Check size={16} className="mx-auto text-foreground" aria-hidden="true" />
                      </span>
                    ) : (
                      <span aria-hidden="true" className="text-muted-foreground">–</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
