// Canonical staff vs. customer test, mirrored from the backend (UserService /
// User::isStaff): a customer has no role other than 'customer'. New shoppers
// receive that explicit marker; legacy shoppers may still have no roles. Any other role — super_admin, admin,
// store_manager, order_staff, catalog_staff, moderator, or a custom one — is
// staff. Staff are the only accounts allowed into the admin area and are
// blocked from purchasing.
export function isStaff(user) {
  const roles = user?.roles
  if (!Array.isArray(roles)) return false
  return roles.some((role) => role !== 'customer')
}

// Permission-level checks against the flat `permissions` array the backend adds
// to the user (union of the user's roles' permissions; super_admin gets all).
// FE gating is UX only — the backend still enforces every action with a 403.
export function can(user, slug) {
  const permissions = user?.permissions
  return Array.isArray(permissions) && permissions.includes(slug)
}

export function canAny(user, slugs) {
  return slugs.some((slug) => can(user, slug))
}
