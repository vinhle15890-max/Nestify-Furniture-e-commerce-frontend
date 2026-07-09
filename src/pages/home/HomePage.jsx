import { Hero } from '../../components/home/Hero'
import { FeaturedCategories } from '../../components/home/FeaturedCategories'
import { PersonalizedSection } from '../../components/personalization/PersonalizedSection'
import { CuratedCollections } from '../../components/home/CuratedCollections'
import { BestSellers } from '../../components/home/BestSellers'

/**
 * Home — narrative order per Story Bible (post Hero-as-Threshold remap):
 *   Hero (Threshold, pre-arc)
 *   → FeaturedCategories (Chapter 1 — Possibility)
 *   → PersonalizedSection (conditional echo of Discover, logged-in only)
 *   → CuratedCollections (Chapter 2 — Discover)
 *   → BestSellers (Chapter 2 — Discover, reframed away from social proof)
 *
 * Relocated out of Home: MaterialStory + BrandStory → About (Brand Layer);
 * Newsletter → site footer. Not rendered here (kept in codebase): Lookbook,
 * Testimonials.
 */
export function HomePage() {
  // Whole Home reads as one `canvas` surface (Not Yet Seen). The global body bg
  // is still the legacy cream — scoped here so we don't touch other pages.
  return (
    <div className="bg-canvas text-ink">
      <Hero />
      <FeaturedCategories />
      <PersonalizedSection />
      <CuratedCollections />
      <BestSellers />
    </div>
  )
}
