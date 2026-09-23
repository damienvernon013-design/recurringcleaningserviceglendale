# recurringcleaningserviceglendale.com

Static HTML microsite, no build step, deployed to Vercel via Git integration (already
connected — no `vercel` CLI needed, pushing to `main` deploys).

## Structure

- Plain HTML pages, one `index.html` per route folder (e.g. `service-areas/peoria/`).
- Single shared `styles.css`, no CSS framework, no web fonts, no external JS libraries.
- `api/submit-lead.js` — the only server code. A Vercel serverless function that proxies
  quote-form submissions to the CRM-QM `PushLead` API. Requires `CRM_API_TOKEN` set in
  Vercel project env vars (never in source).
- `assets/js/quote-wizard.js` — the full multi-step CRM quote wizard (questionnaire,
  appointment booking, industry/details, review). Loaded only on `/request-a-quote/`
  via `<script src="/assets/js/quote-wizard.js" defer>`. Posts an already CRM-shaped
  body to `/api/submit-lead`.
- `lead-form.js` — UTM-capture-only script loaded sitewide (`<script src="/lead-form.js"
  defer>`). Persists `utm_source/medium/campaign/term/content` to `sessionStorage` so
  they survive navigation to `/request-a-quote/`.
- `blog/` — 25 static blog posts + `blog/index.html` hub, `LocalBusiness`-only JSON-LD
  (no byline/date/Article schema), same header/nav/footer shell as every other page.

## Quote flow

- `/request-a-quote/` is the only page with the full wizard (`data-quote-wizard` form
  with `data-wizard-progress`/`data-wizard-steps`/`data-wizard-status`/`data-wizard-nav`
  scaffold). It's a multi-step flow, so it does not fit sidebar layouts.
- Every other page that offers a quote form (home, contact, pricing, resources,
  service-areas, services — currently 35 route folders) uses a short teaser form
  (`data-lead-teaser`, name + phone + approx. sqft only) that GET-submits natively to
  `/request-a-quote/` (`action="/request-a-quote/" method="get"`, no JS). The wizard's
  `prefillFromQuery()` reads `?name=&phone=&sqft=` from the URL and prefills step 1 —
  this handoff is intentional, don't rebuild it differently per page.
- If you change the teaser form markup, update it in all 35 route folders — the markup
  is intentionally identical so no per-page JS config is needed.

## Conventions

- Every page keeps the same header/nav/footer markup verbatim — copy an existing page
  when adding a new route rather than hand-building the shell.
- No street address, no map embeds, no testimonials/review schema anywhere (portfolio
  rule — see `QA.md`).
- Phone `(866) 958-8773` and email `ops@thequotemasters.com` must stay correct in every
  page's header and footer.

## Do not

- Do not hardcode the CRM Bearer token or any secret in HTML/JS. It lives only in the
  Vercel `CRM_API_TOKEN` env var and is read server-side in `api/submit-lead.js`.
- Do not add `Article`/`BlogPosting` schema, author bylines, or publish dates to blog
  posts — this site's other content pages carry none of that; mixing schema richness
  across page types looks inconsistent.
- Do not add analytics/GTM tags without a real measurement ID from the client.

See `HANDSOFF.md` for current launch status and open items, `QA.md` for the original
build QA checklist.
