// Nhãn tiếng Việt cho các action ghi trong audit trail.
// BE thêm action mới về sau → labelForAction fallback slug thô (không vỡ UI).
export const AUDIT_ACTION_LABELS = {
  'access.denied': 'Truy cập bị chặn (403)',
  'order.cancel': 'Hủy đơn hàng',
  'order.status_transition': 'Chuyển trạng thái đơn',
  'payment.refund': 'Hoàn tiền',
  'user.assign_roles': 'Gán vai trò cho người dùng',
  'user.lock': 'Khoá người dùng',
  'user.unlock': 'Mở khoá người dùng',
  'role.create': 'Tạo vai trò',
  'role.update': 'Sửa vai trò',
  'role.delete': 'Xoá vai trò',
}

export function labelForAction(action) {
  return AUDIT_ACTION_LABELS[action] ?? action
}
