import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { materials } from '../../data/home'

export function MaterialStory() {
  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
        <SectionHeading
          eyebrow="Chất liệu"
          title="Vẻ đẹp của vật liệu tự nhiên"
          intro="Chúng tôi chọn lọc từng chất liệu vì độ bền, kết cấu và cảm giác chạm thật."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {materials.map((material, index) => (
            <Reveal key={material.name} delay={index * 80} className="group">
              <div className="overflow-hidden rounded-card">
                <img
                  src={material.image}
                  alt={material.name}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
                />
              </div>
              <h3 className="mt-5 font-display text-xl text-foreground">{material.name}</h3>
              <p className="mt-1 text-sm text-foreground/80">{material.caption}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
