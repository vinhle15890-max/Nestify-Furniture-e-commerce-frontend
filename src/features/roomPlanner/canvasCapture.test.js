import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerPlannerCanvas, unregisterPlannerCanvas, capturePlannerPreview } from './canvasCapture'

describe('capturePlannerPreview', () => {
  beforeEach(() => unregisterPlannerCanvas())

  it('chưa đăng ký canvas → null', async () => {
    expect(await capturePlannerPreview()).toBeNull()
  })

  it('đăng ký canvas → trả File png (đã thu nhỏ)', async () => {
    const drawImage = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (cb) => cb(new Blob(['x'], { type: 'image/png' })),
    })
    registerPlannerCanvas({ width: 1600, height: 900 })

    const file = await capturePlannerPreview(800)
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('room-preview.png')
    expect(file.type).toBe('image/png')
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 450)

    document.createElement.mockRestore()
  })

  it('huỷ đăng ký đúng canvas → null', async () => {
    const el = { width: 100, height: 100 }
    registerPlannerCanvas(el)
    unregisterPlannerCanvas(el)
    expect(await capturePlannerPreview()).toBeNull()
  })
})
