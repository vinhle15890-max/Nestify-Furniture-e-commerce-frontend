// Cầu nối giữa React event (bấm Lưu) và canvas WebGL của editor. Editor canvas tự
// đăng ký; capturePlannerPreview vẽ thu nhỏ lên canvas 2D rồi xuất PNG. Cần
// <Canvas gl={{ preserveDrawingBuffer: true }}> để đọc được pixel sau render.
let plannerCanvas = null

export function registerPlannerCanvas(el) {
  plannerCanvas = el
}

export function unregisterPlannerCanvas(el) {
  if (el === undefined || plannerCanvas === el) plannerCanvas = null
}

export async function capturePlannerPreview(maxWidth = 800) {
  const src = plannerCanvas
  if (!src || !src.width || !src.height) return null

  const scale = Math.min(1, maxWidth / src.width)
  const w = Math.round(src.width * scale)
  const h = Math.round(src.height * scale)

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(src, 0, 0, w, h)

  const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'))
  if (!blob) return null
  return new File([blob], 'room-preview.png', { type: 'image/png' })
}
