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

// --- Product details: phone selector + stock resolution -------------------
//
// The phone selector is the option with `type === 'size'` (Printify models the
// 40+ phone models as the "size" axis). Everything else (surface, etc.) stays a
// plain select. Value ids are Numbers; callers coercing from the URL must Number()
// the `?phone=` query first.

export function phoneOption(product) {
  return product?.options?.find((o) => o.type === 'size') ?? null;
}

const MANUFACTURERS = ['iPhone', 'Samsung', 'Google Pixel', 'Other'];

export function manufacturerOf(title = '') {
  if (title.startsWith('iPhone')) return 'iPhone';
  if (title.startsWith('Samsung')) return 'Samsung';
  if (title.startsWith('Google Pixel') || title.startsWith('Pixel')) return 'Google Pixel';
  return 'Other';
}

// Group phone option values by manufacturer, in MANUFACTURERS order, preserving
// Printify's original order within each group. Empty groups are dropped.
export function groupPhoneValues(values = []) {
  const buckets = new Map(MANUFACTURERS.map((m) => [m, []]));
  for (const value of values) {
    buckets.get(manufacturerOf(value.title)).push(value);
  }
  return MANUFACTURERS
    .map((manufacturer) => ({ manufacturer, values: buckets.get(manufacturer) }))
    .filter((group) => group.values.length > 0);
}

// Size-value ids that appear in at least one enabled variant. Used to grey out
// phone models with zero enabled variants for this product.
export function enabledPhoneValueIds(product) {
  const opt = phoneOption(product);
  if (!opt) return new Set();
  const sizeIdx = product.options.indexOf(opt);
  const ids = new Set();
  for (const v of enabledVariants(product)) {
    ids.add(v.options[sizeIdx]);
  }
  return ids;
}

// The variant whose options match `selectedOptions` (keyed by option NAME → value
// id) exactly. Returns it regardless of is_enabled — the caller inspects
// `.is_enabled` to detect a dead combo. Null if no variant matches.
export function resolveVariant(product, selectedOptions) {
  if (!product?.options || !product?.variants) return null;
  return (
    product.variants.find((variant) =>
      product.options.every((opt, i) => variant.options[i] === selectedOptions[opt.name]),
    ) ?? null
  );
}

// Among enabled variants for the given phone (size) value, the is_default one,
// else the first, else null.
export function defaultEnabledVariantForPhone(product, phoneValueId) {
  const opt = phoneOption(product);
  if (!opt) return null;
  const sizeIdx = product.options.indexOf(opt);
  const forPhone = enabledVariants(product).filter((v) => v.options[sizeIdx] === phoneValueId);
  return forPhone.find((v) => v.is_default) ?? forPhone[0] ?? null;
}
