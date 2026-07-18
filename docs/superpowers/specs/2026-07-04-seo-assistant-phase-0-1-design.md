# SEO Assistant — Phase 0 + 1 (per-field AI + live SEO score)

Date: 2026-07-04
Status: Approved (design), implementing.

## Goal

Upgrade the admin "Mô tả & SEO" panel from a single *generate-everything* button into an
SEO assistant: **per-field AI suggestions** (title / meta description on their own) plus a
**real-time SEO score** that updates as the admin types. Keeps the existing all-at-once
button. Foundation for later phases (variations+tone, from-image, bulk).

Provider stays Google Vertex / Gemini (`gemini-2.5-flash`). Thinking already disabled +
robust JSON parse (prior fix) — this spec builds on that.

## Scope

In:
- Phase 0: refactor `ProductDescriptionGenerator` to generate **one field** or **all**.
- Phase 1a: per-field "Gợi ý" buttons for `meta_title` and `meta_description`.
- Phase 1b: client-side, deterministic **SEO score** (no AI call).

Out (deferred): AI related-keyword suggestions, variations/tone, from-image, bulk.

## Backend

### `ProductDescriptionGenerator::generate(array $input, string $field = 'all')`
- `field ∈ {all, description, meta_title, meta_description}`; unknown → `all`.
- `all` → unchanged behaviour, returns all 4 fields.
- Single field → focused system instruction + `responseSchema` with only that property;
  returns an array with only that key.
- `$input` may include `description` (current draft, HTML). For single-field generation it
  is added to the facts as plain-text context so title/meta track the real content.
- `generationConfig` unchanged from the fix: `thinkingBudget=0`, `maxOutputTokens=4096`,
  `responseMimeType=application/json`, dynamic `responseSchema`.
- Failure/parse handling unchanged (`decodeJson`, malformed → `AiServiceUnavailableException`).

Helpers: `buildFacts($input)`, `systemInstruction($field)`, `responseSchema($field)`,
`normalize($data, $field, $keyword)`.

### `GenerateProductDescriptionRequest`
Add rules (backward compatible — both optional):
- `field` → `nullable`, `in:all,description,meta_title,meta_description`.
- `description` → `nullable`, `string` (context for single-field).

### Controller
`ProductAiController::generate` passes `$data['field'] ?? 'all'` into the generator.
Endpoint unchanged: `POST /api/admin/products/ai/description`.

## Frontend

### `src/lib/seoScore.js` (pure, tested)
`computeSeoScore({ metaTitle, metaDescription, description, focusKeyword })` →
`{ score: 0..100, checks: [{ id, label, status: 'pass'|'warn'|'fail', hint }] }`.

Checks (each weighted, summed to 100):
- meta title length 50–60 (warn 30–70, fail otherwise)
- meta description length 140–160 (warn 100–180, fail otherwise)
- focus keyword present in meta title
- focus keyword present in meta description
- focus keyword present in first `<p>` of description
- description has ≥1 `<h2>` and ≥1 `<ul>`

No focus keyword → keyword checks are `warn` ("Chưa đặt từ khóa chính"), not fail.
HTML parsed by stripping tags for text checks; structural checks via simple regex.

### `DescriptionSeoFields.jsx`
- New props: `onGenerateField(field)`, `generatingField` (string | null).
- Small Sparkles "Gợi ý" button beside the *Tiêu đề SEO* and *Mô tả SEO* labels; disabled
  while its own field or the all-generate is running.
- Existing top "Gợi ý bằng AI" button (`field=all`) kept.
- SEO score panel under the Google snippet preview: numeric score + colored bar + checklist
  from `computeSeoScore`, recomputed from watched form values.

### Wiring — `AdminProductCreatePage` / `AdminProductEditPage`
- `handleGenerateField(field)`: calls `generateDescription.mutateAsync({ name, category,
  keyword, attributes, description: watch('description'), field })`, then `setValue(field, …)`
  for the returned key only. Toast on success/error.
- `generatingField` state so only the clicked field shows a spinner.
- Payload passes `field`/`description` through the unchanged api/hook.

## Testing

Backend (`tests/Feature/Admin/ProductSeoTest.php`):
- `field=meta_title` returns only `meta_title`; request schema has single property.
- invalid `field` → 422 validation.
- existing tests stay green (default `all`).

Frontend:
- `src/lib/seoScore.test.js`: thresholds (ideal title/meta, keyword presence, structure,
  no-keyword warn, empty input).
- `DescriptionSeoFields` / page tests: per-field button calls `generateDescription` with the
  right `field` and only sets that field; score panel renders.

## Non-goals / risks
- Score is heuristic guidance, not a guarantee of ranking.
- Per-field generation is interactive (one call/click) → no quota concern (unlike future bulk).
