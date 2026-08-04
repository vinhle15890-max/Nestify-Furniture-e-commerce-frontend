import { ArrowRight } from 'lucide-react'
import { Reveal } from '../Reveal'
import { BecomingRoomArt } from '../BecomingRoomArt'
import { plannerInvite } from '../../data/home'
import { ButtonLink } from '../Button'

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
    <section data-home-section="planner" className="relative overflow-hidden bg-ink text-canvas">
      <div aria-hidden="true" className="absolute -right-24 -top-36 size-[30rem] rounded-full bg-primary/25 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-24 md:py-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-10">
        <Reveal className="max-w-xl">
          <p className="text-sm font-medium text-primary">{plannerInvite.eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.6vw,3.2rem)] font-normal leading-[1.06] text-canvas">
            {plannerInvite.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-canvas/70">{plannerInvite.intro}</p>
          <div>
            <ButtonLink
              to={plannerInvite.cta.to}
              variant="secondary"
              className="mt-8 border-canvas/45 text-canvas hover:border-canvas hover:bg-canvas/10"
            >
              {plannerInvite.cta.label}
              <ArrowRight size={16} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={120} className="pointer-events-none mx-auto w-full max-w-[480px] px-2 lg:px-0">
          <BecomingRoomArt level={3} />
        </Reveal>
      </div>
    </section>
  )
}
