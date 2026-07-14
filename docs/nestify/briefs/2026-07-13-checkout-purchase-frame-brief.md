# Checkout — Purchase Confirmation Frame Brief

> Status: Direction 3 — The Editable Declaration approved and implemented for
> calibration. This brief remains the surface-specific authority beneath the
> canonical Nestify chain.

## 1. Surface metadata

- **Surface / route / component:** Checkout / `/checkout` /
  `src/pages/checkout/CheckoutPage.jsx`.
- **Primary surface type:** Psychological State — State 4, **Committed**.
- **Narrative chapter / role:** Story Bible Chapter 6 — Purchase. Checkout owns
  the final confirmation action; it is not Cart’s Transactional Commitment and
  it is not the later payment-result confirmation surface.
- **Associated transition:** Provisional transaction reaffirmed in Cart → exact
  fulfillment and monetary facts reviewed → order creation requested → for
  PayOS, payment remains a separate server-confirmed transition.
- **User intent:** “Tôi muốn hoàn tất điều đã quyết định, sau khi biết chính xác
  đơn nào sẽ được tạo, giao tới đâu, thanh toán bằng cách nào, và số tiền nào
  hiện được chứng minh.”
- **Primary anxiety:** An unexpected or ambiguous consequence at the point of
  stronger commitment: wrong address, changed stock, stale discount, duplicate
  order, or payment claimed before it is confirmed.
- **Canonical sources consulted:** `01_Brand_Constitution.md` →
  `02_Story_Bible.md` Chapter 6 → `03_Design_DNA.md` §§1–3 →
  `04_Visual_Grammar.md` §§1–14 → `05_Component_Bible.md` State 4.
- **Decision Register checked:** D-001. It does not narrow Checkout, but its
  storefront supersession rule prevents importing legacy Organic Editorial
  styling.
- **Candidate Registry checked:** Evidence only. No candidate is promoted or
  granted automatic reuse.

## 2. Narrative and semantic boundary

### Cart → Checkout → confirmation

- **Cart — Transactional Commitment:** The user reviews provisional choices and
  their current goods consequence. Quantity and membership remain cheaply
  reversible. Cart does not create an order, reserve stock, consume a voucher,
  or confirm payment.
- **Checkout — Purchase / Committed:** The user selects the address and payment
  method, may request a voucher preview, and asks the server to create an order.
  Before successful `POST /orders`, the page shows a proposed transaction—not a
  final order. Successful creation snapshots the items/address, reserves stock
  for PayOS or commits it for COD, consumes the voucher, clears the cart, and
  returns an authoritative order.
- **Order/payment confirmation:** A created PayOS order may truthfully be called
  created while its status is `pending_payment`; it may not be called paid.
  Payment success belongs to webhook/reconcile evidence on Checkout Return or
  Order. COD may confirm order placement/processing after `POST /orders`, but it
  must not imply an online payment occurred.

### Permitted and forbidden confirmation

- Checkout may show the latest server-returned Cart, Address, voucher-preview,
  and Order facts with their exact scope.
- Checkout may use `confirmed` on the final order-creation action because Design
  DNA §2 and Component Bible State 4 explicitly permit that moment.
- Before order creation it must not claim: stock reservation, voucher
  consumption, immutable total, created order, successful payment, or paid
  status.
- Payment-session creation proves only that a redirect URL exists. It does not
  prove a payment row, payment capture, or order payment success.
- Unknown shipping method, shipping fee, and tax may not be converted into a
  “final payable” claim.

## 3. Narrative and frame hierarchy

- **First attention target:** The **current commitment truth**: identified items
  and quantities, current server goods consequence, and the explicit semantic
  status of any discount or unavailable fee/tax evidence.
- **Second attention target:** The editable fulfillment facts: selected delivery
  address and selected payment method, visibly distinguished from facts already
  confirmed by a successful order response.
- **Third attention target:** The one final order-creation action. It is strongest
  among actions but must not become the first isolated silhouette mass.
- **What wins in three seconds, and through which two signals?** The commitment
  truth wins through (1) the largest continuous factual mass and (2) the strongest
  structural relationship between item identity, quantity, and monetary
  consequence. The selected fulfillment facts win next through local editability,
  not through equal filled cards.
- **What supports it without becoming a second protagonist?** A compact set of
  selected address/payment statements. Alternatives remain accessible, but the
  page does not render every possible option as an equal visual block at rest.
- **What remains recognizable after copy and logo are removed?** Stable server
  facts, locally bounded editable facts, clearly receding preview values, one
  state-safe commitment action, and errors attached to the exact fact or state
  they invalidate.

### Composition gate

1. **What wins attention?** The exact proposed transaction and consequence—not
   the form title, payment logo, voucher tool, or button.
2. **Through which two signals?** Continuous mass plus strongest relational edge
   and numeric contrast.
3. **What supports it?** Selected fulfillment facts with quieter edit affordances.
4. **Where is the quiet zone?** The **certainty interval** immediately before the
   final action. Its job is to reveal unresolved, unavailable, stale, or pending
   truth and remove persuasion. It is not Cart’s reconsideration interval.
5. **What prevents a 50:50 split?** The transaction-truth field owns more perceived
   mass than the fulfillment editor, and both resolve into one authored sequence.
   No independent sticky summary column is permitted.
6. **What makes it Nestify without branding?** The visual system distinguishes
   proposed, editable, previewed, created, and paid states before it uses visual
   emphasis to request commitment.

## 4. Composition and mass

- **Dominant visual mass:** One coherent pre-submit commitment field containing
  product identity/quantity and current monetary evidence. It is not a replay of
  Cart row anatomy and not a Product Listing field.
- **Counterweight:** Selected fulfillment facts and their reversible edit
  affordances.
- **Visual center of gravity:** The point where selected fulfillment facts resolve
  into the proposed order consequence. It must not sit inside a detached Place
  Order button or sticky summary card.
- **Named quiet zone and its job:** **Certainty interval** — verifies that no fact
  is stale, missing, invalid, or still mutating before the order-creation action.
  It contains no reassurance strip, newsletter, trust badge, promotion, or payment
  logo theatre.
- **Containment / cropping / safe margins:** Transaction facts and errors remain
  inside the viewport at all widths. Product thumbnails may reduce or disappear
  only after product identity, variant, quantity, and line/base consequence remain
  legible. No horizontal scrolling is permitted.
- **Deliberate asymmetry:** Commitment truth > editable fulfillment > final action.
  Alternatives do not receive the same mass as the currently selected fact.
- **Why this is not a default 50:50 split:** The layout is organized by state and
  consequence, not by a form column paired with a commerce-summary column.

## 5. Spatial and image strategy

- **Density level:** Medium and decisive. Density is earned by transaction facts,
  not repeated cards, badges, payment logos, or reassurance rows.
- **Illustration / photography role:** No narrative illustration. Factual product
  thumbnails may support identity at tertiary weight; they may not imply fit,
  scale, or room evidence.
- **Line strategy:** Visual Grammar §5. Define a Checkout base structural edge
  `S`; the commitment boundary uses `S`, editable controls use approximately
  `0.70–0.85 × S`, and receding preview/support relationships use approximately
  `0.45–0.60 × S` or equivalent contrast. Do not outline every option, input,
  summary, and error uniformly.
- **Depth strategy:** Shallow factual depth. Use grouping, value separation, and
  edge recession only. No floating summary elevation, decorative room, glow, or
  pseudo-spatial card stack.
- **Light role:** Functional neutral readability only. Checkout has no narrative
  light gesture and does not earn Future Home warmth as atmosphere.
- **Negative-space purpose:** Separate stable server evidence from editable facts,
  and hold the certainty interval before commitment. No unnamed blank band.

## 6. Real contract and transaction-truth boundaries

| Fact | Pre-submit authority | After `POST /orders` | Required visual language |
|---|---|---|---|
| Cart items / variant / quantity | Latest `GET /cart`; mutable and potentially stale | Immutable `OrderItemResource.variant_snapshot`, quantity, unit price, subtotal | “Current cart” before creation; “created order” only after response |
| Cart goods total | Server-derived from `unit_price_snapshot × quantity` | `OrderResource.subtotal` | Server-backed current goods consequence, not automatically final payable |
| Voucher | `POST /cart/apply-voucher` preview only | Recomputed and atomically consumed during order creation; response gives discount/total | Always label preview before creation; clear when code/cart changes |
| Address records | Server-confirmed saved addresses | Selected address is snapshotted into `shipping_address` | Record is known; selection is editable until order creation succeeds |
| Payment method | Frontend selection: `payos` or `cod` | Validated and stored on Order | Proposed before creation; confirmed order fact after response |
| Shipping method | Unavailable | Unavailable | Do not invent or imply selection |
| Shipping fee | Unavailable | No field in OrderResource | Do not claim inclusion or finality |
| Tax | Unavailable | No field in OrderResource | Do not invent zero, inclusion, or exemption |
| Stock | `available_stock` observation from current variant payload | Atomic reservation at order create; COD then commits immediately | “Observed/current” before creation; never “reserved” before success |
| Payable total | Cart total and voucher endpoint provide pre-submit evidence only | `OrderResource.total` is authoritative for the created order’s implemented contract | “Preview/current consequence” before; created-order total after |
| Payment session | None | URL/gateway/expiry after separate request | Proves a session link only—not payment |
| Payment status | Unavailable on Checkout before creation | PayOS starts `pending_payment`; COD starts `processing` | Paid/success only from webhook/reconcile-backed status |
| Customer eligibility | FE ProtectedRoute + verified user; frontend `isStaff` | Backend `verified` middleware + `OrderService::create` staff gate | No commitment action for guest, unverified, or staff |

## 7. Failure, pending, and reversibility behavior

- **Loading:** Do not show Place Order until Cart and Address queries both have
  usable data. Preserve the intended transaction/evidence structure rather than
  a lone centered spinner.
- **Empty Cart:** State that no order can be created and return to Cart. Do not
  render a generic celebratory or decorative card.
- **Stale prerequisite:** Cached facts may remain visible, but commitment is
  blocked and the stale source is named. Any voucher preview whose cart basis
  changed becomes non-authoritative immediately.
- **Address create/edit:** Keep the last server-confirmed address visible until
  mutation succeeds. Errors attach to the modal field/state they invalidate.
- **Order creation pending:** Freeze every payload-coupled control—address,
  payment method, voucher, add/edit address, and final action. Display the exact
  submitted snapshot as pending; do not allow new visible selections to coexist
  with the old in-flight payload.
- **Order creation uncertainty:** Preserve the idempotency key and submitted
  payload. State that creation is unknown, not failed, until resolved. A retry of
  the same payload is safe; a materially changed payload requires an explicit new
  intent rather than silent reuse of the old key.
- **Duplicate key:** If the server returns an existing order ID, replace the
  mutable Checkout form with recovery attached to that order.
- **Stock conflict:** Keep the last confirmed cart facts, name the affected item
  when supported, block commitment, and route revision back to Cart.
- **Voucher failure:** Remove preview authority and attach the error to the voucher
  field. Never leave an old “final” amount visible.
- **Order created / PayOS session pending:** Replace the mutable form with the
  created-order state before opening PayOS. No second order-creation action remains.
- **Payment initialization failure:** Keep the created order authoritative and
  retry only the session. Persist or route the created order identity so refresh
  and back navigation cannot collapse recovery into an empty Cart state.
- **Payment failure:** Do not call the order failed or cancelled unless the order
  endpoint says so. Route recovery to the existing order.
- **COD success:** Confirm order placement/processing after server response; do
  not claim online payment.
- **Reversibility:** Before creation, address/payment/voucher and return-to-Cart
  remain reversible. After creation, reversal belongs to the existing order’s
  supported cancellation lifecycle, not to recreating Checkout.

## 8. Responsive and anti-AI intent

| Width context | First target | What recedes or changes | Evidence to capture |
|---|---|---|---|
| Wide — 1440 | Current transaction truth and consequence | Alternatives remain compact; no sticky summary card or isolated action | Normal, grayscale, silhouette/no-copy, voucher preview, pending/failure |
| Desktop — 1024 | Same truth field, with fulfillment facts still visibly editable | Reduce lateral spread before changing sequence | Normal plus any material layout change |
| Intermediate — 768 | Transaction truth → selected address/payment → certainty interval → action | Re-author field relationships; do not mechanically stack form then summary | Normal, stale/stock, pending |
| Narrow — 390 | Identified order/quantity and current consequence first | Reduce thumbnails and alternative exposure; preserve selected facts, errors, and action | Normal, grayscale, silhouette, long value, failure/boundary states |

- **Required narrow sequence:** identified items/quantities and base consequence →
  selected address → selected payment method → requested voucher preview, if any →
  unresolved/stale disclosure → certainty interval → Place Order.
- **Forbidden visual pattern:** Generic form-left + sticky rounded summary card,
  repeated rounded option slabs, followed by an oversized dark/confirmed Place
  Order rectangle as the isolated primary mass.
- **AI smells considered:** Arbitrary floating card, repeated rounded rectangles,
  uniform container outlines, 50:50 or generic two-column commerce anatomy,
  whitespace without a state job, icon/label reassurance rows. No exception is
  granted merely because Checkout is familiar ecommerce territory.
- **Accessibility / boundary treatment:** Radio and edit semantics remain explicit;
  every pending/error state is announced and visible without color; focus moves to
  the invalid fact; no horizontal overflow; action names the commitment it creates;
  guest/unverified/staff boundaries expose no false eligibility.

## 9. Candidate-pattern decision record

| Candidate | Decision | Evidence | Failure boundary |
|---|---|---|---|
| Discover Product Identity Anatomy | **reject** | Discover withholds price and supports browsing; Checkout requires continuous quantity and monetary truth. | Would hide or subordinate transaction facts. |
| Held-Attention Interaction | **reject** | Checkout facts are already selected and cannot depend on temporary attention. | Hover/focus disclosure would weaken commitment truth. |
| Discovery Lens | **reject** | Checkout does not narrow possibilities. | Filter-style progressive disclosure misstates the task. |
| Known-vs-Unknown Evidence Disclosure | **adapt** | Semantic honesty applies to unavailable shipping/tax and preview-vs-created totals. No ProductEvidencePanel visual implementation is imported. | Must not turn Checkout into a product-spec inventory or imply missing fees. |
| Planner Handoff | **reject** | Checkout advances Purchase; it must not reopen Experiment. | Would break State 4 and create a competing action. |
| Quiet Uppercase Label | **reject** | No label treatment is required to establish Checkout authority. | Repetition would create generic form chrome. |
| Quiet Section Boundary | **adapt** | A state boundary before final commitment is canonically required by Visual Grammar §10. The candidate’s Product Detail values are not reused. | Must not become Cart’s reconsideration interval or a reusable decorative rule. |

No candidate is promoted by this record.

## 10. Review handoff

- **Expected implementation evidence:** Normal 1440 / 1024 / 768 / 390;
  grayscale, silhouette, and no-copy at wide/narrow; loading; empty; stale Cart;
  no address; address mutation pending/failure; stock conflict; order creation
  pending/uncertain/duplicate; valid and invalidated voucher preview; PayOS session
  pending/failure; COD transition; unverified and staff boundaries; refresh/back
  recovery after order creation.
- **Current implementation evidence reviewed:**
  `/tmp/nestify-checkout/current-audit/`.
- **Open contract ambiguity before implementation:** The API has no shipping
  method, shipping fee, or tax fields, while existing cross-surface copy implies
  shipping may be determined at Checkout. Until product/backend authority resolves
  whether this is a zero-fee policy or a missing contract, the UI must not label a
  pre-submit amount “final payable” or claim that shipping/tax are included.
- **Direction status:** Direction 3 — The Editable Declaration approved.

## 11. Implementation calibration notes — 2026-07-13

- The declaration renders transaction evidence before editable fulfillment
  clauses in both visual and DOM order. Address and payment alternatives appear
  only after an explicit change request.
- Order creation snapshots the visible address, payment method, voucher request,
  Cart lines, and current consequences. The snapshot remains the visible pending
  authority and freezes every payload-coupled control.
- A network-uncertain order attempt preserves the submitted declaration and the
  idempotency key. Revising it requires an explicit new-intent action that rotates
  the key.
- Voucher previews are bound to a Cart fingerprint containing line membership,
  variant, quantity, unit snapshot, line consequence, and goods total. Any basis
  change invalidates the preview.
- Successful order creation persists only the Order ID in session storage. The
  existing Order API rehydrates authoritative order facts after refresh; Cart
  empty state cannot replace a recoverable created Order.
- PayOS session failure remains attached to the created Order and retries only
  session initialization. COD creation renders the returned Order state without
  an online-payment claim.
- The global newsletter is suppressed only on `/checkout` and
  `/checkout/return`, preserving the certainty/recovery interval without a global
  footer redesign.
