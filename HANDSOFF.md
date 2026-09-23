# Handoff — recurringcleaningserviceglendale.com

Status: **READY TO LAUNCH**

## What this is

Static HTML microsite (69 pages, no build step) for a commercial recurring-cleaning
lead-gen brand serving Glendale, AZ and 8 surrounding West Valley towns. Deploys to
Vercel, connected via the repo's Git integration (no CLI deploy needed).

## What changed in this pass

1. **Blog section (25 posts)**
   - `blog/<slug>/index.html` × 25 + `blog/index.html` hub — static pages built to the
     same header/nav/footer/JSON-LD shell as the rest of the site (`LocalBusiness` only,
     no `Article`/`BlogPosting` schema, no byline/date).
   - Rewritten for this site's brand from a generic commercial-cleaning content pack;
     unverifiable named-study citations were softened to general claims, and industry
     posts outside this site's quoted scope (restaurants/gyms/schools/daycares) were
     reframed as general facility-hygiene guidance rather than direct service claims.
   - Nav "Blog" link added sitewide (all 42 non-blog HTML pages); `sitemap.xml` updated
     with all 25 post URLs + the hub URL (69 total sitemap entries, matching actual
     page count).

2. **CRM-integrated multi-step quote wizard (replaces the old single-step form)**
   - `assets/js/quote-wizard.js` — full multi-step wizard (CRM questionnaire, appointment
     slot booking, industry + contact details, review/confirm). Loaded only on
     `/request-a-quote/`.
   - `api/submit-lead.js` — rewritten to accept the wizard's CRM-shaped payload
     (`customer`/`questions[]`/`appointments[]`/`industry`) instead of the old flat
     name/phone/email/zip/sqft/freq body. Still proxies to the same CRM-QM `PushLead`
     endpoint with the Bearer token read server-side from `CRM_API_TOKEN`.
     `SITE_SOURCE_TAG` is set to `"Site: recurringcleaningserviceglendale.com"` and
     prepended into every lead's `notes` field — the CRM token is shared across the
     whole portfolio and has no per-site field, so this tag is the only way a lead is
     attributable to this domain.
   - All 35 other quote-form-panel pages (home, contact, pricing, resources,
     service-areas, services) now use a short teaser form (`data-lead-teaser`, name +
     phone + sqft) that GET-submits to `/request-a-quote/`, since the multi-step wizard
     doesn't fit a narrow sidebar layout. The wizard's `prefillFromQuery()` reads the
     query string and prefills step 1.
   - `lead-form.js` trimmed to UTM-capture only (still loaded sitewide); the old
     `data-lead-form` submit handler was removed since no page has that attribute
     anymore.
   - `styles.css` — appended the wizard's structural CSS block (`.wiz-*` classes) using
     this site's existing color tokens.

3. **Repo hygiene (prior pass)**
   - Removed empty stray directories left over from a botched brace-expansion `mkdir`
     (e.g. `./{services,service-areas,resources}` existed literally on disk instead of
     expanding). No content was inside them.
   - Added `package.json` (Node >=18, for native `fetch` in the serverless function),
     `vercel.json` (security headers per HSTS/X-Frame-Options/etc.), and `.gitignore`.

## Required before the form goes live

**Set the `CRM_API_TOKEN` environment variable in the Vercel project** (Project
Settings → Environment Variables, all environments). The token is the Bearer token
from the CRM-QM API doc — it must NOT be committed to the repo. Without it,
`/api/submit-lead` returns a 500 and the form shows "Something went wrong."

## Known gaps / deliberately not built

- **Industry code / question_id mapping — resolved this pass.** `assets/js/quote-wizard.js`
  now uses the CRM's actual `get_lead_faq` questionnaire snapshot (question/answer IDs,
  the 40+ item `INDUSTRIES` list, and `SCHEDULES` time slots) — see the reference
  comment at the top of the `QUESTIONS`/`INDUSTRIES`/`SCHEDULES` arrays in that file.
  Re-fetch `get_lead_faq` and update the file if the CRM questionnaire ever changes.
- **Appointments (`appointments[]`) — resolved this pass.** The wizard's "Book your
  walkthrough times" step collects 1–5 appointment slots depending on how many
  companies the visitor wants to meet, validated against the CRM's date/weekday/lead-time
  rules both client-side and server-side.
- **No automated tests** — this pass shipped without a CRM test harness. Manually verify
  a live submission once `CRM_API_TOKEN` is set in Vercel by clicking through the wizard
  on a preview deploy — including a real appointment date/time — and confirming the lead
  lands in the CRM. This was not done in this session for lack of a browser tool; do not
  treat the wizard as launch-ready until someone does this.
- **No analytics/GTM tag** — none was supplied; UTM capture happens at the lead-record
  level instead (see above).

## Verification already done

- No hardcoded secrets, tokens, or credentials anywhere in the codebase (grepped for
  the literal CRM token and generic secret/token/apikey patterns — only reference is
  `process.env.CRM_API_TOKEN`).
- All internal links (`href="/..."`) resolve to a real page.
- No leftover placeholder text (`Lorem ipsum`, `{{`, `TBD`, `coming soon`, etc.)
  anywhere in the pages.
- `node --check` passes on both `assets/js/quote-wizard.js` and `api/submit-lead.js`.
- All 35 teaser-form instances GET-submit to `/request-a-quote/` identically; the
  wizard's six `data-wizard-*` scaffold hooks are present and unique on that page.
- **Not yet done**: a real browser click-through of the wizard end to end on a preview
  deploy, and a real test submission confirmed landing in the CRM. Do this before the
  wizard goes live per the playbook's Phase 3.7.
