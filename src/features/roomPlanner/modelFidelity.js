export function describeModelFidelity(variant) {
  if (!variant?.model_3d_url) return { tone: 'muted', text: 'Phiên bản này chưa có mô hình 3D.' }
  if (!variant.model_scale_confirmed) return { tone: 'warning', text: 'Mô hình chưa được xác nhận đúng tỉ lệ thực.' }
  if (!variant.model_variant_fidelity_confirmed) return { tone: 'warning', text: 'Tỉ lệ đã được xác nhận; màu sắc và hoàn thiện của phiên bản chưa được xác nhận.' }
  return { tone: 'confirmed', text: 'Mô hình đã được xác nhận đúng tỉ lệ và đúng phiên bản.' }
}
