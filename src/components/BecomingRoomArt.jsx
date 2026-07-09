/**
 * BecomingRoomArt — the site's signature "Becoming Room" motif as a reusable
 * illustration (Design DNA §1: the one visual motif allowed to recur, differing
 * only in level of completeness). Geometry mirrors the Hero so the whole site
 * reads as one room that becomes more complete as you scroll.
 *
 * `level` selects the Story Bible chapter it depicts:
 *   1 — Possibility (Chapter 1): bare outline, empty, coldest.
 *   2 — Experiment  (Chapter 3): + daylight wedge + one `emerging` chair.
 *   3 — Future Home (Chapter 4): + a few pieces and restrained `imagined`
 *       warmth. This is the ONLY place `imagined` #B5754A appears, and only as
 *       depiction of the Future-Home chapter — never as a CTA/interactive color.
 *
 * Flat fills only — no gradient/shadow (Visual Grammar). Purely decorative:
 * aria-hidden, no interaction.
 */
const C = {
  canvas: 'var(--color-canvas)',
  ink: 'var(--color-ink)',
  unbuilt: 'var(--color-unbuilt)',
  emerging: 'var(--color-emerging)',
  imagined: 'var(--color-imagined)',
}

export function BecomingRoomArt({ level = 1, className = '' }) {
  const lit = level >= 2
  const furnished = level >= 3

  return (
    <svg
      viewBox="0 0 560 380"
      aria-hidden="true"
      className={`h-auto w-full ${className}`}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Planes — flat fills in the canvas→unbuilt value family. */}
      <polygon points="20,20 540,20 380,120 200,120"
        style={{ fill: C.canvas, stroke: C.unbuilt }} strokeWidth="0.75" />
      <polygon points="20,20 200,120 200,250 20,360"
        style={{ fill: C.unbuilt, fillOpacity: 0.1, stroke: C.unbuilt }} strokeWidth="0.75" />
      <polygon points="540,20 380,120 380,250 540,360"
        style={{ fill: C.unbuilt, fillOpacity: 0.1, stroke: C.unbuilt }} strokeWidth="0.75" />
      <polygon points="200,120 380,120 380,250 200,250"
        style={{ fill: C.unbuilt, fillOpacity: 0.18, stroke: C.unbuilt }} strokeWidth="0.75" />
      <polygon points="20,360 540,360 380,250 200,250"
        style={{ fill: C.unbuilt, fillOpacity: 0.28, stroke: C.unbuilt }} strokeWidth="0.75" />

      {/* Window — the light source / anchor. */}
      <rect x="250" y="150" width="80" height="70"
        style={{ fill: C.canvas, stroke: C.unbuilt }} strokeWidth="0.75" />
      <line x1="290" y1="150" x2="290" y2="220" style={{ stroke: C.unbuilt }} strokeWidth="0.75" />
      <line x1="250" y1="185" x2="330" y2="185" style={{ stroke: C.unbuilt }} strokeWidth="0.75" />

      {/* Daylight wedge — a single flat shape, appears once life begins (lvl 2+).
          Warmed by a faint `imagined` wash only at Future Home (lvl 3). */}
      {lit && (
        <>
          <polygon points="250,250 330,250 390,360 170,360"
            style={{ fill: C.canvas }} fillOpacity="0.55" />
          {furnished && (
            <polygon points="250,250 330,250 390,360 170,360"
              style={{ fill: C.imagined }} fillOpacity="0.08" />
          )}
        </>
      )}

      {/* Future-Home furnishings (lvl 3) — a restrained rug + side table + lamp,
          drawn under the chair so the chair still reads on top. `imagined`
          appears here as depiction of the Future-Home chapter. */}
      {furnished && (
        <>
          {/* Rug */}
          <polygon points="196,346 372,346 336,304 214,304"
            style={{ fill: C.imagined }} fillOpacity="0.16" />
          {/* Side table */}
          <g fill="none" style={{ stroke: C.emerging }} strokeWidth="1.1">
            <rect x="300" y="312" width="26" height="14" rx="2" />
            <line x1="304" y1="326" x2="304" y2="336" />
            <line x1="322" y1="326" x2="322" y2="336" />
          </g>
          {/* Floor lamp with a warm `imagined` glow */}
          <line x1="345" y1="340" x2="345" y2="286" style={{ stroke: C.emerging }} strokeWidth="1.1" />
          <polygon points="336,286 354,286 349,272 341,272"
            style={{ fill: C.imagined, stroke: C.emerging }} fillOpacity="0.5" strokeWidth="1.1" />
          <circle cx="345" cy="292" r="3" style={{ fill: C.imagined }} fillOpacity="0.7" />
        </>
      )}

      {/* Architectural line-weight hierarchy: baseboard + one corner in `ink`. */}
      <polyline points="20,360 200,250 380,250 540,360"
        fill="none" style={{ stroke: C.ink }} strokeWidth="1.3" />
      <line x1="200" y1="120" x2="200" y2="250" style={{ stroke: C.ink }} strokeWidth="1.1" />

      {/* The habitation cue — one archetypal armchair (lvl 2+), outline
          `emerging`. At Future Home it gains a single warm `imagined` cushion. */}
      {lit && (
        <g fill="none" style={{ stroke: C.emerging }} strokeWidth="1.3">
          <rect x="232" y="300" width="36" height="28" rx="7" />
          {furnished && (
            <rect x="236" y="305" width="28" height="10" rx="3"
              style={{ fill: C.imagined, stroke: C.emerging }} fillOpacity="0.5" />
          )}
          <rect x="226" y="320" width="48" height="12" rx="4" />
          <rect x="222" y="310" width="8" height="18" rx="3" />
          <rect x="268" y="310" width="8" height="18" rx="3" />
          <line x1="230" y1="332" x2="230" y2="340" />
          <line x1="270" y1="332" x2="270" y2="340" />
        </g>
      )}
    </svg>
  )
}
