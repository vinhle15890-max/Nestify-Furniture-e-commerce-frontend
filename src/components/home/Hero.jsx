import { Link } from 'react-router-dom'
import { hero } from '../../data/home'

export function Hero() {
  return (
    <section className="relative min-h-dvh w-full overflow-hidden">
      <img
        src={hero.image}
        alt=""
        aria-hidden="true"
        className="animate-slow-zoom absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/35" />

      <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col justify-end px-6 pb-20 pt-36 lg:px-10 lg:pb-28">
        <div className="max-w-2xl text-white">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/75">{hero.eyebrow}</p>
          <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,5.5rem)] font-normal leading-[1.02] tracking-[-0.02em]">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">{hero.subtitle}</p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to={hero.primaryCta.to}
              className="inline-flex items-center justify-center rounded-control bg-surface px-8 py-4 text-sm font-medium tracking-wide text-foreground transition-colors duration-300 ease-out hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {hero.primaryCta.label}
            </Link>
            <a
              href={hero.secondaryCta.to}
              className="inline-flex items-center justify-center rounded-control border border-white/55 px-8 py-4 text-sm font-medium tracking-wide text-white transition-colors duration-300 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
