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
  const ids = new Set();
  for (const v of enabledVariants(product)) {
    const id = variantValueFor(opt, v);
    if (id != null) ids.add(id);
  }
  return ids;
}

// IMPORTANT: a variant's `options` array is NOT guaranteed to be in the same
// order as `product.options` (observed: a hoodie lists options [color, size] but
// its variants list [sizeId, colorId]). Value ids are globally unique within a
// product, so we match by id MEMBERSHIP (`variant.options.includes(id)`) rather
// than by position. Never index variant.options by the product.options index.

// The single value id within `variant.options` that belongs to `option`.
export function variantValueFor(option, variant) {
  if (!option || !variant?.options) return undefined;
  const ids = new Set(option.values.map((v) => v.id));
  return variant.options.find((id) => ids.has(id));
}

// Reconstruct a { optionName: valueId } map from a variant (order-independent).
export function optionsFromVariant(product, variant) {
  const sel = {};
  if (!product?.options || !variant) return sel;
  for (const opt of product.options) {
    const id = variantValueFor(opt, variant);
    if (id != null) sel[opt.name] = id;
  }
  return sel;
}

// The variant matching `selectedOptions` (keyed by option NAME → value id) on
// every axis. Returns it regardless of is_enabled — the caller inspects
// `.is_enabled` to detect a dead combo. Null unless every option is selected
// and present in the variant.
export function resolveVariant(product, selectedOptions) {
  if (!product?.options || !product?.variants) return null;
  return (
    product.variants.find((variant) =>
      product.options.every((opt) => {
        const sel = selectedOptions[opt.name];
        return sel != null && variant.options.includes(sel);
      }),
    ) ?? null
  );
}

// Among enabled variants containing the given primary (size) value, the
// is_default one, else the first, else null.
export function defaultEnabledVariantForPhone(product, primaryValueId) {
  const forPrimary = enabledVariants(product).filter((v) => v.options.includes(primaryValueId));
  return forPrimary.find((v) => v.is_default) ?? forPrimary[0] ?? null;
}

// --- Generic (product-agnostic) details helpers ----------------------------
// The component must work for any product, not just phone cases: a hoodie has
// sizes, not models. These helpers reason over arbitrary options.

// The "primary" axis the customer must consciously choose and which starts
// unpicked on the details page (phone model, shirt size, ...). We treat the
// size-type option as primary. Null if the product has no size option.
export function primaryOption(product) {
  return phoneOption(product);
}

// Render the size option as a manufacturer-grouped picker only when its values
// actually look like phones (≥2 distinct manufacturers). Hoodie sizes (S/M/L)
// all fall under "Other" → plain select.
export function isPhoneModelOption(option) {
  if (!option || option.type !== 'size') return false;
  const real = groupPhoneValues(option.values).filter((g) => g.manufacturer !== 'Other');
  return real.length >= 2;
}

// Value ids for `optionName` that have ≥1 enabled variant consistent with the
// OTHER currently-selected options. Pass {} to ignore the other axes (the global
// in-stock set) — used for the primary axis so secondary picks never grey it out.
export function availableValueIds(product, optionName, selectedOptions = {}) {
  if (!product?.options) return new Set();
  const target = product.options.find((o) => o.name === optionName);
  if (!target) return new Set();
  const ids = new Set();
  for (const v of enabledVariants(product)) {
    const otherAxesMatch = product.options.every((opt) => {
      if (opt.name === optionName) return true;
      const sel = selectedOptions[opt.name];
      return sel == null || v.options.includes(sel);
    });
    if (!otherAxesMatch) continue;
    const tv = variantValueFor(target, v);
    if (tv != null) ids.add(tv);
  }
  return ids;
}

// Options that should be hidden from the UI and silently defaulted. Gift
// packaging is a paid add-on we don't offer at checkout — default to "without".
export function isHiddenOption(option) {
  return /gift|packag/i.test(option?.name ?? '');
}

// The value id a hidden option defaults to: the "without/none" choice if present
// (e.g. "Without gift packaging"), else the variants' default, else first value.
export function defaultHiddenValueId(product, option) {
  if (!option?.values?.length) return undefined;
  const none = option.values.find((v) => /without|^no\b|none|^no /i.test(v.title ?? ''));
  if (none) return none.id;
  const def = defaultVariantValue(product, option);
  return def ?? option.values[0].id;
}

function defaultVariantValue(product, option) {
  const dv =
    enabledVariants(product).find((v) => v.is_default) ?? enabledVariants(product)[0];
  return dv ? variantValueFor(option, dv) : undefined;
}

// Best enabled variant to represent the current (possibly partial) selection for
// IMAGE display. Printify only attaches mockups to SOME variants, so we must
// prefer a matching variant that actually HAS an image:
//   1. exact match on all defined options, preferring one with an image;
//   2. if that combo has no image, relax to the primary axis alone (same phone)
//      and take an imaged variant there — so changing a surface with no distinct
//      mockup keeps showing the right phone instead of dumping all images;
//   3. finally fall back to the product default.
// Always returns an ENABLED variant. (Distinct from resolveVariant's exact match.)
export function imageVariant(product, selectedOptions = {}) {
  const enabled = enabledVariants(product);
  if (!enabled.length || !product?.options) return null;

  const withImage = new Set();
  for (const im of product.images ?? []) {
    for (const id of im.variant_ids ?? []) withImage.add(id);
  }

  const matchOn = (names) =>
    enabled.filter((v) =>
      product.options.every((opt) => {
        if (!names.has(opt.name)) return true;
        const sel = selectedOptions[opt.name];
        return sel == null || v.options.includes(sel);
      }),
    );
  const pickImaged = (pool) => {
    if (!pool.length) return null;
    const imaged = pool.filter((v) => withImage.has(v.id));
    const from = imaged.length ? imaged : pool;
    return from.find((v) => v.is_default) ?? from[0];
  };

  let chosen = pickImaged(matchOn(new Set(product.options.map((o) => o.name))));

  // Exact combo has no mockup → reuse an imaged variant for the same primary value.
  const primary = primaryOption(product);
  if ((!chosen || !withImage.has(chosen.id)) && primary && selectedOptions[primary.name] != null) {
    const relaxed = pickImaged(matchOn(new Set([primary.name])));
    if (relaxed && withImage.has(relaxed.id)) chosen = relaxed;
  }

  return chosen ?? pickImaged(enabled);
}
