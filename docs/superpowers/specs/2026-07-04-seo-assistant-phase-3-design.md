# SEO Assistant — Phase 3 (draft from product images)

Date: 2026-07-04
Status: Approved (design), implementing. Builds on Phase 0-2. Provider: Vertex/Gemini
`gemini-2.5-flash` (multimodal).

## Goal

Let the admin generate an SEO draft that is grounded in the product's actual photos, so the
model describes real material / colour / style instead of guessing from the name.

## Backend

### `GenerateProductDescriptionRequest`
Add: `image_urls` → `nullable, array, max:4` · `image_urls.*` → `url`.

### `ProductDescriptionGenerator`
- New helper `imageParts(array $urls): array`:
  - Takes up to 4 URLs; **https only** (SSRF guard — non-https skipped).
  - Cloudinary URLs are downsized via a `c_limit,w_768,q_auto` transform to cap payload/cost.
  - Fetches bytes (`Http::timeout(10)`), skips on failure or non-`image/*` content-type,
    returns Gemini `{ inlineData: { mimeType, data(base64) } }` parts. Fetch failures logged
    at `warning`, never fatal.
- New helper `composeRequest($input, $instruction)`: builds the `contents` user message =
  text facts + image parts; when images are present, appends an instruction line telling the
  model to describe **from the images** and not invent unseen details.
- `generate()` and `generateVariations()` both route through `composeRequest` → images work
  with single-field, full-draft, tone, and variations.

### Controller / endpoint
Unchanged (`POST /api/admin/products/ai/description`); `image_urls` flows through
`$request->validated()`. Combines with `tone` + `count`.

## Frontend

### `DescriptionSeoFields.jsx`
New prop `onGenerateFromImages` — when provided, render a second header button
**"Gợi ý từ ảnh"** (Image icon) next to "Gợi ý bằng AI"; disabled while any generation runs.

### Edit page only (`AdminProductEditPage`)
- `imageUrls = product.media.filter(m => m.type === 'image').map(m => m.url)`.
- Pass `onGenerateFromImages={handleGenerateFromImages}` only when `imageUrls.length > 0`
  (button hidden otherwise / on the Create page, which has no media yet).
- `handleGenerateFromImages`: `mutateAsync({ ...base, tone, count: 2, image_urls: imageUrls })`
  → `setVariations(data.drafts)` — reuses the Phase 2 variations modal (no new UI).

## Testing

Backend (`ProductSeoTest`, Gemini + image host faked):
- `image_urls` present → the `generateContent` request `contents[0].parts` contains an
  `inlineData` image part.
- non-https URL → not fetched, no image part.
- `image_urls` with >4 entries → 422 validation.

Frontend (`AdminProductEditPage`):
- product with image media shows "Gợi ý từ ảnh"; clicking calls the API with `image_urls`
  and opens the variations modal.

## Out of scope
Per-image selection UI (all product images used, capped at 4); analysing ad-hoc uploads
outside product media; from-image on the Create page (no media yet).
