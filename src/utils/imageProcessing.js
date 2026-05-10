// Client-side background removal + the predicate that gates which variants
// can survive it. See docs/adr/0001-client-side-bg-removal.md.

// True iff `variant`'s images can be safely run through `processImage`.
// Glossy finishes have specular highlights that the alpha-key reads as
// background, so we restrict to matte until the pipeline improves.
export function isClientProcessable(product, variant) {
  if (!product?.options || !variant) return false;
  return product.options.some((opt, i) => {
    const value = opt.values?.find((v) => v.id === variant.options[i]);
    return value && /matte/i.test(value.title);
  });
}

// Alpha-key thresholds, tuned against min(R,G,B) — a pixel's "whiteness floor".
// Above OPAQUE_MAX the pixel is treated as background and erased; below
// OPAQUE_MIN it's left fully opaque; in between, alpha ramps down linearly.
const OPAQUE_MAX = 220;
const OPAQUE_MIN = 120;
const RAMP = OPAQUE_MAX - OPAQUE_MIN;

// White-balance-keyed alpha removal. Resolves to a data URL on success, or to
// the original `url` on CORS taint / load failure (so callers can render
// something instead of breaking).
export function removeBackground(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    loadImage(url)
      .then((img) => resolve(keyOutWhite(img)))
      .catch(() => resolve(url));
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function keyOutWhite(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const whiteness = Math.min(r, g, b);

    if (whiteness >= OPAQUE_MAX) {
      data[i + 3] = 0;
    } else if (whiteness > OPAQUE_MIN) {
      const keepRatio = (OPAQUE_MAX - whiteness) / RAMP;
      data[i + 3] = (data[i + 3] * keepRatio) | 0;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

// Reactive-friendly cache + dedup wrapper. Mutates `cache` (a plain object ref
// or reactive map) in place and skips in-flight URLs.
export function processImageInto(cache, inFlight, url, assign) {
  if (!url || cache[url] || inFlight.has(url)) return;
  inFlight.add(url);
  removeBackground(url).then((result) => {
    assign(url, result);
    inFlight.delete(url);
  });
}
