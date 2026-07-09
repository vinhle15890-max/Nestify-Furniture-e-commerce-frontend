import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '../Reveal'
import { brandStory } from '../../data/home'

export function BrandStory() {
  return (
    <section className="bg-surface-alt">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 md:py-32 lg:grid-cols-2 lg:gap-20 lg:px-10">
        <Reveal className="overflow-hidden rounded-card">
          <img
            src={brandStory.image}
            alt="Xưởng chế tác Nestify"
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </Reveal>

        <Reveal>
          <p className="eyebrow">{brandStory.eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-tight text-foreground">
            {brandStory.title}
          </h2>
          <div className="mt-6 space-y-4">
            {brandStory.paragraphs.map((paragraph) => (
              <p key={paragraph} className="max-w-md text-lg leading-relaxed text-foreground/80">
                {paragraph}
              </p>
            ))}
          </div>
          <Link
            to={brandStory.cta.to}
            className="group mt-8 inline-flex items-center gap-2 rounded-control text-sm font-medium tracking-wide text-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt"
          >
            {brandStory.cta.label}
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
