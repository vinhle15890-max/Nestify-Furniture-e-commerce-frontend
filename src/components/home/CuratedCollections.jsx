import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { collections } from '../../data/home'

export function CuratedCollections() {
  return (
    <section className="border-y border-border bg-unbuilt/15">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
        <SectionHeading
          eyebrow="Bộ sưu tập tuyển chọn"
          title="Những câu chuyện thiết kế"
          intro="Mỗi bộ sưu tập là một triết lý sống — được tuyển chọn tỉ mỉ cho không gian của bạn."
        />

        <div className="mt-16 flex flex-col gap-20 md:gap-28">
          {collections.map((collection, index) => (
            <Reveal
              key={collection.name}
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${
                index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <div className="overflow-hidden rounded-card">
                <img
                  src={collection.image}
                  alt={collection.name}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="lg:px-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{collection.tagline}</p>
                <h3 className="mt-3 font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight text-foreground">
                  {collection.name}
                </h3>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">{collection.body}</p>
                <Link
                  to={collection.to}
                  className="group mt-7 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-ink transition-colors duration-200 hover:text-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-control"
                >
                  Khám phá bộ sưu tập
                  <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
