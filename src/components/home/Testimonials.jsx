import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { testimonials } from '../../data/home'

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
      <SectionHeading eyebrow="Khách hàng" title="Được tin yêu bởi những tổ ấm" align="center" />

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <Reveal
            key={testimonial.author}
            delay={index * 80}
            className="flex flex-col rounded-card border border-border bg-surface p-8 shadow-soft"
          >
            <span aria-hidden="true" className="font-display text-5xl leading-none text-accent">
              &ldquo;
            </span>
            <p className="mt-4 flex-1 text-lg leading-relaxed text-foreground">{testimonial.quote}</p>
            <div className="mt-6">
              <p className="font-medium text-foreground">{testimonial.author}</p>
              <p className="text-sm text-muted-foreground">{testimonial.role}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
