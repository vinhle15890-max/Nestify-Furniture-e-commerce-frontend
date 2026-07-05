// Deterministic, client-side SEO scoring for the product "Mô tả & SEO" panel.
// No AI call — instant, free, and testable. Gives the admin live feedback on the
// meta fields + description as they type. Heuristic guidance, not a ranking promise.

function stripTags(html) {
  return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function firstParagraphText(html) {
  const match = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html ?? '')
  return stripTags(match ? match[1] : '')
}

// pass = full weight, warn = half, fail = none.
const FACTOR = { pass: 1, warn: 0.5, fail: 0 }

function lengthStatus(len, [idealMin, idealMax], [okMin, okMax]) {
  if (len >= idealMin && len <= idealMax) return 'pass'
  if (len >= okMin && len <= okMax) return 'warn'
  return 'fail'
}

/**
 * @param {{metaTitle?: string, metaDescription?: string, description?: string, focusKeyword?: string}} input
 * @returns {{score: number, checks: Array<{id:string,label:string,status:'pass'|'warn'|'fail',hint:string}>}}
 */
export function computeSeoScore(input = {}) {
  const metaTitle = input.metaTitle ?? ''
  const metaDescription = input.metaDescription ?? ''
  const description = input.description ?? ''
  const keyword = (input.focusKeyword ?? '').trim().toLowerCase()
  const hasKeyword = keyword.length > 0

  const titleLen = metaTitle.trim().length
  const metaLen = metaDescription.trim().length
  const firstPara = firstParagraphText(description).toLowerCase()
  const hasH2 = /<h2[\s>]/i.test(description)
  const hasUl = /<ul[\s>]/i.test(description)

  // No keyword set → we can't judge presence, so warn (partial credit) with a nudge.
  const keywordStatus = (haystack) => {
    if (!hasKeyword) return 'warn'
    return haystack.toLowerCase().includes(keyword) ? 'pass' : 'fail'
  }
  const keywordHint = hasKeyword ? '' : 'Chưa đặt từ khóa chính'

  const checks = [
    {
      id: 'title_length',
      weight: 20,
      label: 'Độ dài tiêu đề SEO (50–60)',
      status: lengthStatus(titleLen, [50, 60], [30, 70]),
      hint: `${titleLen} ký tự`,
    },
    {
      id: 'meta_length',
      weight: 20,
      label: 'Độ dài mô tả SEO (140–160)',
      status: lengthStatus(metaLen, [140, 160], [100, 180]),
      hint: `${metaLen} ký tự`,
    },
    {
      id: 'keyword_in_title',
      weight: 15,
      label: 'Từ khóa trong tiêu đề SEO',
      status: keywordStatus(metaTitle),
      hint: keywordHint,
    },
    {
      id: 'keyword_in_meta',
      weight: 15,
      label: 'Từ khóa trong mô tả SEO',
      status: keywordStatus(metaDescription),
      hint: keywordHint,
    },
    {
      id: 'keyword_in_intro',
      weight: 15,
      label: 'Từ khóa trong đoạn mở đầu',
      status: keywordStatus(firstPara),
      hint: keywordHint,
    },
    {
      id: 'structure',
      weight: 15,
      label: 'Mô tả có tiêu đề phụ (H2) và danh sách',
      status: hasH2 && hasUl ? 'pass' : hasH2 || hasUl ? 'warn' : 'fail',
      hint: '',
    },
  ]

  const score = Math.round(checks.reduce((sum, c) => sum + c.weight * FACTOR[c.status], 0))

  return { score, checks }
}
