export const HOME_SEO = {
  title: 'Nestify — Mua nội thất và thiết kế phòng 3D trực tuyến',
  description: 'Khám phá nội thất cho phòng khách, phòng ngủ và phòng ăn tại Nestify. Thử bố trí sản phẩm trong phòng 3D để nhìn rõ không gian trước khi lựa chọn.',
}

export function createHomeJsonLd(siteUrl) {
  const url = new URL('/', siteUrl).toString()
  const organizationId = `${url}#organization`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Nestify',
        url,
      },
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: 'Nestify',
        alternateName: 'Nestify Nội Thất',
        url,
        inLanguage: 'vi-VN',
        publisher: { '@id': organizationId },
      },
    ],
  }
}
