import { ArrowRight } from 'lucide-react'
import { hero } from '../../data/home'
import { ButtonLink } from '../Button'

function HeroInterior() {
  return (
    <picture
      data-testid="hero-interior"
      aria-hidden="true"
      className="absolute inset-y-0 right-0 z-10 block w-full lg:bottom-0 lg:top-20 lg:w-[58%] lg:[clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)] xl:w-[56%]"
    >
      <source
        media="(max-width: 767px)"
        srcSet="/images/home/hero-interior-mobile.avif"
        type="image/avif"
      />
      <source
        media="(max-width: 767px)"
        srcSet="/images/home/hero-interior-mobile.webp"
        type="image/webp"
      />
      <source srcSet="/images/home/hero-interior.avif" type="image/avif" />
      <source srcSet="/images/home/hero-interior.webp" type="image/webp" />
      <img
        src="/images/home/hero-interior.png"
        alt=""
        width="1536"
        height="1024"
        decoding="async"
        {...{ fetchpriority: 'high' }}
        className="h-full w-full object-cover object-[70%_center] md:object-[66%_center] lg:object-center"
      />
    </picture>
  )
}

export function Hero() {
  return (
    <section data-home-section="hero" className="relative w-full overflow-hidden bg-canvas text-ink">
      <div className="relative mx-auto max-w-[1440px] overflow-hidden px-6 pb-16 pt-32 sm:px-10 sm:pb-20 lg:min-h-[86dvh] lg:px-14 lg:pb-24 lg:pt-0">
        {/* Proposition first. It is anchored to the near wall, not a column. */}
        <div className="relative z-20 max-w-[34rem] lg:ml-[clamp(0rem,2vw,2rem)] lg:pt-[clamp(10rem,22vh,13rem)]">
          <h1 className="min-w-0 [overflow-wrap:anywhere] font-display text-[clamp(3rem,4.8vw,4.75rem)] font-normal leading-[1.02] tracking-[-0.035em]">
            {hero.title}
          </h1>
          <p className="mt-7 max-w-[30rem] text-[clamp(1rem,1.25vw,1.16rem)] leading-[1.75] text-ink/70 xl:max-w-[34rem]">
            {hero.subtitle}
          </p>
        </div>

        {/* Relative below lg; the approved interior becomes the only spatial field. */}
        <div className="pointer-events-none relative z-10 -mx-6 mt-8 h-[19rem] overflow-hidden sm:-mx-10 sm:mt-8 sm:h-[23rem] md:h-[25rem] lg:absolute lg:inset-0 lg:m-0 lg:h-auto">
          <HeroInterior />
        </div>

        <div className="relative z-20 mt-8 lg:ml-[clamp(0rem,2vw,2rem)] lg:mt-10">
          <ButtonLink
            to={hero.cta.to}
            className="px-7"
          >
            {hero.cta.label}
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
