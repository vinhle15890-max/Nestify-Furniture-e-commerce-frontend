# Product Detail — Exploratory Commitment Frame Brief

**Status:** Pre-implementation; composition direction selection pending. This
brief defines the canonical frame claim that all three proposed directions must
preserve.

## 1. Surface metadata

- **Surface / route / component:** Product Detail — `/p/:productSlug`
- **Primary surface type:** Micro-transition
- **Associated state or transition, if any:** Discover / Not Yet Seen →
  Exploratory Commitment / Being Explored → transition toward Experiment
- **User intent:** Understand the selected object well enough to judge whether
  it may belong in their space, then either inspect it in the real Planner or
  retain a direct purchase route without pressure.
- **Canonical sources consulted:** `01_Brand_Constitution.md` →
  `02_Story_Bible.md` → `03_Design_DNA.md` → `04_Visual_Grammar.md` →
  `05_Component_Bible.md`
- **Decision Register checked:** D-001. The old Organic Editorial direction and
  legacy reusable-room visual logic are not storefront authorities. Its Hero
  decision does not make Product Detail a Threshold.

## 2. Narrative and frame hierarchy

- **Narrative role / permitted disclosure:** Product Detail owns “I want to
  know it.” It may reveal truthful product identity, material, finish,
  construction, selected variant, dimensions, availability, contextual
  inspiration, reviews, and a direct handoff into Experiment. It may not claim
  fit before evidence, composite a product into a fake room, materialize it,
  or teach Planner mechanics.
- **First attention target:** **Product truth field** — faithful product media
  joined to the product name and currently selected configuration. Media and
  identification are one field, not an unidentified lifestyle image.
- **Second attention target:** **Fit evidence field** — verified dimensions,
  footprint/clearance, material/finish, selected-image fidelity, and other
  product-specific facts needed to judge suitability. Missing verification is
  disclosed as missing; it is never invented.
- **Optional third attention target:** **Direct Experiment handoff** — “Xem
  trong không gian của bạn,” carrying the selected product/variant into the
  real Room Planner. It does not open a simulated preview.
- **What wins in three seconds, and through which two signals?** Product truth
  wins through the largest factual image/silhouette mass and the strongest
  product-specific identification/contrast. It does not depend on price or a
  filled CTA to become primary.
- **What supports it without becoming a second protagonist?** The fit evidence
  field is denser and narrower, with precise hierarchy and lower image mass. It
  supports the media by answering scale, material, and configuration questions.
- **What remains recognizable after copy and logo are removed?** A truthful
  product silhouette is visibly paired with a disciplined measured-evidence
  structure and one calm transition boundary. The composition does not rely on
  a generic room, marketing banner, or commerce-card stack.

## 3. Composition and mass

- **Dominant visual mass:** Product-specific factual media plus identified
  selected configuration. Contextual imagery may not silently replace product
  truth.
- **Counterweight:** A compact evidence structure for dimensions, material,
  finish, fit, variant fidelity, and availability. Price is readable but does
  not become the counterweight.
- **Visual center of gravity:** Intentionally offset toward product truth and
  stabilized by the evidence field. The selected direction must keep media and
  evidence visibly unequal.
- **Named quiet zone and its job:** **Evidence pause** — low-density space
  between the facts needed to judge suitability and the transition/purchase
  actions. It lets the user inspect what they know before being asked to act.
- **Containment / cropping / safe visual margins:** Product crops preserve
  silhouette, finish, and orientation; thumbnails and controls remain inside
  safe margins. Containers are used only for shared evidence or interaction
  roles. No large rounded marketing card encloses the Planner transition.
- **Deliberate asymmetry:** Use unequal media/evidence proportions plus one
  offset alignment, crop, or evidence axis. The exact mechanism belongs to the
  selected direction, but a balanced two-column commerce split is prohibited.
- **Why this is not a default 50:50 split:** Identity, selected configuration,
  and fit evidence must attach to product media as one factual field. Price and
  Add to Cart occur after the evidence pause, not as an equal conversion column
  opposite a gallery.

## 4. Spatial and image strategy

- **Density level:** Medium, earned by configuration and comparison evidence.
  Reduce badges, repeated CTA rows, and decorative containers before removing
  facts.
- **Illustration role / photography role:** Photography owns silhouette,
  material, finish, construction, selected-variant truth, and explicitly
  labelled contextual inspiration. Product Detail has no default narrative
  room illustration. Any spatial cue must be product-specific, subordinate,
  truthful about what it proves, and must not duplicate the real Planner.
- **Line strategy:** Apply Visual Grammar §5. UI edges group real evidence or
  interaction states only. A truthful dimension/footprint figure may use a
  context-specific measurement stroke hierarchy; unrelated cards, thumbnails,
  and diagrams may not inherit one universal border.
- **Depth strategy:** Apply §6. The default frame is not a narrative spatial
  scene: photography supplies factual depth and a verified measurement figure
  stays deliberately flat. Do not manufacture depth with floating cards,
  blurred oval shadows, or a generic room composite.
- **Light role:** Apply §7 and §9. Preserve factual product color, texture, and
  silhouette across the media set. No overlay, glow, gradient, or separate Hero
  light gesture is introduced. Context images must declare inspiration rather
  than proof of fit.
- **Negative-space purpose:** The evidence pause separates understanding from
  action; smaller gaps separate variant, measure, and purchase roles. No wide
  blank rail exists merely because a conventional column is taller than its
  contents.

## 5. Responsive and anti-AI intent

| Width context | First target | What recedes or changes | Evidence to capture |
|---|---|---|---|
| Wide | Identified product truth field | Evidence counterweight remains narrower; purchase follows the evidence pause | normal, grayscale, silhouette, no-copy |
| Desktop | Identified product truth field | Media crop tightens; fit evidence remains visible before price/action dominance | normal, grayscale, silhouette |
| Intermediate | Product identity stays attached to media | Reduce media height and thumbnail density; move fit evidence immediately after media rather than mechanically stacking a commerce rail | normal, decision sequence |
| Narrow | Product name + selected configuration and product media form the opening factual sequence | Use a shorter truth-preserving crop, reduce thumbnails, then show verified fit evidence before price, Planner handoff, and direct purchase | normal, grayscale, silhouette, no-copy |

- **Forbidden visual pattern for this surface:** A default gallery-left →
  title/price/Add-to-Cart-right split, especially when followed by a generic
  room banner or pre-Planner simulation.
- **AI smells considered and exceptions, if any:** Visual Grammar §12 applies.
  No exception is planned for 50:50 split, floating cards, repeated rounded
  rectangles, literal room repetition, oversized-serif-plus-minimal-SVG,
  generic glow, or fake technical diagrams. A measured figure is allowed only
  when it communicates verified dimensions in a truthful measurement context.
- **Required accessibility / Failure Behavior / boundary treatment:** Media
  roles and selected variant are announced; dimension/material absence is
  explicit; unavailable combinations remain disabled with reason; keyboard
  focus follows the evidence/action order. Planner handoff preserves product
  and variant context. On an unsupported or narrow Planner environment, the
  real Capability Boundary preserves that intent and provides re-entry. Staff
  remain unable to purchase. Direct purchase remains available at secondary
  emphasis and never depends on hover.

## 6. Product Detail decision questions

- **What should the user notice before price?** The exact object and selected
  configuration, then the verified material, dimensions, footprint, and image
  fidelity that determine whether it can plausibly belong in their space.
- **What information reduces uncertainty before purchase?** Product silhouette,
  material/finish, selected-variant fidelity, width/depth/height, required
  clearance or supporting relationship where relevant, availability, factual
  construction information, and reviews after those facts. If any is unknown,
  the unknown itself must be visible.
- **What makes this Product Detail belong to Nestify rather than a generic
  furniture store?** It composes product media and measured suitability as one
  decision field, delays transactional emphasis until after an evidence pause,
  and carries the exact selected context into a real reversible experiment.
- **What is the visual bridge from Discover into Experiment?** One calm,
  context-preserving Planner handoff positioned after factual fit evidence. It
  is a boundary into the real experience, not a room illustration or miniature
  simulation.
- **How should direct purchase remain available without becoming the dominant
  narrative?** Show price and Add to Cart in a compact secondary action group
  after evidence. Use neutral semantic styling, no `imagined`/`confirmed`, no
  scarcity framing, no repeated purchase prompt, and no competition with the
  Experiment handoff.

## 7. Review handoff

- **Expected review evidence:** Normal color at 1440/1024/768/390; wide and
  narrow grayscale/silhouette/no-copy; selected-variant change; direct Planner
  handoff; missing-dimension/material state; staff and guest purchase states;
  real Planner capability boundary where the handoff reaches an unsupported
  environment.
- **Open assumption or escalation needed before implementation:** The audited
  representative product currently has no verified dimensions or material
  fields in its API payload. Implementation may expose an honest unavailable
  state, but may not fabricate fit evidence. The selected composition direction
  must be approved before production code changes.
