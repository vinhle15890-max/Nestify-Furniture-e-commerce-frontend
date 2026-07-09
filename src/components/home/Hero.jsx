import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { hero } from '../../data/home'

/**
 * Home Hero — Threshold (tiền-Chapter 1), NOT a narrative chapter
 * (Story Bible §"Threshold (tiền-Chapter 1)", amended 2026-07-09 "Threshold-
 * with-presence").
 *
 * A pre-arc invitation gate: make a stranger willingly step into the story.
 * It still must NOT transform, teach, demonstrate, or resolve — no placement
 * interaction, no "materialize", no Room Planner mechanics.
 *
 * Presence, not demonstration. The room is a one-point-perspective outline in
 * the `unbuilt` value family (State 1 — Possibility), lit by a single flat
 * `canvas` daylight wedge from the window (atmosphere with no gradient/shadow).
 * A single restrained chair sits in outline `emerging` — quiet evidence that a
 * life could begin here. It never animates and never answers the open question
 * ("Điều gì sẽ bắt đầu ở đây?"); most of the room stays empty on purpose.
 *
 * Visual hierarchy is deliberate: LIGHT → ROOM → CHAIR. The daylight wedge is
 * the brightest mark, the room outline is the structure, the chair is small,
 * off-centre and subordinate — the emotional protagonist is the room itself.
 * The lone exploratory CTA invites exploration ("Khám phá không gian"); it does
 * not launch or demonstrate the Planner.
 */
const C = {
  canvas: 'var(--color-canvas)',
  ink: 'var(--color-ink)',
  unbuilt: 'var(--color-unbuilt)',
  emerging: 'var(--color-emerging)',
}

// One-point-perspective room, ~3:2 viewBox. Front frame is inset from the
// viewBox edge so the illustration stays contained with breathing room; the
// back wall recedes toward a vanishing point just above centre.
function BecomingRoomOutline() {
  return (
    <svg
      viewBox="0 0 560 380"
      aria-hidden="true"
      className="h-auto w-full"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Planes — flat fills only, all in the canvas→unbuilt value family.
          Plane separation is carried by stepped `unbuilt` opacity, never by a
          gradient or a raw hex. */}
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

      {/* Window on the back wall — canvas punched through as the light source,
          with a simple two-bar mullion. This is the room's anchor: the light
          comes from it. */}
      <rect x="250" y="150" width="80" height="70"
        style={{ fill: C.canvas, stroke: C.unbuilt }} strokeWidth="0.75" />
      <line x1="290" y1="150" x2="290" y2="220" style={{ stroke: C.unbuilt }} strokeWidth="0.75" />
      <line x1="250" y1="185" x2="330" y2="185" style={{ stroke: C.unbuilt }} strokeWidth="0.75" />

      {/* The one light gesture — a single flat `canvas` polygon at 0.55 opacity
          fanning from the window across the floor. Daylight as one shape, no
          gradient. This pool is the brightest mark in the composition. */}
      <polygon points="250,250 330,250 390,360 170,360"
        style={{ fill: C.canvas }} fillOpacity="0.55" />

      {/* Two faint floor guides toward the vanishing point — depth cue only,
          kept very light so the room never reads as a CAD wireframe. */}
      <g style={{ stroke: C.unbuilt }} strokeWidth="0.5" strokeDasharray="3 7" strokeOpacity="0.4">
        <line x1="170" y1="360" x2="250" y2="250" />
        <line x1="390" y1="360" x2="330" y2="250" />
      </g>

      {/* Architectural line-weight hierarchy: only the baseboard and one back
          corner get the heavier `ink` edge — the single gesture that gives the
          room depth without boxing it in. */}
      <polyline points="20,360 200,250 380,250 540,360"
        fill="none" style={{ stroke: C.ink }} strokeWidth="1.3" />
      <line x1="200" y1="120" x2="200" y2="250" style={{ stroke: C.ink }} strokeWidth="1.1" />

      {/* The habitation cue — one archetypal armchair in outline `emerging`
          (not `imagined`, never filled). Small, off-centre, resting at the edge
          of the light: quiet evidence, subordinate to LIGHT and ROOM. */}
      <g fill="none" style={{ stroke: C.emerging }} strokeWidth="1.3">
        <rect x="232" y="300" width="36" height="28" rx="7" />
        <rect x="226" y="320" width="48" height="12" rx="4" />
        <rect x="222" y="310" width="8" height="18" rx="3" />
        <rect x="268" y="310" width="8" height="18" rx="3" />
        <line x1="230" y1="332" x2="230" y2="340" />
        <line x1="270" y1="332" x2="270" y2="340" />
      </g>

      {/* The open question, kept open — an invitation, not a UI instruction.
          Small and quiet, set in the empty floor beside (not on) the chair so
          most of the room stays undecided. */}
      <text x="342" y="344" textAnchor="middle" style={{ fill: C.emerging }} fillOpacity="0.85" fontSize="12">
        {hero.question}
      </text>
    </svg>
  )
}

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-canvas text-ink">
      <div className="mx-auto grid min-h-[86dvh] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-32 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:px-10">
        {/* Text column — the headline is the protagonist. */}
        <div className="order-2 flex max-w-xl flex-col justify-center lg:order-1">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink/60">{hero.eyebrow}</p>
          <h1 className="mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.05] tracking-[-0.02em]">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">{hero.subtitle}</p>
          <div>
            <Link
              to={hero.cta.to}
              className="group mt-8 inline-flex items-center gap-2 rounded-control border border-ink/25 px-6 py-3 text-sm font-medium tracking-wide text-ink transition-colors duration-200 ease-out hover:border-ink hover:bg-ink hover:text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {hero.cta.label}
              <ArrowRight size={16} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Illustration column — a contained, composed illustration with room to
            breathe, not a background graphic escaping to the viewport edge. */}
        <div className="order-1 lg:order-2">
          <div className="pointer-events-none mx-auto w-full max-w-[560px] px-2 sm:px-6 lg:px-4">
            <BecomingRoomOutline />
          </div>
        </div>
      </div>
    </section>
  )
}
