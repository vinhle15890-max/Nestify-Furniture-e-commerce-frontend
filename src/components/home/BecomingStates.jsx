import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { BecomingRoomArt } from '../BecomingRoomArt'
import { becomingSteps } from '../../data/home'

/**
 * BecomingStates — the homepage's emotional climax and the "room becomes as you
 * scroll" throughline made explicit. The same signature room is shown at three
 * levels of completeness (Possibility → Experiment → Future Home), turning the
 * whole page into one compressed "becoming".
 *
 * This is the missing Chapter-4 payoff ("giờ mình nhìn thấy rồi" — clarity): it
 * teaches the product's value (seeing your home before deciding) WITHOUT
 * demonstrating any Room Planner mechanic. Static illustration only.
 */
export function BecomingStates() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
      <SectionHeading
        eyebrow="Cách Nestify hoạt động"
        title="Từ căn phòng trống đến của bạn"
        intro="Cùng một căn phòng, hoàn thiện dần — đó là cách bạn nhìn thấy tổ ấm tương lai trước khi quyết định."
      />

      <ol className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-3">
        {becomingSteps.map((step, index) => (
          <Reveal as="li" key={step.n} delay={index * 90} className="flex flex-col">
            <div className="overflow-hidden rounded-card border border-border bg-canvas">
              <BecomingRoomArt level={step.level} />
            </div>
            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-sm text-emerging">{step.n}</span>
              <span className="eyebrow">{step.chapter}</span>
            </div>
            <h3 className="mt-3 font-display text-2xl leading-tight text-foreground">{step.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{step.caption}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
