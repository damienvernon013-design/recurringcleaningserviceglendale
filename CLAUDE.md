# recurringcleaningserviceglendale.com

Static HTML microsite, no build step, deployed to Vercel via Git integration (already
connected — no `vercel` CLI needed, pushing to `main` deploys).

## Structure

- Plain HTML pages, one `index.html` per route folder (e.g. `service-areas/peoria/`).
- Single shared `styles.css`, no CSS framework, no web fonts, no external JS libraries.
- `api/submit-lead.js` — the only server code. A Vercel serverless function that proxies
  quote-form submissions to the CRM-QM `PushLead` API. Requires `CRM_API_TOKEN` set in
  Vercel project env vars (never in source).
- `lead-form.js` — shared client script for all quote-form pages (UTM capture + form
  submission). Loaded via `<script src="/lead-form.js" defer>` on every page that has a
  `.quote-form-panel`.

## Conventions

- Every page keeps the same header/nav/footer markup verbatim — copy an existing page
  when adding a new route rather than hand-building the shell.
- No street address, no map embeds, no testimonials/review schema anywhere (portfolio
  rule — see `QA.md`).
- Phone `(866) 958-8773` and email `ops@thequotemasters.com` must stay correct in every
  page's header and footer.
- If you add or change the quote form, update it in all pages that embed
  `.quote-form-panel` (currently 19 route folders) — the markup is intentionally
  identical across pages so `lead-form.js` can attach to any of them without per-page
  config.

## Do not

- Do not hardcode the CRM Bearer token or any secret in HTML/JS. It lives only in the
  Vercel `CRM_API_TOKEN` env var and is read server-side in `api/submit-lead.js`.
- Do not invent `industry` codes or `question_id`/`answer_id` values for the CRM
  `PushLead` payload — none were supplied for this vertical. See `HANDSOFF.md` for the
  open item.
- Do not add analytics/GTM tags without a real measurement ID from the client.

See `HANDSOFF.md` for current launch status and open items, `QA.md` for the original
build QA checklist.
