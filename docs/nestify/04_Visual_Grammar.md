# Nestify — Visual Art Direction / Visual Grammar v0.1

**Canonical execution layer**  
**Depends on:** 01_Brand_Constitution.md → 02_Story_Bible.md →
03_Design_DNA.md  
**Feeds:** 05_Component_Bible.md → token implementation layer → Prompt +
Review System  
**Decision authority:** 07_Decision_Register.md, D-001

---

## 0. Authority, scope, and operating terms

Nestify sells a clearer view of a future decision, not visual decoration,
craft mythology, or interface novelty. The Constitution owns why that matters;
the Story Bible owns when a user may encounter each emotional state; Design DNA
owns semantic identity. This document owns how a rendered interface visibly
creates that clarity.

This is not a component catalogue and does not prescribe a Hero, Product
Detail, Cart, or Planner implementation. It establishes the visual constraints
that every such surface must satisfy.

### Precedence

1. Constitution decides meaning and voice.
2. Story Bible decides narrative state, disclosure, and page role.
3. Design DNA decides semantic color, type, and motif meaning.
4. This document decides visual execution.
5. Component Bible decides state-specific behavior.
6. Tokens encode approved values for implementation.
7. A page spec may narrow a surface, never weaken an upstream rule.

### Operating terms

- **Frame:** one viewport-sized composition at a specific responsive width.
- **Visual mass:** perceived weight created by occupied area, contrast, edge
  strength, density, position, and movement. It is not merely pixel area.
- **Primary / secondary / tertiary:** the first, second, and third things a
  person should notice in a three-second glance.
- **Narrative spatial scene:** an editorial illustration that evokes an
  emotional state. It is not a measurement interface.
- **Operational spatial model:** the real Room Planner scene, where scale,
  dimensions, grids, and controls are truthful tools.
- **Quiet zone:** intentional low-density space with a named perceptual job:
  question, separation, recovery, action runway, or evidence framing.
- **Frame brief:** a written declaration of attention order, dominant mass,
  counterweight, quiet zone, depth strategy, and state before visual work
  begins.

An agent must not invent a visual rule because it is fashionable. When a
surface cannot satisfy this grammar without contradicting the Story Bible, the
surface must be escalated rather than improvised.

---

## 1. Composition Grammar

### Intent

Arrange a frame as a deliberate decision moment rather than a stack of
independent modules.

### Perceptual effect

The user can tell where to look, what is being held open, and what is safely
secondary before reading every word.

### Required rules

1. Every frame declares one primary focal field. It may contain a headline,
   product, scene, or active spatial model, but not several unrelated
   protagonists.
2. A frame may have one secondary support field and at most two tertiary
   details. Repeated items in a comparison grid count as one field, not many
   primaries.
3. The primary field must win through at least two of these signals: area,
   contrast, position, edge strength, density, or motion. Secondary support may
   win through one signal only.
4. Text and visual may share a frame, but they must participate in one
   composition. A default half-and-half split is not a composition.
5. Every quiet zone receives one named job. Unnamed blank space is a failure,
   not “generous whitespace.”
6. The dominant mass and counterweight must be visibly unequal unless the
   surface is a truthful comparison or an operational tool.

### Allowed techniques

- Offset a visual field from the text axis.
- Use cropped architecture, overlap, scale contrast, or a value field to pull
  attention toward the primary.
- Let a headline occupy a large, calm mass while a smaller spatial cue answers
  it indirectly.
- Let a product field dominate a Discover or Exploratory Commitment surface
  while the configuration rail counterbalances it.
- Use an intentionally asymmetric frame, provided its visual center of gravity
  remains stable.

### Forbidden patterns

- Centering all objects merely because the container is centered.
- Making text, illustration, CTA, and decorative mark equally prominent.
- Treating a 50:50 two-column layout as the default answer.
- Adding a floating card solely to create a second focal field.
- Leaving a large empty area without a narrative or perceptual job.

### Review questions

- Can a reviewer name the primary focal field in one sentence?
- Does the primary win in a blurred grayscale thumbnail?
- What is the counterweight, and why is it lighter than the primary?
- What named job does each major quiet zone perform?
- If text is hidden, does the composition still have a clear dominant mass?

### Approved specimen description

A Threshold frame places an open question as the dominant mass, with an
off-axis spatial study acting as a quieter counterweight. The gap between them
is a question zone: it keeps the answer unresolved rather than filling space
with a card or ornament.

### Rejected specimen description

A centered headline sits beside a same-width centered room box; both have equal
contrast, equal area, and equal vertical alignment. A button and eyebrow create
two more equal focal points. The result is a generic marketing split even if
all colors are correct.

---

## 2. Attention Hierarchy

### Intent

Make Nestify calm without becoming visually flat. Calm means controlled
attention, not equal attention.

### Perceptual effect

The eye follows a deliberate sequence: first clarity, then evidence, then a
safe next action or supporting detail.

### Required rules

1. Every frame brief states first, second, and third attention targets in that
   order. “Everything is important” is invalid.
2. Primary attention must be legible before body copy. Secondary attention must
   remain discoverable without competing at the same moment.
3. Tertiary information uses lower contrast, lower density, smaller scale, or
   receding position. It must not use all four primary signals.
4. CTA prominence follows narrative state. A CTA may be third attention in
   Threshold and Discover; it may not overpower the evidence needed to decide.
5. A visual hierarchy must survive without color alone. It must work in
   grayscale and at a silhouette level.
6. Internal illustration hierarchy is separate from frame hierarchy. For
   example, a Threshold frame may first communicate the open question, while
   its spatial study internally reads light → room → habitation cue.

### Allowed techniques

- Scale contrast between primary and secondary.
- Stronger edge or value only at the point where a decision becomes clearer.
- Lower-density, lower-contrast supporting copy.
- Directional light and overlap that point toward a primary object.
- Controlled interruption: one quiet visual pause before a decisive action.

### Forbidden patterns

- A CTA, product badge, image, and heading all using high contrast.
- Relying only on a giant serif heading to create hierarchy.
- Using an accent color repeatedly to manufacture importance.
- Giving every card the same title size, image prominence, border, and hover
  response when the page is not a neutral comparison task.

### Review questions

- What does a user notice at three seconds, five seconds, and after reading?
- Which visual signal makes the primary win?
- Could the frame still be understood if color were removed?
- Is a CTA asking for action before the evidence that justifies it is visible?

### Approved specimen description

On Product Detail, product media first communicates material truth; the
selected configuration becomes second; “see in your space” is the third,
calmly available action. The page does not try to make price, rating, stock,
wishlist, and Planner CTA all equally loud.

### Rejected specimen description

A product image, sale badge, five stars, bold price, filled CTA, floating
review card, and collection tag all use maximal contrast. It is a conversion
dashboard rather than a space for understanding a product.

---

## 3. Spatial Composition

### Intent

Let elements inhabit a frame like a considered room: held by boundaries,
directed by relationships, and allowed to imply more than is shown.

### Perceptual effect

The frame feels intentionally staged rather than mechanically centered,
cropped, or padded.

### Required rules

1. Every narrative spatial frame defines a visual center of gravity. It may be
   offset, but it must be held by a counterweight, crop, or quiet zone.
2. Use containment when a scene needs contemplation; use intentional cropping
   when the scene needs possibility or continuation. Do not show a complete
   room box by default.
3. Keep functional controls and readable text inside safe interaction margins.
   Illustrative edges may crop only when no meaningful object, control, or
   semantic cue is lost.
4. A room outline must have a visible relationship to typography: align,
   oppose, overlap indirectly, or create a deliberate gap. It may not simply
   occupy the remaining column.
5. A quiet zone must have a boundary condition. It is framed by proximity,
   alignment, value, or a receding edge so it reads as held space rather than
   missing content.
6. For Threshold, containment preserves tension; for Discover, separation
   supports comparison; for Planner, clear working area supports manipulation.

### Allowed techniques

- Crop one architectural edge beyond the frame.
- Offset the opening, object cluster, or light direction away from the center.
- Use a partial wall, foreground plane, or typographic edge as containment.
- Let an empty floor or wall plane carry the unanswered question.
- Use a shared baseline or axis between copy and an illustration rather than
  matching their bounding boxes.

### Forbidden patterns

- A full symmetric room rectangle centered inside a neutral container.
- Equal padding around an illustration solely because it is an SVG.
- Oversized art that pushes interactive text outside a readable safe zone.
- Decorative overflow with no effect on hierarchy or implied continuation.

### Review questions

- Where is the visual center of gravity?
- Which edge is intentionally cropped, or why is full containment necessary?
- What physically or optically holds the quiet zone?
- Does the illustration have a declared relationship to the type block?
- Is any apparent overflow doing narrative work?

### Approved specimen description

A spatial study shows an off-axis opening, a receding floor plane, and a small
product-specific object near the light edge. One wall is cropped by the frame;
the remaining open plane holds the question. The type block anchors the
opposite side without matching the illustration’s rectangle.

### Rejected specimen description

A complete box room is centered inside a rounded container with equal margins
on all sides. The chair, window, and caption all sit on the center axis. The
only reason it is contained is that an SVG needed a box.

---

## 4. Proportion Grammar

### Intent

Use relationships that scale across products and breakpoints instead of
unrelated hard-coded dimensions.

### Perceptual effect

Large and small elements feel related to the decision being made, not merely
to a CSS utility scale.

### Required rules

1. Size a visual field relative to its frame role: primary, secondary, or
   tertiary. Do not size an illustration because a previous component used the
   same maximum width.
2. A narrative illustration may not outweigh the headline mass unless the page
   brief explicitly declares the visual as protagonist. Threshold does not make
   the illustration the protagonist.
3. Within a spatial study, furniture must read as plausibly scaled against
   walls, openings, and floor planes. It may be abstracted, but not enlarged
   until it becomes an icon.
4. Window, opening, and light-source proportions must support a believable
   architectural plane. They must not be arbitrary centered decoration.
5. Text measure, image crop, panel width, and room extent must be chosen as a
   set. Changing one requires checking the other three.
6. Use ratio ranges or relational tests in implementation tokens. Do not
   canonize a single pixel dimension as a visual law.

### Allowed techniques

- Declare one visual field as materially larger through area or contrast.
- Use a smaller, sharper object against a broader, softer architectural field.
- Let a product image dominate Product Detail while a narrower configuration
  region remains readable.
- Change proportions at narrow widths when needed to preserve attention order.

### Forbidden patterns

- Reusing identical illustration sizes across unrelated page roles.
- Scaling furniture to fill a room merely to make it visible.
- Making every image 4:5, every room 3:2, and every text block the same width
  without a role-based reason.
- Treating desktop proportions as immutable on mobile.

### Review questions

- Which proportions are role-based rather than inherited by habit?
- Does the object still feel plausibly scaled when labels are hidden?
- Does the primary remain stronger after responsive reflow?
- If an image is large, what becomes deliberately quieter to compensate?

### Approved specimen description

A Product Detail product photo is the dominant media mass. Its spatial cue is
smaller and located after the factual configuration, where it can suggest scale
without pretending to be a second hero.

### Rejected specimen description

The same 560-by-380 room drawing appears at the same perceived size in Hero,
Product Detail, Cart, About, empty states, and Planner invitations. It becomes
a logo substitute instead of responding to page role.

---

## 5. Line Grammar

### Intent

Use edges as spatial evidence, not as generic decoration or a technical
wireframe.

### Perceptual effect

The eye can distinguish what is structural, near, receding, implied, and
material without reading every line equally.

### Required rules

1. Define a context-specific base structural stroke **S** for each rendered
   medium. All illustration lines derive from it; no arbitrary universal 1px
   rule is allowed.
2. Construction or implied lines use 0.40–0.55 × S and lower contrast. They
   may be dashed only when they show a real spatial inference, not decoration.
3. Receding architectural edges use 0.65–0.80 × S and lower contrast than
   structural edges.
4. Structural edges use 1.00 × S. Use them only to establish planes, openings,
   or meaningful boundaries.
5. Focal foreground contours use 1.25–1.50 × S or equivalent contrast
   advantage. Only one local contour family may use this role at a time.
6. Furniture detail uses 0.55–0.75 × S. A detail must never compete with the
   object silhouette.
7. A line’s width, contrast, and continuity must agree. A receding edge may
   not be both faint and heavier than the foreground.
8. Borders around UI containers are not automatically structural lines. They
   require a real grouping, state, or interaction reason.

### Allowed techniques

- Fade or break a receding contour.
- Use one stronger foreground edge to anchor a plane.
- Use a short implied line to show alignment, placement, or continuation.
- Omit an edge when adjacent values already separate planes.
- Use a sparse contour around a product-specific silhouette.

### Forbidden patterns

- Uniform 1px outlines for room, object, window, card, and decorative detail.
- Darkly boxing every plane in a room.
- Dashed floor guides that exist only to make an SVG feel technical.
- Hairline dividers repeated between unrelated page sections.
- Thick black outlines around every furniture subpart.

### Review questions

- Can a reviewer identify each line role without the implementation notes?
- Are foreground and receding edges visibly different in grayscale?
- Does removing construction lines make the scene calmer but still legible?
- Is any border present only because a component default supplied it?

### Approved specimen description

A spatial study uses one decisive foreground floor edge, softer receding wall
edges, nearly disappearing construction cues, and a concise object silhouette.
The room remains legible when secondary lines are removed.

### Rejected specimen description

Every wall, window mullion, floor guide, chair arm, card edge, and caption box
uses the same thin gray stroke. The scene reads as a CAD worksheet even though
the palette is warm.

---

## 6. Depth Grammar

### Intent

Create believable spatial clarity without generic gradients, ambient shadows,
or pseudo-3D decoration.

### Perceptual effect

The user senses where a decision sits in space: what is near, what is
supporting, and what remains unresolved.

### Required rules

1. A narrative spatial scene must declare far, middle, and near planes. A plane
   may be mostly empty, but it may not be omitted from the compositional model.
2. It must use at least three depth cues chosen from overlap, scale,
   value separation, edge strength, density, occlusion, and directional light.
3. Near planes carry stronger edge, value, or detail; far planes carry less.
   Do not reverse this hierarchy without an explicit narrative reason.
4. Plane separation must be visible without blur, drop shadow, or gradient.
5. Objects shown as spatial evidence must touch, overlap, or align with a
   believable supporting plane. They must not float.
6. An operational spatial model may use true shadow, grid, dimensional scale,
   and occlusion because they support manipulation. A narrative scene may not
   borrow those signs merely to appear sophisticated.
7. A placeholder in Planner must preserve truthful size and position before
   material richness. It is evidence, not an aesthetic loading skeleton.

### Allowed techniques

- A foreground edge partially occludes a floor or wall.
- A product-specific silhouette overlaps a light plane.
- Slight value steps between wall, floor, and opening.
- Reduced detail and contrast toward the far plane.
- A physical grounding shadow in the real Planner only.

### Forbidden patterns

- A room made only from equally outlined polygons.
- Product cutouts hovering over a background with a decorative oval shadow.
- Blur-based depth, glassmorphism, or generic layered cards used as atmosphere.
- Planner grids or dimension marks in a marketing illustration.

### Review questions

- Can far, middle, and near planes be named?
- Which three depth cues are active?
- Does the object feel supported by the scene?
- Would the scene still have depth if all shadows and gradients were removed?
- Is a technical cue helping a real measurement task or merely decorating?

### Approved specimen description

The far wall is quiet and lightly separated; an opening establishes middle
depth; a cropped floor edge creates a near plane. A product-specific object
overlaps the lit middle plane, with its contour stronger than the distant room.

### Rejected specimen description

Five polygons share identical fill, opacity, and outline. A chair sits in the
middle with no overlap or supporting relationship. The only depth cue is
converging perspective lines.

---

## 7. Light Grammar

### Intent

Treat light as evidence of legibility: it reveals what can now be seen without
turning the interface into a mood board.

### Perceptual effect

One spatial fact becomes clearer, the eye is directed calmly, and the
illustration gains atmosphere without losing truth.

### Required rules

1. A narrative spatial scene has one dominant, architecturally plausible light
   source. Its origin must be visible or inferable from an opening, boundary,
   or true object.
2. A narrative frame has one dominant light gesture. It must reinforce the
   primary or secondary focal relationship; it may not become a second
   decoration.
3. Light must alter at least two planes through value, edge, density, or
   occlusion. A polygon placed on one floor plane alone is not sufficient.
4. Before visualization, light remains neutral evidence. It may establish
   tension, but it may not use imagined-state warmth to imply a completed user
   decision.
5. In a permitted Future Home editorial depiction, imagined warmth may appear
   where the spatial evidence is already coherent. It must remain subordinate
   to the scene’s actual primary focus.
6. In Planner, lighting serves scale, material readability, and manipulation.
   It must not obscure placement, collision, dimensions, or selected-object
   feedback.

### Allowed techniques

- A directional opening that creates a receding value change.
- A single light plane that connects opening, floor, and object.
- Stronger edge contrast where light clarifies the object relationship.
- Neutral daylight for Threshold and Discover.
- Restrained material warmth after truthful visualization or in an explicitly
  editorial Future Home depiction.

### Forbidden patterns

- Radial glows, colored halos, bloom, or ambient neon.
- Multiple decorative light pools in one narrative scene.
- A warm polygon with no source, no plane relationship, and no effect on
  hierarchy.
- Gradient overlays used as atmosphere on product photography.
- Lighting that hides factual product color, scale, or Planner controls.

### Review questions

- Where does the light originate?
- What attention relationship does it strengthen?
- Which two or more planes does it change?
- Is warmth truthfully earned by state, or merely decorative?
- Could a viewer mistake the lighting for a generic glow effect?

### Approved specimen description

A quiet opening casts one neutral directional field across a middle floor
plane. The field becomes slightly warmer only in an editorial Future Home
depiction, where it supports a product-specific arrangement already visible in
space.

### Rejected specimen description

A centered window emits a large beige trapezoid on the floor while walls,
object, and edge hierarchy remain unchanged. The shape is called “light” but
functions only as decoration.

---

## 8. Illustration Art Direction

### Intent

Make a Nestify spatial illustration recognizable as a moment of emerging
spatial clarity rather than a generic CAD room, a furniture icon, or a finished
interior render.

### Perceptual effect

Even without the logo, copy, or token names, a viewer recognizes an authored
spatial study: a real question held inside an incomplete but believable space.

### Required rules

1. A Nestify spatial illustration is an **editorial spatial study**. It shows
   the relationship between a person’s possible object and possible space, not
   a technical room diagram and not a fully styled showroom.
2. Perspective must be optically believable but not mechanically sterile.
   One-point or oblique perspective is allowed. A centered vanishing point is
   allowed only when an off-axis crop, opening, light direction, or object mass
   breaks bilateral symmetry. A centered vanishing point plus symmetric room
   frame is prohibited in narrative work.
3. Architectural geometry must establish planes, not measurement. Narrative
   scenes may not use grids, dimensions, axis labels, snap marks, repeated
   converging guides, or isometric conventions.
4. Use intentional asymmetry in at least one of: crop, opening location, light
   direction, dominant plane, furniture placement, or typographic relationship.
   Do not add random wobbly paths to imitate human imperfection.
5. Plane separation follows the Line, Depth, and Light grammars. Receding
   planes lose edge strength and/or detail; foreground planes earn stronger
   evidence.
6. An object shown as a product cue must be specific to the product family or
   actual selected product. A TV cabinet, bed, lamp, dining table, and chair
   may not share the same generic chair silhouette.
7. Furniture abstraction keeps the few contours that establish category,
   scale, and orientation. It omits decorative micro-detail, labels, texture
   noise, and generic icon shorthand.
8. Density follows state. Threshold permits one static habitation cue and an
   unresolved room. Discover may show one relevant product cue. Future Home may
   show a restrained, coherent cluster. No narrative scene may fill every
   plane simply to look “finished.”
9. Containment and cropping must have a purpose. A contained study creates
   contemplation; a cropped study implies continuation. Do not repeat the same
   fully contained room rectangle across surfaces.
10. Negative space must carry question, scale, separation, or anticipated
    action. It may not be left merely because furniture was omitted.
11. Illustration and product photography have separate truths. Illustration
    communicates spatial relationship and possibility; photography communicates
    factual material, finish, color, and product identity. When both appear,
    one must be primary and they must not duplicate the same visual job.
12. The relationship between light and depth must be readable: light travels
    through or across planes, establishes a spatial direction, and clarifies an
    object’s placement. It must not merely sit behind an object as a glow.

### Allowed techniques

- Partial architectural frames with one intentionally cropped boundary.
- An off-axis opening or light source.
- A product-specific silhouette with three to five decisive contours.
- Soft value planes with sparse, role-based contours.
- A near edge that occludes or frames a middle plane.
- One static habitation cue at Threshold.
- A restrained Future Home cluster that is coherent in scale and light.

### Forbidden patterns

- A symmetric box room with every wall, window, and floor edge drawn evenly.
- A generic armchair reused as a proxy for all products.
- A complete furnished interior rendered before the user has experienced the
  relevant state.
- Technical grids, measurement arrows, perspective guides, or fake CAD labels
  outside the operational Planner.
- Decorative blobs, stickers, random icons, or texture noise added to make a
  scene “less empty.”
- A room illustration repeated unchanged as a brand stamp across a route.

### Review questions

- After removing logo, copy, and token labels, does the scene still read as an
  unresolved but believable spatial decision?
- Which asymmetry prevents mathematical symmetry?
- Which product-specific contours prove the object is not generic clip art?
- Where do edges recede, and where does one foreground contour anchor depth?
- What function does the largest empty plane serve?
- Does photography carry factual truth while illustration carries spatial
  possibility?

### Approved specimen description

A cropped, oblique room study uses one off-axis opening and a receding floor
plane. A compact silhouette unmistakably belongs to the selected product
family. The object rests near a directional light field; a large quiet wall
plane keeps the decision open. No grid, dimension, or full-room box is needed.

### Rejected specimen description

A perfectly centered rectangular room contains a centered window and a generic
outline chair. Every polygon has the same gray stroke, all furniture is
contained in the lower center, and a caption is placed beneath it. The scene
could belong to a CAD tutorial, a generic AI landing page, or any furniture
brand.

---

## 9. Photography Art Direction

### Intent

Use photography as product evidence and editorial context without reverting to
generic luxury-lifestyle imagery or falsely claiming spatial certainty.

### Perceptual effect

The user can separate what is factually true about a product from what is being
imagined about their own space.

### Required rules

1. Product photography is the factual source for material, finish, color,
   construction, and variant identity. It must not be replaced by a stylized
   illustration when those facts matter.
2. A product image must have one declared role: product truth, material detail,
   contextual inspiration, or verified room evidence. It may not silently serve
   all four.
3. Contextual interior photography is inspiration, not proof that a product
   fits the user’s room. It must not borrow Planner confirmation language.
4. If a selected variant differs from the available photo, the UI must reveal
   that uncertainty rather than present an illustrative composite as truth.
5. Crop, value, and lighting must preserve the product’s readable silhouette.
   Editorial atmosphere may not hide scale, finish, or variant difference.
6. Do not source a visual system from unrelated stock interiors. A set of
   editorial images must share a declared light behavior, crop logic, density,
   and relationship to the narrative state.
7. When photography and illustration coexist, photography owns material truth;
   illustration owns spatial relationship. Their visual masses must be
   intentionally unequal.

### Allowed techniques

- Clean product media with enough surrounding context to read silhouette.
- Close material crops after a product is already identified.
- Curated contextual imagery in Discover, labeled as inspiration.
- A truthful scene thumbnail from Planner in Cart or Order flows.
- Neutral-to-warm lighting that preserves actual product color.

### Forbidden patterns

- Generic Unsplash interiors used as evidence of Nestify’s product fit.
- Mismatched image color grading from section to section.
- Gradient overlays that obscure a product to create mood.
- A completed lifestyle room presented as the user’s Future Home before
  visualization.
- A photo and illustration both competing as equal protagonists.

### Review questions

- What factual claim is this photo allowed to make?
- Is the selected product or variant truthfully represented?
- Does the crop preserve silhouette and material evidence?
- Does the image set share a deliberate art direction rather than a trend tag?
- If a room image is shown, is it inspiration, verified evidence, or a user
  scene—and is that distinction visible?

### Approved specimen description

A Product Detail surface leads with faithful product media, follows with a
material crop, then offers a smaller spatial study for scale. A Discover
collection uses contextual photography as labeled inspiration, not as proof of
fit.

### Rejected specimen description

A stock living-room image with soft beige grading, a darkened gradient, and a
large serif headline is used beside an unrelated product. The image is treated
as both mood board and proof of the user’s future room.

---

## 10. Editorial Rhythm

### Intent

Give a page a sequence of visual pressure and release that follows the Story
Bible rather than a repeated content-template cadence.

### Perceptual effect

The page feels guided and calm, with meaningful pauses, instead of a long list
of interchangeable ecommerce sections.

### Required rules

1. Every route declares its sequence of tempos: quiet, exploratory, dense
   comparison, spatial clarity, or confirmation. Tempo derives from narrative
   state, not from a desire to make a page look varied.
2. Adjacent sections must change at least two of these dimensions: density,
   alignment, dominant mass, image role, depth strategy, interaction mode, or
   value field. A color-band change alone does not count.
3. A quiet section must contain a single deliberate statement or evidence
   field. It may not be a large blank band plus oversized display type by
   default.
4. A dense section must earn density through comparison, configuration, or
   operation. It may not become dense through badges, cards, ornaments, or
   repeated CTA rows.
5. A page may use one primary spatial-illustration family. A second appearance
   must reveal a materially different state or purpose; exact asset repetition
   is prohibited.
6. Alternating image/text sections are a technique, not a page rhythm. They
   may appear only when comparison or narrative contrast requires them.
7. A route must reserve one recovery zone before a genuine commitment action.
   The recovery zone removes persuasion rather than adding more reassurance
   cards.

### Allowed techniques

- Move from quiet Threshold to denser discovery field.
- Move from factual product media to a contained spatial cue.
- Use a sparse manifesto beat only when it changes the user’s narrative state.
- Shift alignment, crop, or depth model between adjacent sections.
- Use a clear, low-noise confirmation surface for Cart or Checkout.

### Forbidden patterns

- Every section using eyebrow + serif heading + paragraph + rounded block.
- Repeating image-left/text-right then text-left/image-right as a default.
- Alternating background bands without a state or tempo change.
- Three numbered cards whenever a concept needs explanation.
- Repeating the same room study to manufacture continuity.

### Review questions

- Can each section be named by tempo and narrative job?
- Which two visual dimensions change from the previous section?
- Is the quiet zone a true pause or just a large empty container?
- Does a repeated motif reveal new evidence, or merely repeat brand imagery?
- Does the route become more transactional only after clarity is earned?

### Approved specimen description

Home moves from a quiet Threshold, to a denser possibility/discovery field, to
an explanatory spatial evidence moment with a different composition, then
returns to a calm invitation. No two consecutive sections use the same
two-column posture or equal bordered-card pattern.

### Rejected specimen description

A page cycles through six sections that all contain a small uppercase label, a
large serif heading, a paragraph, an image, and a rounded card. Background
colors alternate but narrative pressure never changes.

---

## 11. Responsive Visual Hierarchy

### Intent

Preserve the decision hierarchy across widths instead of treating responsive
work as mechanical column stacking.

### Perceptual effect

On a narrow screen, the user still encounters the same question, evidence, and
safe action in the intended order.

### Required rules

1. A frame brief must be checked at the widest supported layout, the principal
   desktop layout, and the narrowest supported touch layout.
2. Responsive reflow may change position, crop, scale, and density, but it may
   not silently replace the primary focal field.
3. If text owns the primary role, a narrow layout may not place a decorative
   illustration before it unless the page brief explicitly changes the
   narrative entry order and the Story Bible permits that change.
4. If an illustration moves above text, its mass must be reduced or its role
   reclassified so it does not become an accidental protagonist.
5. Preserve safe text and interaction margins before preserving decorative
   geometry.
6. Mobile may simplify a scene by omitting tertiary detail, reducing furniture
   density, or changing crop. It may not compress all desktop elements into a
   miniature complete room.
7. A Planner’s operational canvas may change controls and density by capability
   boundary; its preserved intent must remain clear under the Component Bible.

### Allowed techniques

- Reorder factual product media and configuration only when the declared
  attention order remains intact.
- Tighten crop and omit tertiary room details on narrow screens.
- Convert a wide counterweight into a quieter stacked support field.
- Use a smaller, off-axis spatial cue after the Threshold question on mobile.

### Forbidden patterns

- Automatic flex/grid stacking without a new attention-order check.
- Letting an SVG become first merely because it has a lower desktop order.
- Scaling a complex illustration down until line hierarchy disappears.
- Hiding the primary evidence instead of simplifying tertiary decoration.
- Treating a mobile capability boundary as a visual afterthought.

### Review questions

- Is the three-second attention order unchanged or explicitly re-authored?
- What becomes quieter or disappears on narrow screens?
- Does line hierarchy remain legible at the smallest rendered size?
- Has an illustration accidentally become the primary field?
- Are safe text, CTA, and touch areas protected?

### Approved specimen description

On narrow Threshold, the open question remains first. A reduced, cropped
spatial study follows as supporting evidence, with tertiary furniture detail
removed. The exploratory CTA remains available but third in the sequence.

### Rejected specimen description

Desktop text and scene simply stack. The room drawing appears first at almost
full width, the headline is pushed below it, and its technical details become
the user’s first impression.

---

## 12. Anti-AI Visual Smell Test

### Intent

Detect visual defaults that can satisfy semantic rules while still looking
generated, generic, diagrammatic, or borrowed from another brand.

### Perceptual effect

The system rejects familiar template behavior before it becomes normalized
across storefront surfaces.

### Required rules

1. Count unsupported smells in every rendered frame, not only in source code.
2. Two or more unsupported smells require escalation to visual review before a
   surface may be accepted.
3. A fake technical diagram outside a truthful measurement context is an
   immediate escalation even when it is the only smell.
4. An allowed exception must be documented in the frame brief with its
   narrative or functional reason. “It looks balanced” is not an exception.
5. The smell test evaluates patterns, not individual CSS properties. A card,
   gradient, centered object, or rounded control can be valid when its stated
   role meets the grammar.

### Allowed techniques

- A centered comparison only when equality is the user’s actual task.
- Rounded controls when they communicate touchability or a bounded reversible
  action.
- A grid, dimension, or technical line inside the real Planner.
- A single restrained gradient only when it represents actual media lighting,
  not manufactured atmosphere.

### Forbidden patterns

- Ignoring a smell because palette tokens or semantic CTA colors are compliant.
- Combining multiple default patterns and calling the result “minimal.”
- Treating an exception as a reusable default on another surface.

### Review questions

- How many smells are visible in the rendered frame?
- Which are supported by a written exception?
- Would an independent reviewer identify the same count?
- Does the exception still preserve Story Bible state and attention order?

### Approved specimen description

A factual Planner scene uses a grid and measured top-down view while the tool is
active. The frame brief records that these are operational evidence; the rest
of the chrome recedes so the tool does not become decorative CAD styling.

### Rejected specimen description

A marketing Hero uses a centered room box, equal thin outlines, a 50:50 split,
an oversized serif headline, and a pale glow. Each choice is individually
defended as “minimal,” but together they form an unsupported AI-default stack.

### Strict smell catalogue

| Signal | Why it is wrong for Nestify | Allowed exception |
|---|---|---|
| Perfect mathematical symmetry | It turns an unresolved lived space into a diagram or showroom set. | A truthful comparison or operational top-down Planner view, with the equality serving a user task. |
| Default centered composition | It removes the tension and personal point of view required by an emerging decision. | A centered focal object may be used when a clear asymmetric crop, light direction, or counterweight prevents bilateral symmetry. |
| 50:50 text/visual split | It treats copy and image as unrelated columns and makes both compete as protagonists. | A factual compare surface may use equal columns when the user must judge two equivalent options. |
| Uniform 1px outlines | It makes architecture, object, border, and decoration read as one technical wireframe. | A compact data table or operational control may use a uniform border when no spatial hierarchy is claimed. |
| Arbitrary floating cards | It adds elevation and focal points without evidence, increasing ecommerce noise. | A modal, drawer, contextual tool panel, or truly separated reversible action. |
| Repeated rounded rectangles | It reduces an authored page to a component inventory. | Controls and bounded inputs may repeat a radius when their shared interaction role is visible. |
| Whitespace with no compositional role | It reads as unfinished layout rather than calm reflection. | Space explicitly functioning as question, separation, recovery, action runway, or evidence framing. |
| Oversized serif headline plus minimal SVG formula | It reproduces a common AI landing-page shortcut instead of Nestify’s decision-specific hierarchy. | A true editorial statement may use display type when a non-generic visual counterweight and named quiet zone prevent the formula. |
| Literal room metaphor repeated everywhere | It turns The Becoming Room into a logo stamp and weakens its narrative progression. | A materially different state or truthful spatial evidence moment on a route that needs it. |
| Repeated icon + heading + paragraph triplets | It converts a journey into generic feature marketing. | A compact utility or settings group where scanning independent options is the user’s actual task. |
| Alternating image/text sections as default rhythm | It imports a templated editorial cadence unrelated to narrative state. | Two adjacent sections that need explicit contrast or comparison and change other visual dimensions as well. |
| Generic gradients or glow as atmosphere | It manufactures luxury mood instead of showing clearer spatial evidence. | Actual product media lighting or a restrained source-derived value transition that passes the Light Grammar. |
| Fake technical diagram outside measurement contexts | It confuses a narrative invitation with Planner capability and produces CAD/SketchUp aesthetics. | The active Room Planner, scale reference, dimensions, collision feedback, or another truthful operational measurement task. |

---

## 13. Visual Review Protocol

### Intent

Require rendered evidence so visual quality cannot be passed solely through
semantic tokens, JSX structure, accessibility checks, or static code review.

### Perceptual effect

Reviewers can judge whether a frame is legible, spatially authored, state-safe,
and recognizably Nestify before implementation is accepted.

### Required rules

1. Every storefront visual review supplies a frame brief and rendered evidence
   at the three responsive contexts defined in §11.
2. The review packet includes: normal-color render, grayscale render, a
   silhouette/low-detail view, and narrow-width render. For spatial or
   animation work, include a static frame at the key decision moment.
3. Review the following twelve checks in order:
   1. three-second attention order;
   2. visual center of gravity;
   3. hierarchy without copy;
   4. grayscale readability;
   5. silhouette/composition readability;
   6. line hierarchy;
   7. depth cues;
   8. light-source plausibility;
   9. negative-space purpose;
   10. responsive hierarchy;
   11. AI smell count;
   12. narrative-state compliance.
4. A reviewer records PASS, WARN, or FAIL for each check. A review may not
   collapse these into one aesthetic impression.
5. A FAIL blocks acceptance. Two or more WARN results require escalation and a
   revised frame brief. One WARN may proceed only with a documented owner and
   follow-up.
6. Narrative-state compliance, unsupported smell count of two or more, or a
   fake technical diagram outside a measurement context is never a cosmetic
   WARN; it is a FAIL.

### Allowed techniques

- Use browser screenshots, local render captures, or approved design
  prototypes.
- Temporarily hide copy only for the hierarchy-without-copy and silhouette
  checks; do not use hidden-copy output as the normal visual review.
- Convert a render to grayscale without changing layout.
- Compare wide and narrow frames side by side.
- Record an exception only when it cites a rule, state, and page role.

### Forbidden patterns

- Reviewing source code without a render.
- Passing a frame because color semantics and CTA roles are correct.
- Calling a visual concern “subjective” before checking the grammar.
- Reviewing only desktop for a responsive surface.
- Treating an existing implementation as proof that a pattern is allowed.

### Review questions

- Does the normal render make the intended first, second, and third targets
  visible within three seconds?
- Does the grayscale render preserve mass and hierarchy?
- Does the silhouette view still reveal the intended composition?
- Can every major line and plane be assigned a grammar role?
- Is the light source plausible and doing hierarchy work?
- Is every quiet zone named and held?
- Is the narrow render re-authored rather than merely stacked?
- How many unsupported AI smells are present?
- Does the frame expose only the story state it is permitted to expose?

### PASS / WARN / FAIL conditions

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Attention order | All three targets appear in declared order. | Secondary and tertiary are close but still distinguishable. | Primary is unclear or a CTA/decorative element wins first. |
| Center of gravity | Dominant mass and counterweight are intentional and stable. | Balance depends on subtle copy or color. | Frame is accidentally centered, lopsided, or split into equal protagonists. |
| Hierarchy without copy | Visual mass remains intelligible when copy is hidden. | Some state meaning depends on copy. | Composition collapses into unrelated shapes or cards. |
| Grayscale and silhouette | Plane, mass, and focal relationship survive both checks. | One supporting relationship weakens. | Primary, planes, or product silhouette disappear. |
| Line, depth, and light | Roles are identifiable; three depth cues and plausible source are present. | One cue is weak but not misleading. | Uniform wireframe, floating object, fake glow, or no spatial depth. |
| Negative space | Every major quiet zone has a named job. | One job is weakly held. | Blank space is unexplained or used to hide unfinished composition. |
| Responsive hierarchy | Narrow frame preserves or explicitly re-authors attention order. | One tertiary item needs simplification. | Stacking makes art/decorative content the accidental primary. |
| AI smell count | Zero or one supported smell. | One unsupported smell with a named correction. | Two unsupported smells, or one immediate-escalation technical-diagram smell. |
| Narrative state | Surface reveals only the permitted story state. | No WARN state; clarify or fail. | Threshold teaches/demonstrates, Discover claims confirmation, or Cart persuades instead of reaffirms. |

### Approved specimen description

A review packet shows the same Product Detail at wide, desktop, and narrow
widths; includes normal, grayscale, and silhouette frames; identifies product
media → configuration → spatial cue as the attention order; and records a
single intentional quiet zone. The reviewer can point to line, depth, light,
and state evidence without reading implementation comments.

### Rejected specimen description

A reviewer inspects JSX, confirms no forbidden hex values, sees passing RTL
tests, and accepts a page without ever viewing its desktop or mobile render.

---

## 14. Cross-surface calibration

### Intent

Prove that one visual grammar creates distinct page roles without producing five
copies of the same Hero, card grid, or room illustration.

### Perceptual effect

Home, Product Listing, Product Detail, Cart, and Room Planner feel like stages
of one decision journey while each makes a different kind of information
primary.

### Required rules

1. A surface must adopt its calibration before a page-specific visual brief is
   accepted.
2. The calibration defines hierarchy and visual role, not fixed component
   layouts or pixel values.
3. A surface may refine its calibration only through an active decision record
   and must preserve its Story Bible state.
4. The same motif, image, or component may not be used to bypass a distinct
   surface role.

### Allowed techniques

- Change density, primary mass, depth model, and image role by state.
- Use actual product photography where factual evidence matters.
- Use spatial illustration only where it clarifies a permitted possibility.
- Allow technical evidence exclusively in the operational Planner.

### Forbidden patterns

- Copying Home’s visual posture onto Product Listing, Product Detail, Cart, or
  Planner.
- Using a generic room illustration as a substitute for product, scene, or
  transaction evidence.
- Treating the calibration as a visual layout recipe.

### Review questions

- Does this surface make its calibrated first target visible before competing
  information?
- Is its quiet zone serving the calibrated decision job?
- Does its light, depth, and density match state rather than visual fashion?
- Is the explicitly forbidden pattern absent?

### Approved specimen description

The five surfaces share quiet confidence, controlled lines, truthful evidence,
and state-aware color semantics, but their dominant masses move from question,
to possibility field, to product truth, to reaffirmed order, to active spatial
model.

### Rejected specimen description

Every route uses a large Fraunces heading beside the same room SVG, followed by
rounded cards and a dark CTA. The palette is consistent, but the journey is
not.

### Home / Threshold

| Calibration field | Required direction |
|---|---|
| First attention target | The open question or threshold proposition. It establishes tension, not an answer. |
| Second attention target | A quiet spatial study whose internal order is light → room → habitation cue. |
| Third attention target | One exploratory route forward, if present; it must not launch or demonstrate Planner. |
| Dominant visual mass | The unresolved question/proposition, expressed through text mass or an equivalent question field. |
| Counterweight | A contained or intentionally cropped, low-density spatial study. |
| Quiet zone | Question zone: space that keeps the room unfilled and the answer open. |
| Depth strategy | Three narrative planes; directional evidence without grids, dimensions, or a complete symmetric box room. |
| Light role | Neutral, source-derived evidence of possibility; never warm confirmation or decorative glow. |
| Density level | Low. One static habitation cue at most; no catalog, social proof, Planner controls, or finished room. |
| Illustration / photography role | Illustration may evoke unresolved space. Product/lifestyle photography is absent from the Threshold claim. |
| Explicitly forbidden pattern | A centered CAD-like room that acts as a Planner demonstration, especially when paired with a 50:50 text/visual split. |

### Product Listing / Discover

| Calibration field | Required direction |
|---|---|
| First attention target | The possibility field: products or collections available for thoughtful comparison. |
| Second attention target | The user’s discovery lens: category, search, material, or filter context. |
| Third attention target | Product name, price, or supporting metadata needed to decide what to inspect next. |
| Dominant visual mass | The product-image field as a whole, not a single arbitrary decorative hero image. |
| Counterweight | A quiet contextual heading or filter area that helps the user narrow possibility without becoming a promotional banner. |
| Quiet zone | Separation zone between discovery lens and product field, preserving scanability. |
| Depth strategy | Mostly flat comparison plane. Product photography supplies truthful depth; narrative room illustration is exceptional, not decorative. |
| Light role | Preserve factual product material and silhouette. Do not add atmospheric overlays to make a grid feel premium. |
| Density level | Medium to high, earned by comparison. Metadata and controls must recede behind product images. |
| Illustration / photography role | Photography is primary factual evidence. Illustration is limited to an empty/error state or a specific spatial cue with a declared job. |
| Explicitly forbidden pattern | Every product card plus a decorative room SVG, badge, glow, and hover treatment competing for equal attention. |

### Product Detail / Exploratory Commitment

| Calibration field | Required direction |
|---|---|
| First attention target | Truthful product media and the identified product/configuration as one factual evidence field. |
| Second attention target | Material, dimensions, selected variant, and other information that lets the user decide whether exploration is worth entering. |
| Third attention target | The safe “see in your space” route; purchase actions remain secondary until clarity has been pursued. |
| Dominant visual mass | Product media, sized and lit to preserve silhouette, material, and selected-variant truth. |
| Counterweight | A readable configuration/decision column, not a second hero illustration. |
| Quiet zone | Evidence pause around the transition from factual product truth to spatial possibility. |
| Depth strategy | Photo carries factual product depth; any spatial cue is subordinate and shows plausible placement, not an unrelated finished room. |
| Light role | Preserve material truth in photo; use one source-derived neutral spatial cue if present. |
| Density level | Medium. Configuration may be dense, but the product decision must not become a dashboard of badges and CTAs. |
| Illustration / photography role | Product-specific photography first; a smaller product-specific spatial study second. The two may not duplicate or contradict each other. |
| Explicitly forbidden pattern | A generic chair-room illustration used for a non-chair product, or a room cue equal in mass to the product media. |

### Cart / Transactional Commitment

| Calibration field | Required direction |
|---|---|
| First attention target | Reaffirmed order evidence: the saved room/scene when truthfully available, otherwise the coherent set of items being confirmed. |
| Second attention target | Total, availability, and the specific information needed to complete a known decision. |
| Third attention target | Checkout action, visually clear but not sales-promotional. |
| Dominant visual mass | The order/scene grouping, never an upsell or discount device. |
| Counterweight | Compact transaction summary that supports final checking. |
| Quiet zone | Recovery zone around final confirmation: no testimonials, lifestyle persuasion, countdowns, or recommendation clutter. |
| Depth strategy | Low editorial depth; use truthful room thumbnail/scene evidence when present, otherwise factual product thumbnails. |
| Light role | Functional readability and truthful scene recall; no atmospheric future-home glow or conversion lighting. |
| Density level | Medium. Enough information to verify, not enough visual noise to reopen an already-made decision. |
| Illustration / photography role | A Planner-generated scene thumbnail may be primary evidence. Catalog product images are secondary. Decorative Becoming Room illustration is not a substitute for real scene evidence. |
| Explicitly forbidden pattern | A persuasive catalog or lifestyle collage that treats Cart as another Discover surface. |

### Room Planner / Experiment + Mentally Real

| Calibration field | Required direction |
|---|---|
| First attention target | The live relationship between room, placed object, scale, and current manipulation. |
| Second attention target | Selected-object feedback, reversible controls, and direct spatial evidence. |
| Third attention target | Save, share, cart handoff, or other state-appropriate next action. |
| Dominant visual mass | The operational spatial model/canvas. UI chrome must not visually compete with it. |
| Counterweight | Catalog tray or selected-item panel, sized for access but lower in contrast and density than the canvas. |
| Quiet zone | Clear working area around the active object and its immediate spatial consequences. |
| Depth strategy | Truthful 3D depth: real scale, occlusion, grounding, collision, walls, and optional grid when those support manipulation. |
| Light role | Material and scale readability. Lighting must not conceal selected state, collision, dimensions, or placement. |
| Density level | High operational density around tools, low visual noise inside the active spatial decision area. |
| Illustration / photography role | Real model and user scene are primary. Product thumbnails support catalog selection. Narrative Becoming Room artwork is absent from the working canvas. |
| Explicitly forbidden pattern | Decorative CAD styling, fake technical marks, or marketing-room overlays that do not help the user manipulate or judge scale. |

