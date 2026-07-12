# [SUPERSEDED] Hero "Becoming Room" interaction — design spec v1.1

> **Status: SUPERSEDED for Hero design and implementation by Decision Register
> D-001 (2026-07-12).** The static Threshold defined in Story Bible is the
> canonical Hero authority. This document is retained only as historical context
> for the abandoned playable concept; it must not be used to restore Hero
> interaction, Lesson 0, or Planner demonstration.

**Date:** 2026-07-06
**Surface:** Home hero (`src/components/home/Hero.jsx`)
**Historic position only:** formerly Chapter 1 Possibility / State 1 Not Yet
Seen. It is not an active authority; see Decision Register D-001.

## Goal

Turn the hero's static empty-room SVG into a single-gesture interactive moment that mirrors
the real 3D Room Planner mechanic — **ghost → measure → snap → materialize** — so the hero
doubles as the first onboarding for the Planner. The user places exactly **one** furniture
object, then it stops. The room does not auto-complete.

## Framing — this is not a hero, it is a Playable Brand Manifesto

The Brand Manifesto *writes* "chúng tôi không bảo bạn mua, chúng tôi để bạn thử." This hero does
not *say* that sentence — it lets the user **experience** it. One gesture, and the user has
already tried before being asked to believe. That is a level above copywriting: the brand's core
promise is delivered as a felt action, not a claim. Every decision below serves that framing.

## Three design laws this establishes (product-wide, added to `03_Design_DNA.md`)

> **Law — Visualization gates `imagined`.** `imagined` may only appear after a user-initiated
> visualization action. On the Home Hero, that visualization is limited to the single furniture
> object the user places. The room itself remains in the `unbuilt` state.

> **Law — The interaction teaches before it demonstrates.** The Hero is *Lesson 0* and the Room
> Planner is *Lesson 1*: performing the gesture once teaches the Planner's mental model, so the
> Planner needs no tooltip, no coach-mark, no intro video. Interactions earn their place by
> teaching how a decision is made, not by showing off.

> **Law — The brand is understood through interaction, not explanation.** Nestify avoids intro
> videos, tooltips, coach-marks, and intro modals. The product's meaning is delivered by doing,
> not by being told. Corollary: *if an interaction needs a tooltip to be understood, the
> interaction is not good enough yet* — fix the interaction, don't add the label.

## Principles honored

- **User is the actor.** No autoplay, no scroll-driven fill. The transition happens only on a
  deliberate user activation (tap / keyboard).
- **The Measure Moment is the point — it is a pause in *decision*, not in motion.** The object
  stops moving long enough for the user to answer one question: *"Does this feel right here?"*
  Only after that answer can the object materialize. This is not wording — it changes the
  implementation intent: the developer is not building a pretty pause, they are building a
  **decision pause**. Nestify sells *"giờ mình biết nó sẽ như thế nào,"* not animation; without
  this beat the motion reads like a Dribbble loop.
- **One decision, then stop.** After the first placement no further slots activate — the room
  stays a room of possibility; the user made one decision and saw it become real.
- **Cheap reversibility** (the Enemy is fear of irreversible decisions): a quiet "Thử lại"
  returns to the empty room.
- **Not a gimmick** (Brand Context warning): one restrained gesture with real accessibility.
- **Lightweight:** a 2D **SVG** micro-interaction that *mirrors* the Planner's mental model — it
  is **not** Three.js, so it keeps the ~1 MB planner bundle off the landing page.

## Interaction / state machine

`idle → placing → measuring → placed` (+ reset → `idle`).

- **idle** — room shell outline in `unbuilt`; one dashed floor slot in `emerging`; an invitation
  control labelled *"Chạm để đặt thử"* (the Chapter 1 question "Đặt gì vào đây?" made actionable).
- **placing** — on activation, a `emerging`, ~50%-opacity **ghost** object appears offset from the
  slot (as if being brought in).
- **measuring** — the **Measure Moment**, a pause in *decision* not in motion. The ghost stops at
  a readable position and waits long enough for the user to answer *"does this feel right here?"*
  Only after that beat may the object materialize. Build it as a decision pause, not a transition
  artifact.
- **placed** — the object **snaps** into the slot and **materializes** (`unbuilt → imagined` fill,
  `ink` edge, slight settle). It stays at `imagined`. A contextual link
  **"Tiếp tục thử trong Room Planner →"** (`/room-planner`) appears — continuity from the lesson
  just performed; a quiet **"Thử lại"** resets to `idle`. No further slots activate.

### Perceived rhythm (DNA governs feeling, not milliseconds)

The DNA specifies **rhythm**, not exact durations — implementation may tune easing/timing freely
as long as the four beats remain individually perceptible:

```
ghost appears  →  [held: measure ~150–200ms]  →  snap  →  materialize
```

Guidance, not law: total sequence ≈ **600–900 ms** depending on easing; the measure hold must be
long enough to read fit and short enough to feel responsive. Motion is implementation; the DNA
requirement is that the user *feels* Ghost → Measure → Materialize.

## Color mapping (Design DNA)

| Element | Token |
|---|---|
| Room shell outline (constant) | `unbuilt` #C9C4B8 |
| Empty slot (dashed) | `emerging` #8A7C68 |
| Ghost object (placing + measuring) | `emerging` @ ~50% opacity |
| Materialized object (placed) | fill `imagined` #B5754A, stroke `ink` |
| Planner link + existing CTAs | `ink` (State 1 rule — `imagined` is the object payoff, never a button colour) |

## The furniture object (abstracted)

`BecomingRoom` is object-agnostic. It receives a **furniture object** descriptor:

- `label` (e.g. `"Ghế"`) — used in all accessible text.
- `meaning` (e.g. `"seating"`) — the object's functional role, so a future agent can select the
  object by chapter (Ch.1 → seating/chair, Ch.2 → surface/table, Ch.4 → light/lamp) while the
  interaction logic stays identical.
- `shape` — the silhouette to render (inline SVG paths for ghost + materialized states).

```js
{ label: "Ghế", meaning: "seating", shape: /* SVG paths */ }
```

`Hero.jsx` injects the default (a chair). Swapping to a sofa/table/lamp later is a prop change in
`Hero.jsx`, no change to `BecomingRoom` internals.

## Accessibility

- The slot is a real `<button type="button">` with `aria-label` `"Đặt thử một chiếc {label} vào phòng"`,
  keyboard-operable (Enter / Space), with a visible `ink` focus-visible ring.
- **Focus management:** when the sequence completes (`placed`), focus moves programmatically to the
  **"Tiếp tục thử trong Room Planner"** link, so a keyboard user lands on the natural next action
  instead of being stranded on the old button. Under reduced motion this happens immediately.
- **`aria-live="polite"`** region, no marketing — placement announces `"Đã đặt {label}. Có thể mở
  Room Planner."`; reset announces `"Đã đặt lại phòng."`.
- The decorative room outline is `aria-hidden`. The Planner link is a normal `<Link>`, entering tab
  order only once shown.

## Reduced motion

`matchMedia('(prefers-reduced-motion: reduce)')`: skip the ghost/measure/snap choreography — the
object appears materialized immediately on activation, focus moves to the Planner link at once.
Still user-triggered; never autoplay. Timers are cleared on unmount and on reset.

## Architecture

- **New** `src/components/home/BecomingRoom.jsx` — self-contained. `useReducer` over
  `{ status: 'idle' | 'placing' | 'measuring' | 'placed' }`; the `placing → measuring → placed`
  beats use `setTimeout`s held in a ref and cleared on unmount / reset. `prefers-reduced-motion`
  read via `matchMedia`. Renders the injected furniture `shape`. Prop `plannerTo` (default
  `/room-planner`) and the furniture-object descriptor. No new deps.
- **Edit** `Hero.jsx` — replace the static room SVG + "Đặt gì vào đây?" pill with `<BecomingRoom/>`
  (passing the default chair object) in the right column. Left-column copy and the two existing
  CTAs ("Khám phá bộ sưu tập", "Xem Lookbook") are unchanged, keeping `HomePage.test.jsx` green.
- **Edit** `docs/nestify/03_Design_DNA.md` §1 — replace the "Home stays outline, no `imagined`"
  note with the three design laws above.

## Testing (Vitest + RTL, colocated `BecomingRoom.test.jsx`)

- idle renders the invitation button (accessible name from `label`); no Planner link yet.
- activate with fake timers → advance through **measuring** → **placed**: object materialized
  (assert via role/testid), Planner link to `/room-planner` present, `aria-live` text asserted,
  **focus is on the Planner link**.
- keyboard: focus the button, Enter drives the same sequence.
- reset ("Thử lại") → back to idle (Planner link gone, invitation returns, aria-live reset text).
- reduced-motion: `matchMedia` mocked `reduce = true` → activate → immediately **placed** without
  advancing timers, focus on Planner link.
- `HomePage.test.jsx` remains green (H1 + "Xem Lookbook" unchanged).

## Out of scope

Real Planner changes; migrating the rest of the Home page; placing more than one object / filling
the room; persistence of the placed object.

## Delivery note

Per the standing project rule, nothing is committed until the user explicitly asks; this spec and
all resulting code are written but left uncommitted.
