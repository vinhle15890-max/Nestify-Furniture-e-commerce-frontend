import { useEffect } from 'react'

const MANAGED = 'data-nestify-head'
const absoluteUrl = (path) => new URL(path || window.location.pathname, import.meta.env.VITE_SITE_URL?.replace(/\/$/, '') || window.location.origin).toString()

function addMeta(attribute, key, content) {
  if (!content) return null
  const element = document.createElement('meta')
  element.setAttribute(attribute, key)
  element.content = content
  element.setAttribute(MANAGED, 'true')
  document.head.appendChild(element)
  return element
}

export function SeoHead({ title, description, canonicalPath, image, type = 'website', noindex = false, jsonLd }) {
  useEffect(() => {
    const previousTitle = document.title
    const canonical = absoluteUrl(canonicalPath)
    document.querySelectorAll('[data-nestify-prerender]').forEach((element) => element.remove())
    document.title = title
    const elements = [
      addMeta('name', 'description', description), addMeta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow'),
      addMeta('property', 'og:title', title), addMeta('property', 'og:description', description),
      addMeta('property', 'og:type', type), addMeta('property', 'og:url', canonical), addMeta('property', 'og:image', image),
      addMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
    ].filter(Boolean)
    const link = document.createElement('link')
    link.rel = 'canonical'; link.href = canonical; link.setAttribute(MANAGED, 'true'); document.head.appendChild(link); elements.push(link)
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'; script.textContent = JSON.stringify(jsonLd); script.setAttribute(MANAGED, 'true'); script.setAttribute('data-nestify-seo', 'true')
      document.head.appendChild(script); elements.push(script)
    }
    return () => { document.title = previousTitle; elements.forEach((element) => element.remove()) }
  }, [canonicalPath, description, image, jsonLd, noindex, title, type])
  return null
}
