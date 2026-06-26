import { apiClient } from './apiClient'

// Images embedded inside a product description live in their own Cloudinary
// folder so they're easy to audit separately from gallery media.
const DESCRIPTION_FOLDER = 'furniture/products/descriptions'

/**
 * Upload a file straight to Cloudinary using a short-lived signature minted by
 * our API (`POST /api/media/sign`). The file never touches our server. Returns
 * the secure HTTPS URL of the stored asset.
 */
export async function uploadToCloudinary(file, { folder = DESCRIPTION_FOLDER } = {}) {
  const timestamp = Math.floor(Date.now() / 1000)

  // apiClient unwraps to the response body → { data: { signature, api_key, ... } }
  const body = await apiClient.post('/media/sign', { timestamp, folder })
  const sign = body.data

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sign.api_key)
  formData.append('timestamp', String(sign.timestamp))
  formData.append('signature', sign.signature)
  formData.append('folder', folder)

  const resourceType = file.type?.startsWith('video') ? 'video' : 'image'
  const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloud_name}/${resourceType}/upload`

  const res = await fetch(endpoint, { method: 'POST', body: formData })
  if (!res.ok) {
    throw new Error('Tải tệp lên Cloudinary thất bại. Vui lòng thử lại.')
  }

  const json = await res.json()
  return json.secure_url
}
