# ADR 0001: Client-side background removal limits catalog to matte variants

Status: Accepted
Date: 2026-05-10

## Context

Product images served by the API are raw photographs on a near-white background.
The catalog and details views render them on a dark theme, so a transparent
background is required.

The client performs background removal at render time in `processImage`
(`src/utils/imageProcessing.js`): it draws the image to a canvas, walks the pixel
buffer, and uses the per-pixel minimum channel as an alpha key (pixels at >=255
become transparent; pixels >230 fade out).

This algorithm only produces correct output for **matte** finishes. Glossy
variants contain bright specular highlights that the alpha key reads as
background, punching holes through the case.

## Decision

Until the image pipeline can deliver pre-cut transparent PNGs (or a more robust
alpha-keying algorithm lands), the catalog displays only variants whose option
values match a "matte" predicate.

The predicate lives next to the algorithm it constrains, exported as
`isClientProcessable(product, variant)` from `src/utils/imageProcessing.js`.
The Variant domain module accepts it as an injected predicate; it is not part
of the domain.

## Consequences

- Catalog cards always show a matte variant when one exists; products with no
  matte variant fall back to all enabled variants.
- The `/matte/i` regex is a pipeline workaround, not a brand rule. Renaming or
  generalising the predicate is fine; deleting it without fixing the pipeline
  will reintroduce transparent glossy cases.
- When the API serves transparent PNGs, delete `processImage`,
  `isClientProcessable`, and the predicate argument to `cardSummary`. The
  Variant module needs no changes.

## Alternatives considered

- **Server-side background removal.** Correct long-term fix; deferred until
  someone owns the asset pipeline.
- **Better alpha-keying (e.g. chroma key, learned matte).** More work than the
  matte filter; only worth it if catalog must show glossy.
- **Drop background removal, ship images as-is on white cards.** Rejected:
  conflicts with the dark theme.
