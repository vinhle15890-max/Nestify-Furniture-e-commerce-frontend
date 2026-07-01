// Line-art furniture motifs that carry the Nestify brand across admin empty states
// and the dashboard hero. Strokes use `currentColor`, so color comes from a token
// class on the consumer (e.g. `text-accent`). viewBox is a fixed 64×64 grid.

const MOTIFS = {
  sofa: (
    <>
      <path d="M14 32 V24 a4 4 0 0 1 4-4 h28 a4 4 0 0 1 4 4 v8" />
      <path d="M10 44 v-8 a4 4 0 0 1 4-4 h36 a4 4 0 0 1 4 4 v8" />
      <line x1="14" y1="38" x2="50" y2="38" />
      <line x1="16" y1="44" x2="16" y2="48" />
      <line x1="48" y1="44" x2="48" y2="48" />
    </>
  ),
  lamp: (
    <>
      <path d="M24 14 h16 l4 12 H20 z" />
      <line x1="32" y1="26" x2="32" y2="46" />
      <line x1="24" y1="48" x2="40" y2="48" />
      <path d="M29 46 l-5 2 M35 46 l5 2" />
    </>
  ),
  chair: (
    <>
      <path d="M22 10 V32 H44" />
      <line x1="22" y1="32" x2="22" y2="50" />
      <line x1="44" y1="32" x2="44" y2="50" />
    </>
  ),
  package: (
    <>
      <rect x="16" y="22" width="32" height="28" rx="2" />
      <line x1="16" y1="30" x2="48" y2="30" />
      <line x1="32" y1="22" x2="32" y2="30" />
    </>
  ),
  search: (
    <>
      <circle cx="28" cy="28" r="12" />
      <line x1="37" y1="37" x2="48" y2="48" />
    </>
  ),
}

const MOTIF_LABELS = {
  sofa: 'Ghế sofa',
  lamp: 'Đèn',
  chair: 'Ghế',
  package: 'Gói hàng',
  search: 'Tìm kiếm',
}

export function BrandIllustration({ name, size = 56, decorative = false, className = '', ...rest }) {
  const motif = MOTIFS[name] ?? MOTIFS.package
  const a11y = decorative
    ? { 'aria-hidden': 'true' }
    : { role: 'img', 'aria-label': MOTIF_LABELS[name] ?? 'Hình minh hoạ' }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
      {...a11y}
    >
      {motif}
    </svg>
  )
}
