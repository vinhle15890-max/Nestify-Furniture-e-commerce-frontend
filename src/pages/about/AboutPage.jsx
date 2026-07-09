import { BrandStory } from '../../components/home/BrandStory'
import { MaterialStory } from '../../components/home/MaterialStory'

/**
 * About — Brand Layer (Story Bible: "Brand Layer — About, Contact. Không thuộc
 * Transformation"). Hosts the brand + material storytelling relocated out of the
 * Home Threshold, where it belonged to no narrative chapter. These sections
 * express Personality/Voice directly, not a chapter's emotional arc.
 */
export function AboutPage() {
  return (
    <>
      <BrandStory />
      <MaterialStory />
    </>
  )
}
