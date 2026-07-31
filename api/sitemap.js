import { proxySeoFile } from './_seoProxy.js'
export default async function handler(_request, response) {
  await proxySeoFile(response, '/sitemap.xml', 'application/xml; charset=UTF-8')
}
