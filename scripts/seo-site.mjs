export const PRODUCTION_SITE_URL = 'https://www.nestify.asia'

export function resolveSeoSite(siteUrl, apiBaseUrl) {
  if (siteUrl?.trim()) return new URL(siteUrl).origin

  const apiUrl = new URL(apiBaseUrl)
  if (['localhost', '127.0.0.1'].includes(apiUrl.hostname)) return apiUrl.origin

  return PRODUCTION_SITE_URL
}
