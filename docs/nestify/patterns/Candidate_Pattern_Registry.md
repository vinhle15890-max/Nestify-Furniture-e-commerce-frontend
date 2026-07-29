# Nestify — Candidate Pattern Registry

> **Status:** Non-canonical. Evidence-tracking only.
> **Authority:** Subordinate to `05_Component_Bible.md`. This document does not grant permission to reuse a component automatically.
> **Created:** 2026-07-13 — Pattern Ownership Validation Pass
> **Last updated:** 2026-07-13

> Candidate patterns are hypotheses supported by limited evidence.
> They must not be treated as canonical reusable components until all promotion gates are satisfied.

---

## How to use this registry

This registry records patterns that have demonstrated quality on one calibrated surface and show plausible reuse potential. Each entry is a **candidate**, not a contract.

When a genuine product requirement creates a second consumer for a candidate pattern, consult this registry to:

1. Check whether the candidate's semantic, interaction, and data assumptions are compatible with the new surface.
2. Identify which parts are reusable (semantic/interaction contracts) and which must remain surface-local (visual calibration).
3. Review known failure boundaries before implementation.
4. After the second consumer is built and reviewed, propose promotion to the Component Bible using the gates in §8.

Do not extract a candidate into a shared component before a second genuine consumer exists.

---

## 1. Discover Product Identity Anatomy

| Field | Detail |
|---|---|
| **Classification** | C — Interaction pattern (anatomy structure); E — Page-local (visual calibration) |
| **Current owner** | `src/pages/catalog/DiscoverProductUnit.jsx` |
| **Current consumers** | 1 — `CategoryPage.jsx:274` |
| **Semantic behavior** | Product unit displays: image tile (factual, no radius), product name (sans font at rest), and exactly one Product Detail link. No badge, no CTA, no metadata at rest. Price is withheld until explicit held attention. |
| **Visual behavior that must remain local** | `aspect-[4/5]` media ratio, `bg-unbuilt/35` placeholder, `text-sm`/`text-base` name sizing, `line-clamp-2` truncation, absence of rounded corners on image tile. |
| **State/narrative dependency** | Discover / Not Yet Seen (State 1). The anatomy enforces "never overwhelm" (Component Bible State 1) by limiting visible information at rest. |
| **Data assumptions** | Requires `product` with `{ id, slug, name, base_price, thumbnail }`. No structured dimensions, material, editorial ranking, or facet data assumed. |
| **Interaction assumptions** | Expects a parent that manages held-attention state (see Candidate 2). The anatomy alone (without hold/release) is a static product tile. |
| **Known failure boundaries** | Tested: rest equality (`DiscoverProductUnit.test.jsx:50–65`), single link per unit (line 55). Not tested: behavior when `thumbnail` is null with a video-only product. |
| **Likely future consumers** | Wishlist (echo Discover), any future browseable product field. |
| **Missing evidence** | No second consumer. No evidence that the anatomy works with variant-level data (Wishlist items carry `variant_id`). |
| **Promotion gates** | Requires a second genuine consumer that uses the same rest-state anatomy. Must prove compatibility with variant-level data if consumed by Wishlist. |
| **Status** | Candidate — awaiting second consumer |

---

## 2. Held-Attention Interaction

| Field | Detail |
|---|---|
| **Classification** | C — Interaction pattern |
| **Current owner** | `src/pages/catalog/DiscoverProductUnit.jsx:17–38` (handlers) + `CategoryPage.jsx:40,273–287` (parent state) |
| **Current consumers** | 1 — CategoryPage + DiscoverProductUnit |
| **Semantic behavior** | A browseable product field allows one product to hold attention at a time. Hold creates temporary focus without implying selection, recommendation, or purchase intent. Release removes focus. Touch first-tap holds without navigating. Keyboard focus creates the same held state as pointer hover. Neighbors remain visible, legible, and interactive but may recede in contrast. |
| **Visual behavior that must remain local** | `opacity-80` neighbor recession, `mx-1 sm:mx-2` held margin shift, `border-t-2 border-ink` held indicator, sans-to-display font transition, `text-[0.65rem]` media disclosure label. |
| **State/narrative dependency** | Discover / Not Yet Seen. The interaction must not trigger purchase, Planner, or hidden product facts (Listing Frame Brief §8). |
| **Data assumptions** | None beyond product identity. The interaction is data-agnostic. |
| **Interaction assumptions** | Requires: `lastPointerType` ref to distinguish touch from mouse, pointer enter/leave with non-touch gate, focus/blur with containment check, `heldProductId` parent state with `held`/`fieldHasHeld`/`onHold`/`onRelease`/`onToggle` callbacks. |
| **Known failure boundaries** | Tested: hover hold/release (`DiscoverProductUnit.test.jsx:67–84`), keyboard focus parity (lines 86–95), touch non-navigation (lines 97–111). Known untested edge: `lastPointerType` ref behavior under React Strict Mode double-render. |
| **Likely future consumers** | Any browseable product field where one-at-a-time attention is appropriate. |
| **Missing evidence** | No second consumer. No evidence the parent-state contract works outside a CSS grid layout (e.g., horizontal carousel, single-column list). |
| **Promotion gates** | Requires a second genuine consumer. Must prove the parent-state contract (`heldProductId` + 5 callbacks) generalizes to a different layout and data shape. |
| **Status** | Candidate — awaiting second consumer |

---

## 3. Discovery Lens Progressive-Disclosure Shell

| Field | Detail |
|---|---|
| **Classification** | B — Surface-family candidate (needs second consumer validation) |
| **Current owner** | `src/pages/catalog/DiscoveryLens.jsx` |
| **Current consumers** | 1 — `CategoryPage.jsx:197` |
| **Semantic behavior** | A collapsible panel that houses search, filter, and sort controls. At rest: shows result count (`aria-live="polite"`), active constraint chips with individual removal, and a toggle button with active-count badge. Expanded: reveals search input, category dropdown, price range dropdown, and sort dropdown in a responsive grid. |
| **Visual behavior that must remain local** | `border-b border-unbuilt` bottom boundary, `rounded-full` constraint chips, `text-[0.68rem] uppercase tracking-[0.14em]` filter labels, `SlidersHorizontal` icon, internal grid `lg:grid-cols-[minmax(15rem,1.3fr)_repeat(3,minmax(10rem,0.8fr))]`. |
| **State/narrative dependency** | Discover. Provides the "discovery lens" — contextual narrowing of a possibility field. |
| **Data assumptions** | Requires: `categories` (flat list with `{ slug, name, depth }`), `priceOptions` (array of `{ value, label, min, max }`), `sortOptions` (array of `{ value, label }`), `activeConstraints` (array of `{ key, label, onRemove }`). All passed as props — API-agnostic at the component level, but the *shape* of the data is coupled to the product catalog API. |
| **Interaction assumptions** | Progressive disclosure via `open`/`onToggle`. Debounced search via `SearchInput`. Native `<select>` for filters. Active constraint chip removal. Clear-all button when constraints exist. |
| **Known failure boundaries** | Tested indirectly via CategoryPage tests (filter, sort, search, category change). Not tested as a standalone component. |
| **Likely future consumers** | A future curated Collections page — but Collections does not currently exist as a distinct route or API. The existing `CuratedCollections` Home section links to `/c/<slug>` (category routes). |
| **Missing evidence** | No second consumer. No evidence that the filter dimensions (category tree, price ranges, sort options) generalize beyond the product catalog. No evidence that the result-count semantics ("X sản phẩm") apply to editorial collections. |
| **Promotion gates** | Requires a second genuine consumer with compatible filter dimensions. Must prove that the progressive-disclosure shell works with a different data taxonomy. |
| **Status** | Candidate — awaiting second consumer with compatible data shape |

---

## 4. Known-vs-Unknown Evidence Disclosure

| Field | Detail |
|---|---|
| **Classification** | Retired candidate. |
| **Former owner** | `ProductEvidencePanel` on Product Detail. |
| **Reason retired** | The page-local implementation duplicated the dedicated Product Specifications section and listed missing fields from hardcoded copy rather than the API response. It could therefore contradict available product attributes without giving the customer a recovery action. |
| **Current behavior** | Product specifications remain authoritative for dimensions and material. The decision rail retains selected variant, 3D-model fidelity, availability, and the context-preserving Planner handoff. |
| **Status** | Retired on 2026-07-29; no current consumers. |

---

## 5. Planner Handoff Semantic Contract

| Field | Detail |
|---|---|
| **Classification** | Semantic contract: B — Surface-family candidate. CTA styling: E — Page-local. |
| **Current owner** | `src/pages/product/ProductEvidencePanel.jsx:54–75` (handoff with context) |
| **Current consumers** | 1 as a context-carrying handoff — ProductEvidencePanel. See §9 for the full Planner deep-link protocol audit. |

### Semantic contract (reusable candidate)

| Field | Detail |
|---|---|
| **Semantic behavior** | A navigation action that carries selected product and variant context into the real Room Planner via URL parameters. The handoff preserves reversibility ("Bước tiếp theo có thể đảo ngược") and discloses data limitations ("hình ảnh trong Planner phụ thuộc dữ liệu 3D hiện có"). Disabled when no variant is selected. |
| **State/narrative dependency** | Exploratory Commitment → Experiment bridge. The handoff must not simulate Planner capability or open a preview. |
| **Data assumptions** | Requires `product.slug` and `selectedVariant.id` to construct the deep-link URL. |
| **Interaction assumptions** | Standard `<Link>` navigation. The Planner page reads `product` and `variant` from search params. |
| **Known failure boundaries** | Tested: href shape (`ProductPage.test.jsx:186–207`), guest access (lines 268–279), single implicit variant (lines 196–207). |
| **Missing evidence** | No second consumer carrying product+variant context. Header nav, PlannerInvite, and MyRoomsPage use bare `/room-planner` or scene-ID URLs — different semantic roles. |

### CTA styling (page-local)

| Field | Detail |
|---|---|
| **Visual behavior that must remain local** | `bg-ink text-canvas` filled link, `rounded-control`, ArrowRight icon, disabled `bg-unbuilt text-ink/60` state. These are calibrated for the ProductEvidencePanel context. |

| **Promotion gates** | The semantic contract requires a second genuine consumer that carries product+variant context to the Planner (e.g., Wishlist move-to-planner, Cart scene re-entry). |
|---|---|
| **Status** | Semantic candidate — awaiting second context-carrying consumer. CTA styling is page-local. |

---

## 6. Quiet Uppercase Label Pattern

| Field | Detail |
|---|---|
| **Classification** | B — Surface-family candidate (needs convergence) |
| **Current owner** | Inline across multiple files (no shared component or utility) |
| **Current consumers** | ~10 on calibrated surfaces using `text-ink/55`; ~20 on uncalibrated surfaces using `text-muted-foreground` (ink/70) |
| **Semantic behavior** | A small, uppercase, tracked-out label that identifies a field or section without competing with the content it names. Always appears above a content block (input, select, evidence row, section heading). |
| **Visual behavior that must remain local** | Exact font size (`0.65rem`–`0.68rem`), exact tracking (`0.14em`–`0.22em`), and color value vary across surfaces. |
| **State/narrative dependency** | None — used across all states as a generic field identifier. |
| **Data assumptions** | None. |
| **Interaction assumptions** | None. |
| **Known failure boundaries** | No dedicated tests. The pattern is tested indirectly through every component that uses it. |
| **Likely future consumers** | Every future surface. |
| **Missing evidence** | Two divergent color values exist: `text-ink/55` on calibrated surfaces and `text-muted-foreground` (ink/70) on uncalibrated surfaces. The 15-percentage-point difference is perceptually meaningful at small sizes. It is unclear whether this divergence is intentional (calibrated surfaces deliberately chose a quieter value) or accidental (calibrated surfaces predated the global token audit). Tracking values also vary (`0.14em` to `0.22em`) without a documented reason. |
| **Promotion gates** | Requires convergence of color and tracking values across calibrated surfaces. A second calibrated surface using the same values as the first would confirm stability. A `@utility` class could reduce repetition without locking values prematurely. |
| **Status** | Candidate — awaiting value convergence |

---

## 7. Quiet Section Boundary

| Field | Detail |
|---|---|
| **Classification** | D — Composition-local pattern |
| **Current owner** | Inline in `ProductPage.jsx:502` and `ProductEvidencePanel.jsx:54` |
| **Current consumers** | 2 — ProductPage transaction runway, ProductEvidencePanel Planner handoff |
| **Semantic behavior** | A low-contrast horizontal rule that separates a secondary action group from primary content above. Communicates "this section is secondary to what came before." |
| **Visual behavior that must remain local** | `border-t-2 border-ink/15`, `pt-8` or `pt-3` padding. The specific `ink/15` opacity and `border-t-2` weight are calibrated for the Product Detail canvas background. |
| **State/narrative dependency** | None specific — used wherever a quiet visual pause is needed. |
| **Data assumptions** | None. |
| **Interaction assumptions** | None. |
| **Known failure boundaries** | No dedicated tests. The boundary is tested indirectly through the sections it separates. |
| **Likely future consumers** | Cart (between order summary and checkout action), Checkout (between form and confirm). |
| **Missing evidence** | Only 2 uses, both on Product Detail. Cart and Checkout use `border-t border-border` (different token, different weight) — no evidence that `ink/15` is the right value on those surfaces. |
| **Promotion gates** | Requires a third surface using the same semantic role with compatible visual calibration. Currently insufficient evidence for promotion. |
| **Status** | Composition-local — monitor for third use |

---

## 8. Promotion Gates

A candidate may be proposed for canonical promotion to `05_Component_Bible.md` only when **all** of the following are satisfied:

1. **Two genuine production consumers.** Both must be real product requirements, not surfaces invented to satisfy this gate.
2. **Same semantic role.** Both consumers use the pattern for the same narrative/functional purpose.
3. **Compatible data assumptions.** Both consumers' data shapes are served by the pattern's assumptions without modification to the pattern's core contract.
4. **Compatible interaction assumptions.** Both consumers' interaction needs are served by the pattern's contract.
5. **Visual calibration can remain surface-local.** The reusable contract does not import composition-specific visual values (colors, sizes, ratios, opacities).
6. **At least one failure boundary is tested.** A test or rendered review demonstrates the pattern's behavior at a known edge case.
7. **Rendered review evidence exists for both consumers.** Both consumers have passed the Visual Review Protocol (`04_Visual_Grammar.md` §13) with persisted reports.
8. **Reuse was driven by a real product requirement.** No route, feature, or surface was invented solely to validate the pattern.

No exceptions. A candidate that satisfies gates 1–7 but fails gate 8 is not promoted.

---

## 9. Proven Protocol — Planner Deep-Link URL Contract

> This section records a protocol that has already passed all promotion gates. It is not a candidate — it is an established fact. It is recorded here for reference until a canonical owner is assigned.

### Evidence

| Consumer | File | URL shape | Context passed |
|---|---|---|---|
| Product Detail handoff | `ProductEvidencePanel.jsx:18` | `/room-planner?product=<slug>&variant=<id>` | Product slug + variant ID |
| Home PlannerInvite | `PlannerInvite.jsx:29` → `data/home.js:68` | `/room-planner` | None |
| Header navigation | `Header.jsx:69` | `/room-planner` | None |
| MyRoomsPage re-entry | `MyRoomsPage.jsx:80` | `/room-planner/<id>` | Scene ID |
| MyRoomsPage new scene | `MyRoomsPage.jsx:123,141` | `/room-planner` | None |
| About page | `AboutPage.jsx:50` → `PlannerInvite` | `/room-planner` | None |

### Protocol

| URL shape | Meaning | Reader |
|---|---|---|
| `/room-planner` | New empty scene | `RoomPlannerPage` — creates scene via API |
| `/room-planner/<id>` | Re-open existing scene | `RoomPlannerPage` — loads scene via API |
| `/room-planner?product=<slug>&variant=<id>` | New scene with product preloaded | `RoomPlannerPage` — deep-link preload (`RoomPlannerPage.jsx:49–69`) |
| `/room-planner/shared/<token>` | Public read-only shared scene | `SharedRoomPage` — separate route |

### Failure boundaries

- Deep-link preload timeout: 10-second request-scoped timeout (`RoomPlannerPage.jsx:59`)
- Missing variant: Planner handoff disabled with reason (`ProductEvidencePanel.jsx:63–69`)
- Small screen: Capability Boundary redirects with preserved URL (`SmallScreenNotice.jsx`)
- WebGL unavailable: Capability Boundary with alternative path (`useWebGLSupport.js`)

### Canonical ownership recommendation

The Planner deep-link URL contract is a **routing and navigation protocol**, not a component behavior. It defines how surfaces communicate with the Planner via URL parameters.

**Recommended canonical owner:** Engineering Mapping Appendix in `05_Component_Bible.md` (currently at lines 177–191). The appendix already documents technical integration patterns (GLTF loading, WebGL detection, mobile breakpoint, `beforeunload`). The deep-link protocol belongs alongside these as an integration contract.

**Alternative considered:** A standalone routing/navigation contract document. Rejected because the protocol is tightly coupled to the Planner's Capability Boundary and scene lifecycle, which are already owned by the Component Bible.

**Not recommended:** The Component Bible's state-specific behavior sections (State 1–4). The deep-link protocol is not a psychological-state behavior — it is a technical integration detail.

**Action required:** A future task should add the deep-link protocol table to the Engineering Mapping Appendix. This task does not make that change.

---

## 10. ProductCard Status

| Field | Detail |
|---|---|
| **Status** | Pre-calibration, actively consumed, prohibited for new surfaces without review |
| **File** | `src/components/ProductCard.jsx` |
| **Test** | `src/components/ProductCard.test.jsx` |

### Current consumers

| Consumer | File | Surface |
|---|---|---|
| BestSellers | `src/components/home/BestSellers.jsx:5,44` | Home page — Discover section |
| SuggestedForYou | `src/components/personalization/SuggestedForYou.jsx:2,37` | Home page — PersonalizedSection (logged-in only) |
| RecentlyViewedStrip | `src/components/personalization/RecentlyViewedStrip.jsx:2,16` | Product Detail page — below reviews |

### Why it is pre-calibration

ProductCard exposes price always and uses display font always — both conflict with the calibrated Discover anatomy (price withheld until held attention, sans font at rest). It was built before the Listing calibration established the held-attention interaction contract.

### Why it is not deprecated

It has 3 active consumers rendering on 2 production surfaces. Deprecation without migration would break these surfaces.

### Migration path

ProductCard migration belongs to the future **remaining Home sections calibration** task (BestSellers, SuggestedForYou) and the **Product Detail secondary-section calibration** task (RecentlyViewedStrip). When those surfaces are calibrated, their consumers should be migrated to either DiscoverProductUnit (with held-state parent) or a new simplified component that follows the calibrated Discover anatomy. ProductCard should be deprecated only after all consumers are migrated.

### Prohibition

No new surface may import ProductCard without a review against the current Component Bible State 1 behavior. The held-attention interaction contract (Candidate 2) should be evaluated as the replacement pattern.

---

## 11. Rendered Review Evidence Status

### Current state

Rendered visual review occurred during the three calibration tasks (Home Hero, Product Listing, Product Detail). Evidence of review is embedded in Frame Brief amendments:

- **Home Hero:** Brief §6 documents 10 prior failure-to-prevention commitments from rendered review.
- **Product Listing:** Brief §9 documents a first rendered-review correction (generic card wall → held possibility field).
- **Product Detail:** Brief §7 documents a pre-implementation audit finding that drove the missing-evidence panel.

### Gap

No standalone Visual Review Reports using the `templates/Visual_Review_Report.md` template are persisted in the repository. The template exists but has zero completed instances. Review outcomes were recorded in-session and captured only as Frame Brief amendments.

### Consequence

Future calibration tasks cannot reference prior review evidence for cross-surface comparison or institutional memory. The review system works in-session but leaves no audit trail.

### Recommended path convention

Future calibration tasks should save completed review reports under:

```
docs/nestify/reviews/<date>-<surface>-visual-review.md
```

Examples:
- `docs/nestify/reviews/2026-07-13-home-hero-threshold-visual-review.md`
- `docs/nestify/reviews/2026-07-13-product-listing-discover-visual-review.md`
- `docs/nestify/reviews/2026-07-13-product-detail-exploratory-commitment-visual-review.md`

The `docs/nestify/reviews/` directory does not yet exist. It should be created when the first persisted report is written.

This convention is a recommendation only. No artifacts are moved or created by this task.

---

## 12. Patterns Deliberately Excluded

The following were evaluated and determined to be **local implementation decisions**, not reusable pattern candidates. They are recorded here to prevent future re-evaluation.

| Pattern | Reason for exclusion |
|---|---|
| **Entered Edge spatial study** (`Hero.jsx:30–139`) | Page-local illustration. Reusing the geometry elsewhere would violate Visual Grammar §10 rule 5 (exact asset repetition prohibited) and §8 rule 10 (literal room metaphor repeated everywhere). The *grammar* (off-axis, cropped, asymmetric) is documented in Visual Grammar; the *geometry* is not reusable. |
| **Transaction runway** (`ProductPage.jsx:499–574`) | Page-local layout. The narrative requirement (purchase available but secondary after evidence) is specific to the Exploratory Commitment micro-transition. Cart and Checkout have different narrative roles with different transaction prominence. |
| **ProductEvidencePanel JSX** (`ProductEvidencePanel.jsx`) | Page-local component. The evidence-row grid, `bg-unbuilt/20` panel, `border-emerging/45` border, and hardcoded field list are tightly coupled to Product Detail's layout and data shape. The *semantic pattern* (Candidate 4) is separated above. |
| **Neighbor opacity 80%** (`DiscoverProductUnit.jsx:53`) | Interaction-local value. The 80% is specific to the Held Possibility Field's grid density and the Listing brief §8 requirement that neighbors remain "visible, legible, interactive, and unblurred." A different layout would need a different recession value. |
| **Hero stroke values** (`Hero.jsx:13–19`, `S = 1.6`) | Composition-local value. Derived from the Entered Edge study's viewBox (1200×720). A different illustration with a different viewBox would need a different base stroke. `BecomingRoomArt.jsx` uses its own hardcoded values (`0.75`, `1.1`, `1.3`) — not derived from S. |

---

## 13. Change Log

| Date | Change |
|---|---|
| 2026-07-13 | Initial registry created. Pattern Ownership Validation Pass. 7 candidates recorded, 5 patterns excluded, 1 proven protocol documented, ProductCard status recorded. |
