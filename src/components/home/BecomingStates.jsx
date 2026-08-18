import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { becomingSteps } from '../../data/home'

/**
 * BecomingStates — the homepage's emotional climax and the "room becomes as you
 * scroll" throughline made explicit. The same signature room is shown at three
 * real Room Planner captures (Possibility → Experiment → Future Home), turning
 * the whole page into one compressed "becoming".
 *
 * This is the missing Chapter-4 payoff ("giờ mình nhìn thấy rồi" — clarity): it
 * teaches the product's value with real product evidence instead of simulated
 * UI or decorative SVG artwork.
 */
export function BecomingStates() {
  return (
    <section data-home-section="clarity" className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
      <SectionHeading
        eyebrow="Lý do để chọn chắc hơn"
        title="Thấy trước khi quyết định"
        intro="Khi một món đồ giữ sự chú ý của bạn, hãy đặt nó vào đúng kích thước phòng để so sánh bố cục trước khi chọn mua."
      />

      <ol className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-3">
        {becomingSteps.map((step, index) => (
          <Reveal as="li" key={step.n} delay={index * 90} className="flex flex-col">
            <div className={`overflow-hidden rounded-card border bg-canvas ${
              step.level === 3 ? 'border-imagined/60 bg-imagined/10' : 'border-border'
            }`}>
              <img
                src={step.image}
                alt={step.imageAlt}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover object-top"
              />
            </div>
            <div className="mt-6 flex items-baseline gap-3">
              <span className={`text-sm font-medium ${step.level === 3 ? 'text-imagined' : 'text-emerging'}`}>{step.n}</span>
              <span className="text-sm text-ink/55">{step.chapter}</span>
            </div>
            <h3 className="mt-3 text-xl font-medium leading-tight text-foreground">{step.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{step.caption}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
