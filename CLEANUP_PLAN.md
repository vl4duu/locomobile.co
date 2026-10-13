# Codebase Cleanup Plan

Goal: make this codebase **less stinky** — easier for Claude Code (and humans) to
reason about, with high-value performance wins folded in. Reduce fluff, keep the
"why", cut the "what". Behaviour-preserving unless a step is explicitly a fix.

Locked decisions from the planning interview:

| # | Decision |
|---|----------|
| Q1 | Reduce code smells; keep comments that explain *why*, delete comments that restate *what*. |
| Q2 | **Frontend first.** Write a Vitest suite for `variant.js` *before* any cleanup touches it. |
| Q3 | "Moderate" extraction: `src/api.js`, `useAsyncData`, `useProductSelection(product)`, `useNoiseBackground()`. |
| Q4 | Fold in high-value performance wins (the 42 MB GLTF + Safari lag). |
| Q5 | Do **not** replace the 3D hero with pre-rendered video — the live feel must survive. |
| Q6/Q7 | Keep Three.js live render. Fix lag by cutting per-frame work: **bake lighting/shadows**, disable runtime shadow maps, compress the asset, cap pixel-ratio/fps. TresJS optional, last, for readability only. |

Constraint surfaced during planning: the catalog is **semi-transparent**
(`rgba(0,0,0,0.65)` + mask) over a `position: fixed` canvas, so the 3D scene is
visible *through* it the whole scroll. The render loop can **not** be paused when
the catalog scrolls over it. Baking is therefore the primary lever, not gating.

Asset source: the original **Blender project exists**, so re-baking + re-export is
viable (not a bake-from-GLTF hack).

---

## Phase 0 — Safety net (do first, no behaviour change)

Tests are the contract that lets every later phase be verified instead of hoped.

- **0.1 Vitest suite for `src/domain/variant.js`.** It's the most refactor-prone,
  highest-leverage pure module and has zero tests today. Cover, against fixtures
  built from the *live* shapes (phone case, hoodie, socks):
  - `variantValueFor` / `optionsFromVariant` — **order-independent** membership
    matching (the hoodie `[color,size]` vs `[sizeId,colorId]` gotcha).
  - `resolveVariant` — exact match across all axes; returns disabled combos.
  - `imageVariant` — prefers an imaged variant; relaxes exact → same-primary →
    default; always enabled.
  - `availableValueIds` — per-axis greying respects the other selected axes.
  - `isPhoneModelOption` — true for phones (≥2 manufacturers), false for S/M/L.
  - `isHiddenOption` / `defaultHiddenValueId` — gift packaging hidden, defaults
    to the "without" value.
  - `cardSummary` — image pick + `fromPriceCents` over enabled variants.
  - **Verify:** `npx vitest run` green; suite fails if membership matching
    regresses (delete a fixture's positional assumption to confirm it bites).

Nothing else in this plan starts until 0.1 is green.

---

## Phase 1 — Extract seams (the "moderate" refactor)

Each extraction is behaviour-preserving; `variant.js` tests + a green
`npm run build` are the gate after every step.

- **1.1 `src/api.js`** — single module owning the API base URL, endpoint paths,
  and a small `fetchJson` helper (error handling in one place). Replace the
  scattered `fetch(`${...}/api/...`)` calls in views/cart with named functions
  (`getProducts`, `getProduct`, `getVariant`, `createCheckoutSession`).
  *Verify:* grep shows no remaining inline `/api/` string concatenation in views;
  catalog, details, cart revalidation, checkout still work in dev.

- **1.2 `useAsyncData(fetcher)` composable** — collapses the repeated
  `loading / error / data` + `onMounted` boilerplate in the views into one place.
  *Verify:* catalog and details loading/error states behave as before.

- **1.3 `useProductSelection(product)` composable** — lifts the selection state
  machine out of the `ProductDetailsView.vue` god-component: selected options,
  `visibleOptions`, availability map, the out-of-stock flags, current
  `imageVariant`, and `?phone=` query sync. View becomes mostly template.
  *Verify:* picklists, greying, image sync, deep-link round-trip unchanged.

- **1.4 `useNoiseBackground()` composable** — extracts the ~60-line canvas RAF
  noise loop from `ProductCatalog.vue` (setup, resize, frame throttle, cleanup).
  *Verify:* noise looks identical; loop is torn down on unmount (no leaked RAF).

- **1.5 Comment pass** — across the touched files, delete comments that restate
  the code; keep/sharpen the ones that capture a non-obvious *why* (the
  membership-matching gotcha, the transparency constraint, Safari hacks that
  remain). Surgical — only files already touched above.

---

## Phase 2 — 3D performance (the real lag fix)

Order matters: bake first (biggest per-frame win + deletes the most code), then
shrink the asset, then the cheap throttles.

- **2.1 Bake lighting + shadows in Blender; re-export optimized `.glb`.**
  Bake the lit result into the disc/backdrop textures so the runtime needs no
  lights and no shadow maps. Re-export with Draco/meshopt geometry compression
  and downscaled textures. Target: **42 MB → single-digit MB.**
  *Verify:* asset size dropped; the exported still frame matches the current look.

- **2.2 Rewrite materials to `MeshBasicMaterial`; rip out the dynamic pipeline.**
  Delete `renderer.shadowMap`, the light setup, shadow-resolution / anisotropy /
  precision juggling, and the FPS-monitoring `lowFPSMode` scaffolding — all
  obsolete once shading is baked. This is the big de-stink of `ThreeGLBScene.vue`.
  *Verify:* scene renders identically from the baked textures; the spin + fixed
  `front_view_camera` parallax are preserved (the "live feel").

- **2.3 Cheap throttles.** Cap the ambient spin at ~30 fps; pause the RAF on
  `document.hidden` (visibilitychange). Cap `renderer.setPixelRatio` on mobile.
  *Verify:* no visible change on desktop; lower GPU/CPU on a hidden tab.

- **2.4 Graceful fallback.** If WebGL is unavailable, show a static poster image
  instead of a blank `<canvas>`.
  *Verify:* force-disable WebGL → poster shows, page still usable.

- **Measure on Safari/iOS between 2.2 and 2.3.** Success = the hero scrolls
  smoothly on the device that was "extremely laggy". This is the acceptance test
  for Phase 2 — not a desktop frame counter.

- **2.5 (Optional, last) TresJS.** Only if, after the above, the imperative
  Three.js code is still the readability bottleneck. Pure cleanliness, no perf
  claim. Defer unless it clearly pays for itself.

---

## Phase 3 — Docs

- **3.1 Frontend `CLAUDE.md`** — short: project structure, dev/build/test
  commands, and the load-bearing gotchas (variant `options` ordering, catalog
  transparency, the baked-scene assumption). High leverage for future Claude Code
  sessions; this directly serves the "AI-friendly" goal.

---

## Explicitly out of scope (separate pass)

- API payment hardening: client-price trust in `create_checkout_session`, the
  webhook signature header (`STRIPE_SIGNATURE` → `Stripe-Signature`), unused
  `create_printify_order`, hardcoded quantity. Tracked in PRODUCTION_PLAN; not
  part of this cleanup.

## Sequencing summary

```
0.1 variant.js tests        → vitest green        (blocks everything)
1.1 api.js                  → build + manual smoke
1.2 useAsyncData            → "
1.3 useProductSelection     → "
1.4 useNoiseBackground      → "
1.5 comment pass            → "
2.1 bake + export glb       → asset shrinks, look matches
2.2 basic materials, rip    → look matches, feel preserved
2.3 throttles               → Safari smooth  ← Phase 2 acceptance
2.4 webgl fallback          → poster on failure
2.5 TresJS (optional)
3.1 frontend CLAUDE.md
```
