import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { lookbook } from '../../data/home'

export function Lookbook() {
  return (
    <section id="lookbook" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 md:py-32 lg:px-10">
      <SectionHeading
        eyebrow="Lookbook"
        title="Nguồn cảm hứng không gian sống"
        intro="Những khung hình biên tập gợi mở cách Nestify hòa vào tổ ấm của bạn."
      />

      <div className="mt-14 grid auto-rows-[220px] grid-cols-1 gap-5 sm:auto-rows-[280px] sm:grid-cols-2 lg:grid-cols-12">
        {lookbook.map((shot, index) => (
          <Reveal
            key={shot.image}
            delay={(index % 3) * 80}
            className={`group overflow-hidden rounded-card ${shot.span ?? ''}`}
          >
            <img
              src={shot.image}
              alt={shot.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-105"
            />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
