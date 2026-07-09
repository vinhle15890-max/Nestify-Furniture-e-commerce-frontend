import { Reveal } from '../Reveal'
import { brandPromise } from '../../data/home'

/**
 * BrandPromise — a quiet manifesto interlude (Chapter 5 — Ownership echo) that
 * gives the long homepage a premium "breath" and restates what Nestify actually
 * sells: seeing your home first (clarity), which disarms the fear of an
 * irreversible decision (the Enemy). No product, no CTA — just the promise, set
 * large with generous whitespace. Sits on a gentle `unbuilt` band for rhythm.
 */
export function BrandPromise() {
  return (
    <section className="border-y border-border bg-unbuilt/15">
      <div className="mx-auto max-w-4xl px-6 py-28 md:py-36 lg:px-10">
        <Reveal>
          <p className="eyebrow">{brandPromise.eyebrow}</p>
          <p className="mt-8 font-display text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.1] text-foreground [text-wrap:balance]">
            {brandPromise.lead}
          </p>
          <p className="mt-5 max-w-3xl font-display text-[clamp(1.35rem,2.6vw,2rem)] leading-[1.22] text-muted-foreground [text-wrap:balance]">
            {brandPromise.body}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
