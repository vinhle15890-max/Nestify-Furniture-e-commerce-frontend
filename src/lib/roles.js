// Canonical staff vs. customer test, mirrored from the backend (UserService /
// User::isStaff): a customer has no role other than 'customer' (a freshly
// registered shopper has no roles at all). Any other role — super_admin, admin,
// store_manager, order_staff, catalog_staff, moderator, or a custom one — is
// staff. Staff are the only accounts allowed into the admin area and are
// blocked from purchasing.
export function isStaff(user) {
  const roles = user?.roles
  if (!Array.isArray(roles)) return false
  return roles.some((role) => role !== 'customer')
}
