# Production-Ready Plan — Locomobile

Single source of truth. Merges the original spec + per-task prompts. Status reflects state on `main` (frontend
`locomobile.co` + backend `locomobile.co-api`) as of 2026-06-06.

Critical path: **2 → 3 → 4 → 5 → 6 → launch**. Tasks 7/8/9/10 parallel-safe after 5.

**Backend note:** Tasks 5 & 6 now live alongside `locomobile.co-api/PROFIT_TRACKING_DESIGN.md`, which is the
authoritative design for order persistence + fulfillment. Where the two docs disagree (notably Task 6 queue
architecture), the profit-tracking design wins — see Task 6. Only **step 1 of that design's rollout (DB foundation)**
has actually landed so far; the rest is unbuilt despite the DB being connected.

---

## Status snapshot

| #  | Task                                                       | Status                                                                                                                                                            |
|----|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | Routing migration (vue-router + Netlify `_redirects`)      | done — `_redirects` SPA fallback fixed (`/*`); shared deep links now resolve                                                                                      |
| 2  | Catalog rewrite (one card per product, matte hero)         | done — whole card clickable/focusable, hover rotates image, price kept by decision                                                                                |
| 3  | Details rewrite (optional phone, optgroup, OOS states)     | implemented — grouped phone selector, is_enabled greyout, 3 OOS states, `?phone=` writeback; pure helpers in `domain/variant.js`. Build green; browser smoke-test pending                  |
| 4  | Cart shape + persistence + revalidation                    | not started                                                                                                                                                       |
| 5  | Backend contract (server-priced Stripe, webhook sig, CORS) | partial — CORS locked; Postgres+Flask-Migrate landed; **still trusts client price**, webhook sig header bug, no variant-revalidation endpoint, qty hardcoded to 1 |
| 6  | Post-checkout (webhook → Printify, retry/refund)           | not started — architecture changed: **inline-in-webhook, not BullMQ** (see PROFIT_TRACKING_DESIGN). `create_printify_order()` exists but is never called          |
| 7  | SEO (vite-ssg, @unhead, JSON-LD, sitemap)                  | not started                                                                                                                                                       |
| 8  | Observability (Sentry, GA4 Consent Mode v2, banner)        | not started                                                                                                                                                       |
| 9  | Legal pages (Termly: privacy/ToS/refund/shipping/cookie)   | not started                                                                                                                                                       |
| 10 | Performance (`loading="lazy"`) + Playwright e2e            | not started                                                                                                                                                       |

---

## Task 1 — Routing migration ✅ done

vue-router 4 with `createWebHistory()`. Routes `/`, `/products/:id`, `/cart`, catch-all → `HomeView`. `router.afterEach`
scrolls Lenis to 0 and refreshes ScrollTrigger. `public/_redirects` exists.

**✅ Fixed (2026-06-06) — shared/deep product links used to 404 on Netlify.** `public/_redirects` now reads
`/*    /index.html   200`. History below for reference.

*Symptom:* a product overview opens fine when reached by clicking through the catalog, but copy-pasting that URL (e.g.
`https://locomobile.co/products/<id>`) into a new tab returns a broken/404 page.

*Root cause:* `createWebHistory()` uses real URL paths (no `#`). In-app navigation is handled client-side by vue-router,
so no server request is made — that path works. A pasted URL, by contrast, makes a **real GET to Netlify** for
`/products/<id>`. For an SPA, Netlify must rewrite every unmatched path to `/index.html` so the app can boot and the
router can take over. That rewrite is configured in `public/_redirects` — whose only line is:

```
3/*    /index.html   200
```

The match pattern is `3/*`, not `/*`, so it only catches paths beginning with `3/`. `/products/<id>` never matches → no
SPA fallback → Netlify 404. The page component is *not* at fault: `ProductDetailsView` self-fetches from the `:id` route
param (`GET /api/products/:id`), so a fresh load can fully rebuild itself — it just never gets served. The SPA-side
catch-all route (`/:pathMatch(.*)*`) doesn't help either, since the app never boots.

*Not visible in dev:* Vite's dev server has its own history-API fallback, so deep links work locally. The bug only
manifests on the deployed Netlify site.

*Fix applied:* dropped the stray `3` in `public/_redirects`:

```
/*    /index.html   200
```

Takes effect on the next Netlify deploy.

---

## Task 2 — Catalog rewrite ⚠ mostly done

Spec (`src/components/ProductCatalog.vue`):

- One card per product, deduped across phones.
- Hero = matte variant's default image (matte survives the `remove-white` SVG filter; glossy mockups go transparent from
  reflections).
    - `product.options.find(o => o.type === 'surface')` → `surface.values.find(v => v.title === 'Matte')` (title-based;
      IDs vary per blueprint) → first variant where `is_enabled` and `options[surfaceIdx] === matteValue.id`.
    - Image: `product.images.find(img => img.is_default && img.variant_ids?.includes(matteVariant.id))?.src`, fallback
      to any image referencing that variant.
    - No enabled matte variant → skip the card (revisit later: skip vs fallback to any enabled variant).
- Whole card clickable. `role="button"`, `tabindex="0"`, `@keydown.enter`, `cursor: pointer`, hover transform.

**Residual work:**

1. Lines 27–35 — move the click handler + `role`/`tabindex`/`@keydown.enter` from `.product-image` up to
   `.product-card`, so the title + price rows are also a click target.
2. ✅ Confirm `cardSummary` skips products with no enabled matte variant — done (`catalogItems` does
   `if (!summary) continue`).

Price line kept by decision (2026-06-07) — shows the "from" price; do not remove.

---

## Task 3 — Details rewrite (`src/views/ProductDetailsView.vue`)

**Depends on:** 1. **Blocks:** 7 (details meta), 10 (e2e).

- `phoneModelValueId` becomes optional (no phone picked at catalog time). Read it from the `?phone=` query.
- Phone selector: `<select>` with `<optgroup>` per manufacturer (iPhone / Samsung / Google Pixel / Other). Infer by
  title prefix. 40+ models in a flat list is unusable; native optgroups are accessible and cheap.
- Keep `surface`, `shape`, etc. as plain `<select>`s.
- `is_enabled` everywhere — `phoneModelVariants` and `selectedVariant` must filter `v.is_enabled`. Gray out (`disabled`
  attr) phone values with zero enabled variants for the product.
- Three flags:
    - `noPhonePicked` — no `phoneModelValueId`.
    - `phoneOutOfStock` — phone picked, zero enabled variants for it.
    - `comboOutOfStock` — enabled variants exist for the phone, but current `selectedOptions` resolves to a disabled
      variant.
- Price slot:
    - `noPhonePicked` → muted "Select a phone" hint or empty.
    - `phoneOutOfStock || comboOutOfStock` → red "Out of stock" (`#ff4444`, same font size as price).
    - Otherwise → price.
- Buy button: disabled when any flag is true. Copy: `noPhonePicked` → "Select a phone"; OOS → "Out of stock"; else "Buy
  Now".
- Route writeback: on phone change, `router.replace({ query: { ...route.query, phone: newPhoneId } })`.
- Default-variant init: skip when no phone picked; when picked, pick default among enabled variants for that phone only.
- Heading: no phone → `product.title`; phone picked → keep current two-line layout.
- Disabled-combo UX: allow selection then show red OOS message (simplest of the three options).

Defer: JSON-LD + meta (task 7). Cart shape (task 4). Price revalidation (task 4).

---

## Task 4 — Cart shape + persistence (`src/cart.js`, `PayList.vue`, `ProductDetailsView.vue`)

**Depends on:** 1, 3. **Blocks:** 5.

Current shape is `{ name, price, image, cartId }` — client-supplied price is a fraud window. Replace:

- New shape: `{ productId, variantId, quantity, name, image }`. `name`/`image` are display-only; backend re-derives
  canonical name + price from IDs.
- `addItem` — if `variantId` exists, increment `quantity`; else push new with `quantity: 1`.
- Add `incrementQuantity(variantId)`, `decrementQuantity(variantId)` (remove at 0), `setQuantity`,
  `removeItem(variantId)`.
- `total` getter multiplies by quantity.
- **localStorage persistence:**
    - On module load: read `localStorage.cart`, JSON-parse in try/catch (corrupted → empty).
    - `watch(() => cart.items, ..., { deep: true })` → write back.
    - Migration: if stored items lack `variantId`, `removeItem('cart')`. Acceptable to drop in-flight carts on rollout.
- **Cross-tab sync:** `window.addEventListener('storage', e => { if (e.key === 'cart') rehydrate from e.newValue })`.
  The event spec only fires in *other* tabs, but compare defensively.
- **Revalidation on hydrate:** for each item, `GET /api/products/:productId/variants/:variantId` → `{ enabled, price }`.
  If `!enabled`, flag `_unavailable: true`; if price changed, update local + toast. (Per-item vs batch endpoint — decide
  during impl.)
- `handleBuy` in details: pass `productId` + `variantId` (`selectedVariant.value.id`).
- `PayList.vue`: +/− quantity controls. `_unavailable` items shown red, "Remove" only. Don't change checkout POST yet (
  task 5).

---

## Task 5 — Backend contract (Render repo)

**Depends on:** 4. **Blocks:** 6.

Frontend → Render backend → Stripe Checkout → Printify.

- **`POST /api/create-checkout-session`** body: `{ items: [{ productId, variantId, quantity }] }`.
    - For each item, fetch variant from Printify (`GET /v1/shops/{shop_id}/products/{productId}.json`). Reject 400 if
      missing/disabled/OOS.
    - Build Stripe `line_items` from **Printify-authoritative** price (cents) + quantity. Never trust client price.
    - `mode: 'payment'`, `success_url`, `cancel_url`, `shipping_address_collection: { allowed_countries: [...] }`.
    - Stash `{productId, variantId, quantity}` per line in `metadata` / `payment_intent_data.metadata` so the webhook
      can build the Printify order without the client.
    - Respond `{ url: session.url }`.
- **`GET /api/products/:productId/variants/:variantId`** for cart revalidation. Returns `{ enabled, price }`. 60s cache
  so hydration doesn't smash Printify.
- **CORS** locked to Netlify production domain + localhost dev. No `*`.
- **Stripe webhook signature verification:** `stripe.webhooks.constructEvent(rawBody, signatureHeader, endpointSecret)`.
  Use the *raw* body — configure body parser to skip this route. Reject anything that doesn't verify. (Forged webhooks =
  free shipped product.)
- **Render env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`,
  `FRONTEND_ORIGIN`. `.env` git-ignored.
- **No rate limit** on checkout endpoint for now (accept Stripe per-request cost as the upper bound). Revisit on abuse.

**Current backend state (`locomobile.co-api/app.py`):**

- ✅ CORS locked (localhost:5173/5174 + locomobile.co + www). No `*`.
- ✅ Postgres + Flask-Migrate wired, baseline `Purchase` migration applied (= profit-tracking rollout step 1).
- ✅ Webhook writes a `Purchase` row, idempotent on `stripe_session_id`.
- ❌ **Server pricing missing** — `create_checkout_session` does `unit_amount: int(item.get('price', 2000))`, i.e. trusts
  the client. Must refetch variant from Printify and price authoritatively. **The fraud window is still open.**
- ❌ **Webhook signature header bug** — reads `request.headers.get('STRIPE_SIGNATURE')`; Stripe sends `Stripe-Signature`
  and Werkzeug treats `_` ≠ `-`, so this is always `None` → every webhook 400s. Fix to `Stripe-Signature`.
- ❌ No `GET /api/products/:productId/variants/:variantId` revalidation endpoint (Task 4 precondition).
- ❌ Quantity hardcoded to `1` in checkout line items.
- ❌ Items metadata (`{productId, variantId, quantity}`) not stashed on the session → webhook can't build a Printify
  order (blocks Task 6 / profit step 5).
- ⚠ Env var name drift vs design: code uses `PRINTIFY_API_KEY` / `FRONTEND_URL`; design names `PRINTIFY_API_TOKEN` /
  `FRONTEND_ORIGIN`. Pick one and align both docs.

---

## Task 6 — Post-checkout flow

**Depends on:** 5. **Blocks:** launch.

> **Architecture superseded.** The original BullMQ + Redis worker design is dropped in favour of the inline approach in
`PROFIT_TRACKING_DESIGN.md` (steps 5–6). Rationale: no Redis to provision, and Stripe's own webhook retries (~3 days)
> replace the job-queue backoff. Stripe is willing to wait for a slower 2xx, and a single synchronous Printify call
> inside
> the webhook is acceptable at this volume.

- **Webhook handler** `POST /api/webhook` after `constructEvent` (fix the sig header first — see Task 5):
    - `checkout.session.completed` → write/locate the `Purchase` row (idempotent on `stripe_session_id`), then call
      `create_printify_order()` inline.
    - Else 200 OK and ignore.
- **Row-first / retry-on-500 pattern (profit design):**
    - Write the row first. Build the Printify payload from `session.metadata['items']` (the
      `{productId, variantId, quantity}` JSON stashed in Task 5).
    - Second idempotency guard on `printify_order_id IS NULL` so a Stripe retry only re-attempts the Printify call,
      never re-creates the row.
    - On Printify failure → return **500** so Stripe retries (up to ~3 days). After Stripe gives up, an admin path
      retries manually.
    - On success → store `printify_order_id` on the row.
- **Printify cost webhook** (`POST /api/printify-webhook`, HMAC-SHA256 via `PRINTIFY_WEBHOOK_SECRET`) updates cost
  columns by `printify_order_id`. (Profit-tracking step 6 — needed for profit reporting, not for fulfillment.)
- **Refunds at launch:** no automated refund-on-failure (the BullMQ "final failure → refund" step is dropped). Manual
  admin retry + manual Stripe refund if it can't be fulfilled. Sentry alert on repeated webhook 500s instead.
- Sentry tags every capture with `stripe_session_id` (Task 8).
- Stripe automatic receipt covers customer-facing payment confirmation. No custom transactional email at launch.

---

## Task 7 — SEO (`vite-ssg` + `@unhead/vue`)

**Depends on:** 1, 2, 3. **Blocks:** launch organic traffic.

- `npm i -D vite-ssg @unhead/vue`.
- Switch `src/main.js` to `viteSSG` instead of `createApp`.
- `vite.config.js` → `ssgOptions: { script: 'async', formatting: 'minify' }`.
- `includedRoutes`: fetch `GET /api/products` at build time → `['/', '/cart', ...products.map(p => `/products/${p.id}
  `)]`.
- Per-route meta:
    - Catalog: title + description + OG + Twitter.
    - Details: dynamic `title` = product title; `description` = first 160 chars of `product.body_html` stripped of HTML;
      `og:image` = matte default image.
- **JSON-LD `Product`:**
    - Prerender → `AggregateOffer { priceCurrency: 'USD', lowPrice, highPrice, offerCount }` over enabled variants (no
      specific phone known).
    - After hydration + full combo valid → swap to single
      `Offer { price, priceCurrency, availability, sku: variantId }`. Watcher on `selectedVariant`.
- `sitemap.xml` + `robots.txt` at build (`vite-plugin-sitemap` or hand-roll), same `includedRoutes` source.
- Verify with curl that prerendered HTML contains title/OG/JSON-LD before hydration. Google Rich Results Test passes.

---

## Task 8 — Observability

**Depends on:** 5 (parallel-safe).

- **Sentry FE:** `@sentry/vue`, init after `app.use(router)`. `tracesSampleRate: 0.1`,
  `environment: import.meta.env.MODE`. Wire to vue-router for transaction names. Gate init on `import.meta.env.PROD`.
- **Sentry BE:** `@sentry/node` at server start. Tracing middleware before routes, error handler after.
- **GA4 + Consent Mode v2:** in `index.html` head, after gtag is defined, call
  `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })`
  **before** `gtag('config', 'G-XXXX')`. Otherwise GA fires before consent → legal exposure.
- **Cookie banner:** small Vue component, fixed bottom, Accept/Reject. Accept →
  `gtag('consent', 'update', { analytics_storage: 'granted' })` + `localStorage.consent='granted'`. Reject → store
  `denied`. On mount, skip banner if decision exists.
- **GA4 enhanced ecommerce events (only after consent granted):** `view_item` on details mount, `add_to_cart` in
  `cart.addItem`, `begin_checkout` on Stripe redirect, `purchase` on success page (fetch session from backend).
- Wrap gtag in `analytics.js` helper that no-ops when consent denied. Don't import gtag in components directly.

---

## Task 9 — Legal pages (Termly free tier)

**Depends on:** 1 (parallel-safe). **Blocks:** Stripe payouts (Stripe freezes accounts missing required policy URLs).

- Sign up for Termly free tier.
- Generate 5 documents: Privacy Policy, Terms of Service, Refund Policy (note Printify POD constraint: personalized
  items non-returnable except defects), Shipping Policy (Printify ETAs: ~3–7 day production + shipping), Cookie Policy.
    - Inputs: business name, address, contact email, jurisdiction, data collected (name, email, shipping, payment via
      Stripe), third-party processors (Stripe, Printify, GA, Sentry).
- 5 route components in `src/views/legal/`: paste Termly HTML, wrap in site layout. **Don't paraphrase** — legal value
  is in audited templates.
- Routes: `/privacy`, `/terms`, `/refunds`, `/shipping`, `/cookies`.
- Footer with all 5 links + `Contact: <email>`.
- Stripe dashboard → Settings → Branding → Public details → Privacy + ToS URLs.

---

## Task 10 — Performance + e2e

**Depends on:** 2, 3, 4 (parallel-safe).

- `loading="lazy"` on below-the-fold `<img>`:
    - `ProductCatalog.vue` catalog cards; first 4 stay eager (`:loading="index < 4 ? 'eager' : 'lazy'"`).
    - `ProductDetailsView.vue` thumbnail grid (main image eager).
- **`srcset` deferred** — Printify URLs don't accept resize params, so srcset has no different-size sources to pick.
  Needs a CDN proxy (Cloudinary / Cloudflare Images) first. Leave a TODO comment pointing here.
- **Playwright e2e:**
    - `npm i -D @playwright/test`, `npx playwright install`.
    - `e2e/checkout-happy-path.spec.ts` — catalog → details → pick phone → add to cart → Stripe Checkout. Use Stripe
      test mode.
- **CI:** GitHub Actions on PRs → `npm run build && npx playwright test`.
- No unit tests (deferred per spec). Revisit if variant-resolution logic churns.

---

## Cross-cutting decisions

- **A11y skipped at launch.** Acknowledged risk: EU EAA enforcement (June 2025) + US ADA case law for ecommerce. Plan to
  revisit before targeting EU/UK seriously — Lighthouse a11y + axe-core sweep is ~1 day.
- **No backend rate limit** on checkout endpoint at launch.
- **No custom transactional email** — Stripe automatic receipt only.
- **No image CDN** — required before adding `srcset`.
- **Multi-currency / i18n:** out of scope.

---

## Open / deferred

| Item                                                                            | Decision                                                                       |
|---------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Image CDN (Cloudinary / Cloudflare Images)                                      | Skipped at launch; needed before `srcset`                                      |
| Custom transactional email after checkout                                       | Stripe receipt only at launch                                                  |
| Backend rate limit on checkout endpoint                                         | Skipped                                                                        |
| Accessibility (WCAG 2.1 AA)                                                     | Skipped; EAA/ADA risk acknowledged                                             |
| Disabled-combo dropdown UX                                                      | Allow + red "Out of stock"                                                     |
| Catalog products with no enabled matte variant                                  | Skip card; revisit during catalog polish                                       |
| Cart revalidation strategy (per-item vs batch endpoint)                         | Decide during task 4 impl                                                      |
| Unit tests for variant resolution                                               | Skipped at launch                                                              |
| Post-checkout queue (BullMQ + Redis)                                            | **Dropped.** Inline-in-webhook + Stripe retry (PROFIT_TRACKING_DESIGN) instead |
| Automated refund-on-fulfillment-failure                                         | Deferred. Manual admin retry + manual refund at launch                         |
| Backend env var names (`PRINTIFY_API_KEY`/`FRONTEND_URL` vs `_TOKEN`/`_ORIGIN`) | Open — align code + both design docs before Task 5                             |

---

## Tracking

Flip statuses in the snapshot table as tasks land. When all 10 are done, deferred items become the next backlog.
