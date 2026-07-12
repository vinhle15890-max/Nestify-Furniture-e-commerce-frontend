# Nestify — Decision Register

This register records active cross-document decisions, their authority, and
their supersession effect. It does not restate brand, story, visual, or
component rules; those rules live in their canonical documents. A dated page
spec may narrow a page only when this register marks it active. It may never
override the Constitution, Story Bible, Design DNA, Visual Grammar, or
Component Bible.

---

## D-001 — Threshold authority and storefront visual-direction supersession

**Status:** Active  
**Effective:** 2026-07-12  
**Authority:** Product owner decision, recorded after forensic design-system
audit  
**Canonical sources affected:** Story Bible Threshold; Design DNA §1; Visual
Grammar; Component Bible; storefront agent entry points

### Decision

1. Home Hero is a **Threshold**, not Chapter 1, a Planner lesson, or a product
   demonstration.
2. The playable BecomingRoom Hero concept — ghost → measure → snap →
   materialize — is superseded. It is retained only as historical product
   context in its dated spec.
3. Threshold must not teach, simulate, or demonstrate Room Planner mechanics.
   Direct-manipulation teaching belongs to the real Room Planner in its owning
   psychological state.
4. A single static habitation presence is permitted at Threshold only when it
   preserves the unanswered question and creates tension. It must not resolve
   the room, imply a completed user decision, or materialize.
5. Organic / Warm Luxury Editorial is superseded for **all storefront visual
   decisions**: palette, typography expression, layout, card/elevation,
   imagery, motion, and visual rhythm.
6. Technical architecture and implementation material in older documents may
   remain valid when unrelated to visual direction. Their historical visual
   sections are not a source of storefront design authority.

### Superseded sources

- docs/superpowers/specs/2026-07-06-hero-becoming-room-interaction-design.md
  is superseded as a Hero design/implementation authority.
- Section F of
  docs/superpowers/specs/2026-06-13-fe-nestify-design.md is superseded for
  storefront visual direction.
- Any older dated spec that names Organic / Warm Luxury Editorial is historical
  for visual decisions unless a later active decision explicitly re-approves a
  narrowly scoped technical exception.

### Resolution order

This register records status and supersession; it is not a parallel design
layer. Check its active status before applying a dated spec. For a storefront
visual conflict, apply this order:

1. Brand Constitution
2. Story Bible
3. Design DNA
4. Visual Grammar
5. Component Bible
6. Token implementation layer
7. Active page specification
8. Prompt or skill

An item lower in this list must defer to an item above it.
