export function backendOrigin() {
  const api = process.env.VITE_API_BASE_URL
  if (!api) throw new Error('VITE_API_BASE_URL is required')
  return api.replace(/\/api\/?$/, '').replace(/\/$/, '')
}

export async function proxySeoFile(response, path, contentType) {
  try {
    const upstream = await fetch(`${backendOrigin()}${path}`)
    const body = await upstream.text()
    response.status(upstream.status).setHeader('Content-Type', contentType).setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600').send(body)
  } catch {
    response.status(503).setHeader('Content-Type', 'text/plain; charset=UTF-8').send('SEO discovery temporarily unavailable')
  }
}
