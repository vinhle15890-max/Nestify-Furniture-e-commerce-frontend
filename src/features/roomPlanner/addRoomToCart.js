// Thêm mọi món trong phòng vào giỏ theo kiểu best-effort: một món lỗi (hết hàng,
// không bán, không phải customer) không được chặn phần còn lại. Trả số đã thêm /
// bỏ qua để lớp gọi báo lại trung thực.
export async function addRoomToCart(lines, addItemAsync) {
  const valid = (lines ?? []).filter((l) => l.variantId != null)
  const results = await Promise.allSettled(
    valid.map((l) => addItemAsync({ variant_id: l.variantId, quantity: l.qty })),
  )
  const added = results.filter((r) => r.status === 'fulfilled').length
  return { added, skipped: results.length - added }
}
