import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveSeoSite } from './seo-site.mjs'

const api = process.env.VITE_API_BASE_URL?.replace(/\/$/, '')
if (!api) {
  process.stdout.write('SEO prerender skipped: VITE_API_BASE_URL is not set.\n')
  process.exit(0)
}

const template = await readFile('dist/index.html', 'utf8')
const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char])
const plain = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const site = resolveSeoSite(process.env.VITE_SITE_URL, api)

async function get(endpoint) {
  const response = await fetch(`${api}${endpoint}`)
  if (!response.ok) throw new Error(`Prerender fetch failed: ${endpoint} (${response.status})`)
  return response.json()
}

async function emit(route, { title, description, body, jsonLd }) {
  const canonical = `${site}${route}`
  const head = `<meta data-nestify-prerender="true" name="description" content="${escape(description)}"><meta data-nestify-prerender="true" name="robots" content="index,follow"><link data-nestify-prerender="true" rel="canonical" href="${escape(canonical)}"><meta data-nestify-prerender="true" property="og:title" content="${escape(title)}"><meta data-nestify-prerender="true" property="og:description" content="${escape(description)}"><meta data-nestify-prerender="true" property="og:url" content="${escape(canonical)}">${jsonLd ? `<script data-nestify-prerender="true" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}`
  const html = template.replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>${head}`).replace('<div id="root"></div>', `<div id="root"><main><h1>${escape(body.title)}</h1><p>${escape(body.description)}</p></main></div>`)
  const directory = path.join('dist', route.replace(/^\//, ''))
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, 'index.html'), html)
}

const categories = (await get('/categories')).data ?? []
const flatten = (nodes) => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
for (const category of flatten(categories)) {
  await emit(`/c/${category.slug}`, { title: `${category.name} | Nestify`, description: category.description || `Khám phá ${category.name} tại Nestify.`, body: { title: category.name, description: category.description || '' } })
}

let cursor = null
do {
  const query = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) })
  const page = await get(`/products?${query}`)
  for (const product of page.data ?? []) {
    const description = product.meta_description || plain(product.description).slice(0, 160)
    const variants = (product.variants ?? []).filter((variant) => variant.is_active !== false)
    const prices = variants.map((variant) => Number(variant.price)).filter(Number.isFinite)
    const offers = prices.length ? { '@type': prices.length > 1 ? 'AggregateOffer' : 'Offer', priceCurrency: 'VND', ...(prices.length > 1 ? { lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length } : { price: prices[0] }), availability: `https://schema.org/${variants.some((variant) => Number(variant.available_stock) > 0) ? 'InStock' : 'OutOfStock'}`, url: `${site}/p/${product.slug}` } : undefined
    await emit(`/p/${product.slug}`, { title: product.meta_title || `${product.name} | Nestify`, description, body: { title: product.name, description: plain(product.description) }, jsonLd: { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description, url: `${site}/p/${product.slug}`, ...(offers ? { offers } : {}) } })
  }
  cursor = page.meta?.pagination?.next_cursor || null
} while (cursor)

process.stdout.write('SEO prerender completed.\n')
