import { Hero } from '../../components/home/Hero'
import { FeaturedCategories } from '../../components/home/FeaturedCategories'
import { CuratedCollections } from '../../components/home/CuratedCollections'
import { BestSellers } from '../../components/home/BestSellers'
import { MaterialStory } from '../../components/home/MaterialStory'
import { Lookbook } from '../../components/home/Lookbook'
import { BrandStory } from '../../components/home/BrandStory'
import { Testimonials } from '../../components/home/Testimonials'
import { Newsletter } from '../../components/home/Newsletter'

export function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedCategories />
      <CuratedCollections />
      <BestSellers />
      <MaterialStory />
      <Lookbook />
      <BrandStory />
      <Testimonials />
      <Newsletter />
    </>
  )
}
