# Cart — Transactional Commitment Frame Brief

> Status: implemented and visually calibrated. Approved direction: **The
> Consequence Margin**.

## 1. Surface metadata

- **Surface / route / component:** Cart / `/cart` / `src/pages/cart/CartPage.jsx`
- **Primary surface type:** Micro-transition — Transactional Commitment
- **Associated state or transition:** Exploration has ended → provisional choices
  are reviewed → consequences become explicit → Checkout begins the stronger
  commitment.
- **User intent:** “Tôi muốn kiểm tra lại những gì mình đã chọn, điều chỉnh nếu
  cần, rồi chỉ tiếp tục khi đã hiểu hệ quả giao dịch.”
- **Canonical sources consulted:** `01_Brand_Constitution.md` →
  `02_Story_Bible.md` Chapter 6 → `03_Design_DNA.md` →
  `04_Visual_Grammar.md` §§1–14 → `05_Component_Bible.md` Transactional
  Commitment.
- **Decision Register checked:** D-001. It does not supersede Cart authority; its
  prohibition on using superseded storefront direction as authority still applies.
- **Evidence source checked:** `patterns/Candidate_Pattern_Registry.md`. Candidate
  status is evidence only and grants no reuse permission.

## 2. Narrative and frame hierarchy

- **Narrative role / permitted disclosure:** Reaffirm decisions already made and
  expose their immediate transaction consequences. Cart may show factual product,
  selected variant, quantity, price, availability, and saved-room provenance when
  the payload proves it. It may not reopen persuasion, claim fit, or imply that a
  saved-room reference is verified spatial evidence.
- **First attention target:** The coherent set of provisional choices: identified
  product, selected configuration when known, quantity, and line consequence.
- **Second attention target:** The current transaction consequence: availability,
  item count, goods subtotal, and any user-invoked voucher preview with explicit
  semantics.
- **Optional third attention target:** Checkout as the one stronger forward action.
- **What wins in three seconds, and through which two signals?** The choice field
  wins through (1) the largest continuous visual mass and (2) the richest factual
  identity signal: truthful media paired with aligned product/configuration data.
  The total is the strongest factual edge after that field. Checkout is the
  strongest action, but its placement follows the evidence and consequence rather
  than competing at the top of the frame.
- **What supports it without becoming a second protagonist?** A compact,
  structurally connected consequence field. It is not a floating promotion card
  and does not lead with voucher entry.
- **What remains recognizable after copy and logo are removed?** A calm, unequal
  evidence composition in which product decisions resolve into a clearly related
  consequence boundary, followed by a held recovery interval and one forward
  action. Factual thumbnails remain shallow; no decorative room or lifestyle
  imagery is used to manufacture ownership.

### Composition gate

- **What wins attention in the first three seconds?** The set of selected items,
  perceived as one decision field rather than unrelated commerce cards.
- **Through which two signals?** Dominant field mass and denser factual identity
  contrast than either summary or action.
- **What supports it?** A subordinate consequence field and quiet reversible
  controls attached to the fact they modify.
- **Where is the quiet zone?** The **reconsideration interval** between the last
  transaction fact and Checkout. It contains no voucher prompt, recommendation,
  reassurance strip, or sales copy.
- **What prevents a default 50:50 split?** The item evidence field occupies about
  2–3 times the perceived mass of the consequence field. The two fields must be
  joined by line/spacing logic, not isolated as equal columns.
- **What makes the frame recognizably Nestify after removing copy and logo?** The
  visual chain stays evidence → consequence → reversible pause → stronger action;
  uncertainty is admitted instead of patched with decorative or promotional
  content.

## 3. Composition and mass

- **Dominant visual mass:** The complete choice evidence field, including all line
  items. No first API item, room-sourced item, or expensive item receives featured
  treatment.
- **Counterweight:** The current consequence field. It may be spatially compact,
  but subtotal and availability must remain legible without interaction.
- **Visual center of gravity:** Held by the item ensemble, with a deliberate pull
  toward the consequence boundary; never a centered empty-state card or a dark
  Checkout rectangle detached from the order.
- **Named quiet zone and its job:** **Reconsideration interval** — a short visual
  recovery after the final confirmed price/availability fact, allowing the user to
  reverse or proceed without persuasion.
- **Containment / cropping / safe visual margins:** Product media may crop only as
  its source truth permits. Identity, configuration, quantity, unit/line price,
  errors, and removal may never be clipped or pushed behind disclosure. Summary and
  Checkout remain within the main reading path at every width.
- **Deliberate asymmetry:** Evidence mass > consequence mass > action mass. Within
  an item, identity has more width and visual weight than reversible controls; line
  consequence terminates the row/block rather than floating independently.
- **Why this is not a default 50:50 split:** Neither a sticky summary card nor an
  equal parallel protagonist is permitted. Consequence is a conclusion of the
  item evidence, not a second panel competing with it.

## 4. Transaction truth and state model

### Transaction hierarchy

1. Product identity and selected variant/configuration when supported.
2. Quantity, unit-price snapshot where supported, and line subtotal with distinct
   labels or relationships.
3. Saved-room provenance only when `room.id` and `room.name` are present.
4. Availability or line-specific conflict.
5. Cart goods total and user-invoked discount preview, if any.
6. Checkout.

Price must never wait for hover or disclosure, but it must not visually replace
product identity as the first anchor. Voucher entry is optional transaction support
and may not precede the unmodified goods total in attention.

### Reversible and stronger actions

- **Reversible actions:** Adjust quantity, remove an item, return to its Product
  Detail, dismiss/revise a voucher preview, and reopen the exact saved room only
  when a real `room.id` exists. Each action stays adjacent to the fact it changes.
- **Stronger next action:** Checkout. It advances the user from reviewing a
  provisional decision into the purchase flow. It is stronger than quantity or
  remove because it changes the narrative chapter; those controls only revise the
  current provisional decision. Cart itself does not claim purchase is complete.

### Known data

- Cart ID, cart item IDs, item quantity, `unit_price_snapshot`, line subtotal, and
  cart `total`.
- Variant ID, SKU, variant name, raw attributes when actually structured, current
  price, available stock, active state, model URL, and parent product name/slug/
  thumbnail when eager-loaded by the current resource.
- Optional saved-room provenance: room scene ID and name only.
- Voucher-preview discount and preview total only after a user submits a supported
  code.

### Unavailable evidence

- Cart has no room-scene preview, placement coordinates, room dimensions, measured
  clearance, or verified fit result.
- It has no reliable product dimensions, material, finish, room suitability, or
  Planner-compatibility claim.
- It has no shipping amount, tax breakdown, payment fee, or final payable order
  total. The cart total must therefore be named as a goods subtotal/total, not the
  final amount due.
- A room name proves provenance, not “đã xác nhận vừa”. Nestify must not estimate
  or narrate the missing evidence.

### Boundary and failure states

- **Empty state:** State plainly that there is no provisional decision to review.
  Offer one quiet path back to Discover. Do not use a decorative Becoming Room,
  recommendation rail, or emotional ownership callback.
- **Loading state:** Preserve the approximate evidence → consequence structure
  while withholding factual values. Loading may use restrained structural
  placeholders because data is genuinely pending; it may not imply product count,
  price, or stock.
- **Initial-load failure:** Do not render empty. Name the inability to retrieve the
  cart and keep a retry action.
- **Background refresh failure:** Preserve the last confirmed snapshot, mark it as
  potentially stale, and allow retry.
- **Mutation failure:** The last server-confirmed quantity and totals remain the
  visual truth. A failed update/remove receives an item-local, non-emotional reason
  and recovery action; the interface may not leave a locally changed quantity next
  to old line/cart totals.
- **Stock conflict:** Identify the affected line and supported availability fact,
  keep reduce/remove close, and disable Checkout while the conflict remains. Do not
  duplicate alarm styling in every region or soften the conflict with lifestyle
  language.
- **Authentication / role boundary:** Actionable Cart assumes an authenticated,
  verified customer. Guest, unverified, and staff boundaries must be explicit
  before Checkout; a staff user must not appear eligible to continue until the
  backend rejects final ordering.

## 5. Spatial and image strategy

- **Density level:** Medium. All transaction facts remain exposed, while optional
  voucher controls and provenance stay quieter than item identity and total.
- **Illustration role / photography role:** No illustration. Use the truthful
  product thumbnail supplied by the payload. Context photography remains product
  identity media, not scale or fit evidence. A Planner scene may become evidence
  only if the Cart payload later supplies that actual scene; the current room name
  is insufficient.
- **Line strategy:** Visual Grammar §5. Consequence boundary > item grouping edge >
  metadata/control relationship. Avoid uniform boxed rows and arbitrary 1 px
  outlines around every control; preserve native control affordances where needed.
- **Depth strategy:** Visual Grammar §6 and Cart calibration §14. Use low editorial
  depth: truthful media value, grouping/overlap, and edge recession. No card shadow,
  floating summary, decorative room plane, or atmospheric spatial scene.
- **Light role:** Visual Grammar §7. No authored UI light gesture. Preserve the
  source photograph’s material readability; never add glow or future-home warmth
  to intensify Checkout.
- **Negative-space purpose:** Separate item decisions, hold the reconsideration
  interval, and keep failure recovery readable. Blank space may not compensate for
  a detached summary or missing transaction information.

### Visual Grammar gate

- **Line hierarchy:** Consequence > item grouping > metadata/control relationship.
- **Far / middle / near planes:** Not a narrative spatial scene. Shallow roles are
  background field → item evidence → active error/action. No room-plane grammar is
  introduced.
- **Depth cues:** Media value separation, factual grouping, and edge recession;
  shadows and blur are prohibited depth substitutes.
- **Dominant light gesture:** None authored; source-media light only.
- **Containment and margins:** Every transaction fact and error remains within its
  item/consequence relationship at all target widths.
- **Negative-space purpose:** Item separation or reconsideration interval only.
- **Asymmetry:** Evidence mass exceeds consequence mass; action is strong only in
  sequence.
- **Responsive hierarchy:** Evidence → consequence → Checkout survives re-authoring.
- **AI smell threshold:** Two unsupported smells fail. A generic left-list/right-
  sticky-card anatomy, repeated rounded card wall, reassurance strip, or decorative
  room metaphor is unsupported on Cart.

## 6. Responsive intent

| Width context | First target | What recedes or changes | Evidence to capture |
|---|---|---|---|
| Wide — 1440 | Coherent item evidence field | Optional voucher and room provenance stay subordinate; consequence remains structurally joined, not a sticky card | Normal, grayscale, silhouette, no-copy, stock conflict, mutation failure |
| Desktop — 1024 | Same evidence field with total consequence visible in the opening composition | Reduce lateral spacing before compressing identity or price semantics | Normal, grayscale/silhouette if composition changes |
| Intermediate — 768 | Item evidence, followed immediately by current consequence | Optional controls move later; do not mechanically stack an oversized summary after a long control region | Normal, stock conflict, loading/empty if materially different |
| Narrow — 390 | Product identity/configuration → quantity/unit fact → line consequence | Media height and optional provenance reduce first; total follows the last item without an unrelated card; Checkout follows the reconsideration interval | Normal, grayscale, silhouette, mutation failure, long-name and multi-item state |

At every width, the semantic reading order is:

`choice evidence → current consequence → reconsideration interval → Checkout`.

## 7. Candidate-pattern decision record

| Candidate | Decision | Evidence and boundary |
|---|---|---|
| Known-vs-Unknown Evidence Disclosure | **adapt** | Reuse the honesty principle, not `ProductEvidencePanel`: distinguish room provenance from absent scene/fit evidence at Cart scope. Do not add a product-spec inventory. |
| Planner Handoff Semantic Contract | **reject** | The candidate owns Product Detail’s product/variant transition into Experiment. Cart must not add that transition. A possible backward link to an already-associated `/room-planner/{room.id}` would rely on the existing scene route and Cart reversibility, not this candidate, and only when a real room ID exists. |
| Quiet Uppercase Label | **reject** | Cart does not need an imported candidate label treatment to establish hierarchy. Any later label must be derived locally from the selected composition and canonical type grammar. |
| Quiet Section Boundary | **reject** | The reconsideration interval is already required by canonical Visual Grammar §14. The candidate’s page-local implementation and values add no authority and will not be imported. |
| Held-Attention Interaction | **reject** | Cart facts are already selected and must remain continuously legible; hover/focus disclosure would hide transaction truth. |
| Discovery Lens | **reject** | Cart has no discovery/filtering task. Progressive disclosure must not hide quantity, price, subtotal, stock, or removal. |
| Discover Product Identity Anatomy | **reject** | Discover delays price prominence; Cart must expose configuration, quantity, unit/line price, and reversal at rest. Neither `DiscoverProductUnit` nor `ProductCard` is permitted. |

No candidate is promoted by this decision record.

## 8. Anti-AI exclusions and review handoff

- **Forbidden visual pattern for this surface:** Generic left item list + detached
  right sticky rounded summary card, especially when voucher entry or a dark CTA
  becomes the visual protagonist.
- **AI smells considered and exceptions:** Visual Grammar §12. Unsupported smells
  include repeated rounded containers, generic ecommerce reassurance rows, empty
  whitespace without a decision role, decorative Becoming Room art, and uniform
  item/control boxes. Rounded affordances are allowed only when necessary to make
  a specific input/control legible; they may not form the page rhythm.
- **Required accessibility / Failure Behavior / boundary treatment:** Keyboard and
  touch quantity/remove controls need explicit names and pending/disabled states;
  focus order follows transaction hierarchy; status/errors are announced without
  replacing visible facts; the last confirmed server state stays legible; Checkout
  eligibility matches verified-customer rules.
- **Expected review evidence:** Normal color at 1440, 1024, 768, and 390; wide and
  narrow grayscale; wide and narrow silhouette/no-copy; empty; loading; initial
  and background failure; generic quantity failure; remove failure; stock conflict;
  voucher success/failure; guest/unverified/staff boundary; long product name;
  multi-item cart.
- **Open assumption or escalation needed before implementation:** Direction approval
  is required. If actual scene evidence is desired, the current Cart payload cannot
  supply it and backend contract work is out of this task’s scope; implementation
  must therefore use neutral room provenance only.

## 9. Required questions answered

1. **What should the user understand in the first three seconds?** These are the
   exact provisional choices currently held, this is their current goods
   consequence, and nothing has become irreversible yet.
2. **What evidence of prior decisions is visible?** Product/variant identity,
   quantity, unit/line prices, and optional saved-room ID/name provenance. A room
   preview or fit confirmation is not visible because the payload does not provide
   it.
3. **What consequence becomes explicit here?** Availability conflicts and the
   cumulative goods total of the current quantities; shipping/payment consequences
   remain for Checkout because Cart does not know them.
4. **Why is Checkout stronger than quantity/remove?** Quantity/remove revise the
   same provisional state. Checkout advances to the next commitment boundary.
5. **How does Cart remain calm without weakening transaction truth?** Calm comes
   from one continuous evidence rhythm, low editorial depth, restrained action
   hierarchy, and a persuasion-free recovery interval—not from hiding price,
   stock, errors, or reversals.
6. **Which Candidate Registry patterns were considered?** All seven active
   candidates were evaluated in §7.
7. **Which candidates were rejected and why?** Planner Handoff is a different
   forward transition; Held Attention, Discovery Lens, and Discover Product
   Identity Anatomy conflict with continuously visible transaction truth; Quiet
   Uppercase Label and Quiet Section Boundary add no authority beyond the
   direction-specific composition and canonical Visual Grammar.

## 10. Implementation calibration notes

- **Implemented composition:** A broad, continuous item-evidence field feeds a
  narrow, unboxed consequence axis. Each line subtotal terminates against that
  axis; the cumulative goods consequence resolves it after the final item.
  Checkout follows a 24px reconsideration interval and closes the sequence with
  a stronger terminal edge rather than a filled summary card.
- **Transaction-truth behavior:** Saved-room data is rendered only as provenance.
  Quantity drafts never replace confirmed subtotals; a failed update restores the
  confirmed quantity and produces an item-local alert. Failed removal keeps the
  item and exposes recovery locally. A successful quantity or membership mutation
  invalidates any voucher preview before it can remain authoritative.
- **Responsive re-authoring:** Wide, desktop, and intermediate frames preserve the
  unequal evidence/consequence relationship. At narrow width each item reads
  identity/configuration → unit price and quantity → line consequence → reversal
  or error, followed by cumulative consequence → reconsideration interval →
  Checkout.
- **First rendered review:** Structural FAIL, with no Critical transaction-truth
  failure. The first pass read too closely to an invoice grid, made quantity
  controls feel like a detached third column, wrapped the Checkout label at 768px,
  and delayed the cumulative consequence excessively.
- **Corrections:** Expanded the consequence margin without creating an equal split;
  clustered reversible controls with item evidence; replaced full-width row rules
  with receding partial boundaries; compacted the vertical rhythm at wide widths;
  and kept Checkout as an unfilled terminal action so it remains strongest among
  actions without becoming the dominant silhouette mass.
- **Final canonical review:** PASS with one responsive WARN: a multi-item cart at
  768px requires scrolling to reach Checkout because all line facts remain ahead
  of it. The authored transaction order is preserved, so this is not a hierarchy
  or accessibility failure.
- **Candidate boundary:** No Candidate Pattern Registry entry was promoted or
  imported as a reusable component. Known-vs-unknown was adapted only as semantic
  honesty, exactly as recorded in §7.
