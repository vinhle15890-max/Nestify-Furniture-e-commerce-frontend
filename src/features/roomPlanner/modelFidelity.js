export function describeModelFidelity(variant) {
  if (!variant?.model_3d_url) return { tone: 'muted', text: 'Phiên bản này chưa thể đặt thử trong phòng.' }
  if (!variant.model_scale_confirmed) return { tone: 'warning', text: 'Bạn có thể xem thử, nhưng kích thước hiển thị chỉ mang tính tham khảo.' }
  if (!variant.model_variant_fidelity_confirmed) return { tone: 'warning', text: 'Kích thước đã được đối chiếu; màu sắc và bề mặt hiển thị có thể khác đôi chút.' }
  return { tone: 'confirmed', text: 'Kích thước và phiên bản hiển thị đã được đối chiếu.' }
}
