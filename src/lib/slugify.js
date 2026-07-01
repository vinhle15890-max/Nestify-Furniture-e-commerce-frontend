// Turns a product name into a URL slug that satisfies the backend `alpha_dash`
// rule: strip Vietnamese diacritics, map đ→d, lowercase, and reduce every run of
// non-alphanumerics to a single hyphen. Output is exclusively [a-z0-9-].
export function slugify(input) {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove combining diacritical marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
