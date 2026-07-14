import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { hero } from '../../data/home'

const C = {
  canvas: 'var(--color-canvas)',
  ink: 'var(--color-ink)',
  unbuilt: 'var(--color-unbuilt)',
  emerging: 'var(--color-emerging)',
}

// Visual Grammar §5: every edge derives from one structural stroke S.
const S = 1.6
const line = {
  receding: S * 0.74,
  structural: S,
  foreground: S * 1.35,
  furniture: S * 0.65,
}

/**
 * Direction 3 — The Entered Edge.
 *
 * This is one incomplete architectural field spanning the Hero composition,
 * not a room diagram or an illustration column. The proposition sits on the
 * near wall. Its cropped jamb occludes a middle floor plane; a partial far
 * opening at frame-right supplies one neutral daylight gesture. The scene is
 * deliberately unresolved and contains no interaction or Planner vocabulary.
 */
function EnteredEdgeStudy() {
  return (
    <svg
      data-testid="entered-edge-study"
      viewBox="0 0 1200 720"
      preserveAspectRatio="xMinYMid slice"
      aria-hidden="true"
      className="h-full w-full"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Near wall / question field. Its cropped inner boundary is the jamb. */}
      <path
        d="M0 100H570L620 455 500 720H0Z"
        style={{ fill: C.unbuilt }}
        fillOpacity="0.14"
      />

      {/* Narrow reveal plane proves the foreground edge is a thick wall jamb. */}
      <path
        d="M570 100L635 128 682 438 620 455Z"
        style={{ fill: C.unbuilt }}
        fillOpacity="0.36"
      />

      {/* Far wall and middle floor separate by value before linework. */}
      <path
        d="M635 128L1200 90V424L682 438Z"
        style={{ fill: C.unbuilt }}
        fillOpacity="0.18"
      />
      <path
        d="M620 455L682 438 1200 424V720H500Z"
        style={{ fill: C.unbuilt }}
        fillOpacity="0.42"
      />

      {/* One off-frame architectural opening at right: source, not decoration. */}
      <path
        d="M1095 125L1200 90V424L1105 427Z"
        style={{ fill: C.canvas }}
        fillOpacity="0.98"
      />

      {/* One connected daylight gesture, bent across wall then floor. */}
      <g data-light-gesture="daylight-from-right-opening">
        <path
          d="M1095 125L1200 90V424L1105 427 935 431Z"
          style={{ fill: C.canvas }}
          fillOpacity="0.72"
        />
        <path
          d="M935 431L1105 427 1200 424V720H748L830 548Z"
          style={{ fill: C.canvas }}
          fillOpacity="0.58"
        />
      </g>

      {/* Receding wall-floor joint: useful structure, never a perspective guide. */}
      <path
        d="M682 438L1105 427"
        fill="none"
        style={{ stroke: C.unbuilt }}
        strokeWidth={line.receding}
        strokeOpacity="0.72"
      />

      {/* Far-opening edge loses contrast relative to the foreground jamb. */}
      <path
        d="M1095 125L1105 427"
        fill="none"
        style={{ stroke: C.emerging }}
        strokeWidth={line.structural}
        strokeOpacity="0.42"
      />

      {/* Structural inner reveal: readable thickness, lower than focal edge. */}
      <path
        d="M635 128L682 438 620 455"
        fill="none"
        style={{ stroke: C.emerging }}
        strokeWidth={line.structural}
        strokeOpacity="0.46"
      />

      {/* The single focal contour: near wall → jamb → cropped threshold. */}
      <path
        d="M570 100L620 455 500 720"
        fill="none"
        style={{ stroke: C.ink }}
        strokeWidth={line.foreground}
        strokeOpacity="0.62"
      />

      {/* One anonymous habitation fragment: four contours, always static. */}
      <g
        className="hidden lg:block"
        fill="none"
        style={{ stroke: C.emerging }}
        strokeWidth={line.furniture}
        strokeOpacity="0.36"
      >
        <path d="M925 518V495Q925 483 938 481H953Q965 482 965 494V524" />
        <path d="M921 515Q945 522 970 513" />
        <path d="M931 519L928 543" />
        <path d="M960 518L965 540" />
      </g>
    </svg>
  )
}

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-canvas text-ink">
      <div className="relative mx-auto max-w-[1440px] overflow-hidden px-6 pb-16 pt-32 sm:px-10 sm:pb-20 lg:min-h-[86dvh] lg:px-14 lg:pb-24 lg:pt-0">
        {/* Proposition first. It is anchored to the near wall, not a column. */}
        <div className="relative z-20 max-w-[36rem] lg:ml-[clamp(1rem,4vw,4rem)] lg:pt-[clamp(10rem,22vh,13rem)] xl:max-w-[39rem]">
          <h1 className="font-display text-[clamp(3rem,4.8vw,4.75rem)] font-normal leading-[1.02] tracking-[-0.035em]">
            {hero.title}
          </h1>
          <p className="mt-7 max-w-[34rem] text-[clamp(1rem,1.25vw,1.16rem)] leading-[1.75] text-ink/70">
            {hero.subtitle}
          </p>
        </div>

        {/* Relative below lg; one full-frame architectural field at desktop. */}
        <div className="pointer-events-none relative z-10 -mx-6 mt-8 h-[19rem] overflow-hidden sm:-mx-10 sm:mt-8 sm:h-[23rem] md:h-[25rem] lg:absolute lg:inset-0 lg:m-0 lg:h-auto">
          <EnteredEdgeStudy />
        </div>

        <div className="relative z-20 mt-8 lg:ml-[clamp(1rem,4vw,4rem)] lg:mt-10">
          <Link
            to={hero.cta.to}
            className="group inline-flex items-center gap-3 border-b border-ink/30 pb-2 text-sm font-medium tracking-wide text-ink transition-colors duration-200 ease-out hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
          >
            {hero.cta.label}
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  )
}
