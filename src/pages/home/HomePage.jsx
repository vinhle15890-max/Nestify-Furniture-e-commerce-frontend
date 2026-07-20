import { Hero } from '../../components/home/Hero'
import { FeaturedCategories } from '../../components/home/FeaturedCategories'
import { BecomingStates } from '../../components/home/BecomingStates'
import { BestSellers } from '../../components/home/BestSellers'
import { PlannerInvite } from '../../components/home/PlannerInvite'

/**
 * Home — a compressed walk through the whole "Becoming" arc (Story Bible). The
 * same signature room becomes more complete as you scroll, from an empty
 * outline (Hero) to a warm future home (BecomingStates / PlannerInvite):
 *
 *   Hero (Threshold, pre-arc — empty room)
 *   → FeaturedCategories (Chapter 1 — Possibility)
 *   → BecomingStates     (Chapter 3→4 — the climax: empty → +1 piece → Future Home)
 *   → CuratedCollections (Chapter 2 — Discover)
 *   → PersonalizedSection (conditional echo of Discover, logged-in only)
 *   → BestSellers        (Chapter 2 — Discover, reframed away from social proof)
 *   → BrandPromise       (Chapter 5 — Ownership echo: the manifesto breath)
 *   → Lookbook           (Chapter 2 — Discover, editorial inspiration)
 *   → PlannerInvite      (Chapter 4 pointer — closes the arc: Home → Planner)
 *
 * Section-background rhythm: CuratedCollections / BrandPromise / PlannerInvite
 * sit on a gentle `unbuilt` band; the rest read as one `canvas` surface.
 *
 * Relocated out of Home: MaterialStory + BrandStory → About (Brand Layer);
 * Newsletter → site footer. Deliberately NOT on Home: Testimonials (Ch2 is
 * reframed away from social proof; Threshold forbids it).
 */
export function HomePage() {
  // Whole Home reads as one `canvas` surface (Not Yet Seen). The global body bg
  // is still the legacy cream — scoped here so we don't touch other pages.
  return (
    <div className="bg-canvas text-ink">
      <Hero />
      <FeaturedCategories />
      <BecomingStates />
      <BestSellers />
      <PlannerInvite />
    </div>
  )
}
