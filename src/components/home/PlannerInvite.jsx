import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '../Reveal'
import { BecomingRoomArt } from '../BecomingRoomArt'
import { plannerInvite } from '../../data/home'

/**
 * PlannerInvite — the closing beat that completes the arc: Home → Planner. It
 * NAMES the Room Planner as the destination (Story Bible allows Home to point to
 * the Planner as a doorway, not to demonstrate what happens inside). A gentle
 * `unbuilt` band gives the page rhythm; the CTA stays `ink` (no `imagined`
 * before the user has actually visualized anything).
 *
 * Note: this is NOT the Threshold/Hero, so a direct link to /room-planner is
 * correct here (the Threshold's no-direct-Planner-CTA rule applies to the Hero).
 */
export function PlannerInvite() {
  return (
    <section className="border-y border-border bg-unbuilt/15">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-24 md:py-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-10">
        <Reveal className="max-w-xl">
          <p className="eyebrow">{plannerInvite.eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.06] text-foreground">
            {plannerInvite.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{plannerInvite.intro}</p>
          <div>
            <Link
              to={plannerInvite.cta.to}
              className="group mt-8 inline-flex items-center gap-2 rounded-control bg-ink px-6 py-3 text-sm font-medium tracking-wide text-canvas transition-colors duration-200 ease-out hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {plannerInvite.cta.label}
              <ArrowRight size={16} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120} className="pointer-events-none mx-auto w-full max-w-[480px] px-2 lg:px-0">
          <BecomingRoomArt level={3} />
        </Reveal>
      </div>
    </section>
  )
}
