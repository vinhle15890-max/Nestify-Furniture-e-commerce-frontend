import { Reveal } from '../Reveal'

/** Shared editorial section heading: small-caps eyebrow + serif title + optional intro. */
export function SectionHeading({ eyebrow, title, intro, align = 'left', className = '' }) {
  const alignment = align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'

  return (
    <Reveal className={`min-w-0 ${alignment} ${className}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-4 font-display text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.08] text-foreground [overflow-wrap:anywhere] [text-wrap:balance]">{title}</h2>
      {intro && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{intro}</p>}
    </Reveal>
  )
}
