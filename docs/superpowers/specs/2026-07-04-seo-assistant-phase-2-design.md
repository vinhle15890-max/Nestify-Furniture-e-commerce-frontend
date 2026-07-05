# SEO Assistant — Phase 2 (tone + multiple variations)

Date: 2026-07-04
Status: Approved (design), implementing. Builds on Phase 0+1
(`2026-07-04-seo-assistant-phase-0-1-design.md`). Provider: Vertex/Gemini `gemini-2.5-flash`.

## Goal

Two additions to the "Mô tả & SEO" panel:
1. **Tone** selector — pick the writing voice before generating (applies to every AI call).
2. **Variations** — the full "Gợi ý bằng AI" produces **2 drafts**; admin previews and picks
   one (or regenerates).

## Backend

### `GenerateProductDescriptionRequest`
Add (both optional, backward compatible):
- `tone` → `nullable, in:sang_trong,than_thien,toi_gian` (default `sang_trong`).
- `count` → `nullable, integer, min:1, max:3` (default `1`).

### `ProductDescriptionGenerator`
- `systemInstruction($field, $tone)` gains a tone line from a fixed map:
  - `sang_trong` → "Giọng văn sang trọng, cao cấp, tinh tế."
  - `than_thien` → "Giọng văn thân thiện, gần gũi, ấm áp."
  - `toi_gian` → "Giọng văn tối giản, rõ ràng, đi thẳng vào giá trị."
- `generate($input, $field)` reads `$input['tone']` → tone applied to single drafts + per-field.
- New `generateVariations(array $input, int $count): array`:
  - Full-draft (`field=all`) only; `count` clamped to 2..3.
  - One request, `responseSchema` = OBJECT `{ drafts: ARRAY<draftObject> }` (draftObject =
    the 4 SEO fields, all required). `temperature=0.9` for variety, `maxOutputTokens=8192`,
    thinking off.
  - Parse: `data.drafts` must be a non-empty array with `drafts[0].description`; else
    malformed → `AiServiceUnavailableException`. Returns `['drafts' => [normalized…]]`
    (each normalized via existing `normalize($d, 'all', $keyword)`, capped to `count`).

### Controller
```
$count = (int) ($data['count'] ?? 1);
if ($count > 1) return data => generator->generateVariations($data, $count);
return data => generator->generate($data, $data['field'] ?? 'all');
```
Endpoint unchanged: `POST /api/admin/products/ai/description`.
Response: `count>1` → `{ data: { drafts: [ {description,meta_title,meta_description,focus_keyword}, … ] } }`;
`count=1` → single-object shape (unchanged).

## Frontend

### `DescriptionSeoFields.jsx`
New props: `tone`, `onToneChange`, `variations` (array|null), `onApplyDraft(draft)`,
`onCloseVariations`, `onRegenerate`, `isGeneratingVariations`.
- **Tone segmented control** in the panel header (Sang trọng / Thân thiện / Tối giản),
  disabled while generating.
- The top "Gợi ý bằng AI" button now triggers the variations flow (page requests `count=2`).
- **Variations modal** (`Modal`): lists each draft — meta title + a plain-text description
  excerpt + Google-style snippet — with a "Dùng bản này" button per draft; a "Tạo lại"
  button footer. Picking → `onApplyDraft(draft)` + close.
- Per-field buttons unchanged except they include `tone`.

### Wiring — Create + Edit pages
- New state: `tone` (default `'sang_trong'`), `variations` (default `null`).
- `handleGenerateDescription`: `mutateAsync({ ...base, tone, count: 2 })` → `setVariations(data.drafts)`.
- `applyDraft(draft)`: `setValue` all 4 fields, `setVariations(null)`.
- `handleGenerateField(field)`: adds `tone` to payload (count defaults 1).
- Reuse `generateDescription.isPending` for `isGeneratingVariations`.

## Testing

Backend (`ProductSeoTest`):
- `count=2` returns `data.drafts` of length 2 (ARRAY schema faked); each has the 4 fields.
- `tone=than_thien` appears in the request `systemInstruction`.
- `count=1` (default) keeps the single-object shape (existing tests stay green).
- invalid `tone` → 422.

Frontend:
- `DescriptionSeoFields`/page: full generate opens modal with 2 options; "Dùng bản này"
  fills all fields; tone selector value is sent in the payload.

## Out of scope
Per-field variations; saving/history of variations; tone persistence across sessions.
