import { Hero } from '../../components/home/Hero'
import { FeaturedCategories } from '../../components/home/FeaturedCategories'
import { BecomingStates } from '../../components/home/BecomingStates'
import { FeaturedProducts } from '../../components/home/BestSellers'
import { PlannerInvite } from '../../components/home/PlannerInvite'
import { CuratedCollections } from '../../components/home/CuratedCollections'
import { BestSellingProducts } from '../../components/home/BestSellingProducts'
import { ReviewEvidence } from '../../components/home/ReviewEvidence'
import { JourneyContinuation } from '../../components/personalization/JourneyContinuation'
import { SeoHead } from '../../components/SeoHead'
import { createHomeJsonLd, HOME_SEO } from './homeSeo'

/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */

/**
 * Home — commerce-first, story-supported. The Threshold opens the visit without
 * pressure, then the page moves quickly into catalog discovery. The Becoming
 * arc follows as evidence for why buying through Nestify feels clearer:
 *
 *   Hero (Threshold, pre-arc — empty room)
 *   → FeaturedCategories (Chapter 1 — Possibility)
 *   → JourneyContinuation (customer-only echo — unfinished work first)
 *   → FeaturedProducts   (Chapter 2 — Discover, staff-curated without social-proof claims)
 *   → BestSellingProducts (Chapter 2 evidence — delivered-order ranking, no urgency)
 *   → ReviewEvidence      (verified-purchase evidence, not marketing testimonials)
 *   → BecomingStates     (Chapter 3→4 — clarity proof after products)
 *   → PlannerInvite      (Chapter 4 pointer — closes the arc: Home → Planner)
 *
 * Section-background rhythm: FeaturedProducts introduces an `emerging` discovery
 * band; PlannerInvite earns a restrained `imagined` band at Future Home.
 *
 * Relocated out of Home: MaterialStory + BrandStory → About (Brand Layer);
 * Newsletter → site footer. Deliberately NOT on Home: Testimonials (Ch2 is
 * reframed away from social proof; Threshold forbids it).
 */
export function HomePage() {
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin

  // Whole Home reads as one `canvas` surface (Not Yet Seen). The global body bg
  // is still the legacy cream — scoped here so we don't touch other pages.
  return (
    <div className="bg-canvas text-ink">
      <SeoHead
        title={HOME_SEO.title}
        description={HOME_SEO.description}
        canonicalPath="/"
        jsonLd={createHomeJsonLd(siteUrl)}
      />
      <Hero />
      <FeaturedCategories />
      <JourneyContinuation />
      <FeaturedProducts />
      <BestSellingProducts />
      <ReviewEvidence />
      <CuratedCollections />
      <BecomingStates />
      <PlannerInvite />
    </div>
  )
}
