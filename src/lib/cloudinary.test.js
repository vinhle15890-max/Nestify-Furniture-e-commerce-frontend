import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadToCloudinary } from './cloudinary'
import { apiClient } from './apiClient'

vi.mock('./apiClient', () => ({ apiClient: { post: vi.fn() } }))

describe('uploadToCloudinary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.post.mockResolvedValue({
      data: { signature: 'sig123', api_key: 'key123', cloud_name: 'demo', timestamp: 1718000000 },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('signs via the API then uploads to Cloudinary and returns the secure URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/x.jpg' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const url = await uploadToCloudinary(file)

    expect(apiClient.post).toHaveBeenCalledWith('/media/sign', expect.objectContaining({ folder: expect.any(String) }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [endpoint, options] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('https://api.cloudinary.com/v1_1/demo/image/upload')
    expect(options.body.get('signature')).toBe('sig123')
    expect(options.body.get('api_key')).toBe('key123')
    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/x.jpg')
  })

  it('routes videos to the video upload endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://x/v.mp4' }) })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    await uploadToCloudinary(file)

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.cloudinary.com/v1_1/demo/video/upload')
  })

  it('throws a Vietnamese error when Cloudinary rejects the upload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(uploadToCloudinary(file)).rejects.toThrow(/Cloudinary thất bại/)
  })
})
