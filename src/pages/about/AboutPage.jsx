import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '../../components/Reveal'
import { BecomingRoomArt } from '../../components/BecomingRoomArt'
import { BrandStory } from '../../components/home/BrandStory'
import { MaterialStory } from '../../components/home/MaterialStory'
import { PlannerInvite } from '../../components/home/PlannerInvite'

/**
 * About — Brand Layer (Story Bible: "Brand Layer — About, Contact. Không thuộc
 * Transformation"). It expresses Personality/Voice directly rather than a
 * chapter's arc, so — unlike the Home Threshold — it is free to show the warm
 * Future-Home end state of the signature room (BecomingRoomArt level 3).
 *
 * Composition: an ethos hero (why Nestify exists) → the craft (BrandStory) →
 * the materials (MaterialStory) → a closing invitation to step into your own
 * space (PlannerInvite). The recurring room ties About into the same world as
 * Home and the storefront.
 */
export function AboutPage() {
  return (
    <div className="bg-canvas text-ink">
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-20 md:pt-28 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10">
        <Reveal className="max-w-xl">
          <p className="eyebrow">Về Nestify</p>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-ink">
            Chúng tôi bắt đầu từ một căn phòng trống.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
            Nestify không bán cho bạn đồ nội thất trước. Chúng tôi cho bạn thấy trước ngôi
            nhà mình sẽ trở thành — để mỗi lựa chọn đều là một quyết định chắc chắn, không
            còn là canh bạc.
          </p>
          <Link
            to="/c/all"
            className="group mt-8 inline-flex items-center gap-2 rounded-control border border-ink/25 px-6 py-3 text-sm font-medium tracking-wide text-ink transition-colors duration-200 ease-out hover:border-ink hover:bg-ink hover:text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Khám phá bộ sưu tập
            <ArrowRight size={16} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <Reveal delay={120} className="pointer-events-none mx-auto w-full max-w-[520px]">
          <BecomingRoomArt level={3} />
        </Reveal>
      </section>

      <BrandStory />
      <MaterialStory />
      <PlannerInvite />
    </div>
  )
}
