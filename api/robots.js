import { proxySeoFile } from './_seoProxy.js'
export default async function handler(_request, response) {
  await proxySeoFile(response, '/robots.txt', 'text/plain; charset=UTF-8')
}
