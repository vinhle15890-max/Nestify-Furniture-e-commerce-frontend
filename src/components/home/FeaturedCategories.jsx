import { Link } from 'react-router-dom'
import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { categories } from '../../data/home'

export function FeaturedCategories() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
      <SectionHeading eyebrow="Danh mục" title="Khám phá theo không gian" />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => (
          <Reveal
            key={category.name}
            as={Link}
            to={category.to}
            delay={index * 80}
            className="group relative block overflow-hidden rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="aspect-[3/4] w-full overflow-hidden bg-surface-alt">
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-[0.7rem] uppercase tracking-[0.2em] text-white/75">{category.caption}</p>
              <h3 className="mt-1 font-display text-2xl">{category.name}</h3>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
