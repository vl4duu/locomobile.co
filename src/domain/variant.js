// Pure helpers over the Product/Variant/Option/Image schema.
// No Vue, no fetch, no DOM. The interface is the test surface.
//
// Schema assumed:
//   product.options:  [{ name, type, values: [{ id, title }] }]
//   product.variants: [{ id, options: [valueId, ...], price, is_enabled, is_default }]
//   product.images:   [{ src, variant_ids: [id, ...], is_default }]

const enabledVariants = (product) =>
  product?.variants?.filter((v) => v.is_enabled) ?? [];

// Printify mockup URLs encode the camera angle as `?camera_label=<label>`.
// Angled views read as more product-like in a catalog tile than flat front
// shots, so we rank candidates by angle before falling back to is_default.
const CAMERA_PREFERENCE = [
  'front-and-side-left',
  'front-and-side-right',
  'front',
];

function cameraLabel(src) {
  const i = src?.indexOf('camera_label=');
  if (i == null || i < 0) return null;
  const tail = src.slice(i + 'camera_label='.length);
  const end = tail.search(/[&#]/);
  return end < 0 ? tail : tail.slice(0, end);
}

function cameraScore(src) {
  const label = cameraLabel(src);
  const idx = CAMERA_PREFERENCE.indexOf(label);
  return idx < 0 ? -1 : CAMERA_PREFERENCE.length - idx;
}

function pickPreferredImage(images) {
  if (!images?.length) return null;
  let best = images[0];
  let bestScore = cameraScore(best.src) * 2 + (best.is_default ? 1 : 0);
  for (let i = 1; i < images.length; i++) {
    const img = images[i];
    const score = cameraScore(img.src) * 2 + (img.is_default ? 1 : 0);
    if (score > bestScore) {
      best = img;
      bestScore = score;
    }
  }
  return best;
}

// Card summary for a catalog tile.
// `predicate(product, variant) -> boolean` narrows which variants represent the
// card (e.g. `isClientProcessable` — see ADR-0001). Pass `() => true` to skip.
export function cardSummary(product, predicate = () => true) {
  const enabled = enabledVariants(product);
  if (!enabled.length) return null;

  const filtered = enabled.filter((v) => predicate(product, v));
  const variants = filtered.length ? filtered : enabled;

  const variantIds = new Set(variants.map((v) => v.id));
  const candidateImages =
    product.images?.filter((img) =>
      img.variant_ids?.some((id) => variantIds.has(id)),
    ) ?? [];

  const image =
    pickPreferredImage(candidateImages)?.src ??
    pickPreferredImage(product.images)?.src ??
    null;

  const fromPriceCents = Math.min(...variants.map((v) => v.price));

  return { image, fromPriceCents, variants };
}
