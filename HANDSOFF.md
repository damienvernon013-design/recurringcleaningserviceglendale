# Handoff — recurringcleaningserviceglendale.com

Status: **READY TO LAUNCH**

## What this is

Static HTML microsite (43 pages, no build step) for a commercial recurring-cleaning
lead-gen brand serving Glendale, AZ and 8 surrounding West Valley towns. Deploys to
Vercel, connected via the repo's Git integration (no CLI deploy needed).

## What changed in this pass

1. **Contact form wired to the CRM-QM PushLead API**
   - `api/submit-lead.js` — Vercel serverless function. Holds the CRM Bearer token
     server-side (env var, never in client code) and proxies validated lead payloads to
     `https://thequotemasters.com/crm_api/api.php?action=push_lead`.
   - `lead-form.js` — client script wired into all 19 quote-form pages. Validates
     required fields, captures UTM params from the landing URL, persists them in
     `sessionStorage` so they survive page-to-page navigation, and submits to
     `/api/submit-lead` on click. Shows inline success/error messaging.
   - Added a required ZIP field to the quote form (the CRM API requires `zip`; the
     original form didn't collect it).
   - `styles.css` — added `.form-status` success/error styles and a disabled-button state.

2. **UTM tracking**
   - Handled at the lead level, not via a third-party analytics tag (none was
     configured or supplied — no GA/GTM ID exists anywhere in the repo, so none was
     fabricated). `lead-form.js` captures `utm_source/medium/campaign/term/content`
     from the query string on first landing, and every submitted lead includes the UTM
     source plus the originating page URL in the payload sent to the CRM.

3. **Repo hygiene**
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

- **Industry code / question_id mapping**: the CRM-QM API doc's `PushLead` payload
  supports an `industry` code and a `questions[]` array (question_id/answer_id pairs)
  for questionnaire-style leads. No mapping table for this vertical (commercial
  cleaning) or ID scheme was supplied anywhere in the provided docs, so these fields
  were **omitted** from the payload rather than guessed — sending a wrong industry code
  or answer ID would misfile every lead in the CRM. If QuoteMasters provides the
  correct `industry` code and question/answer IDs for this vertical, add them to the
  payload construction in `api/submit-lead.js`.
- **Appointments (`appointments[]`)**: the form doesn't currently ask for a preferred
  appointment slot, so this array is omitted. Add if a scheduling picker is added to
  the form later.
- **No automated tests** — per instruction, this pass shipped without a CRM test
  harness. Manually verify a live submission once `CRM_API_TOKEN` is set in Vercel by
  submitting the form on the deployed site and confirming the lead lands in the CRM.
- **No analytics/GTM tag** — none was supplied; UTM capture happens at the lead-record
  level instead (see above).

## Verification already done

- No hardcoded secrets, tokens, or credentials anywhere in the codebase (grepped for
  the literal CRM token and generic secret/token/apikey patterns — only reference is
  `process.env.CRM_API_TOKEN`).
- All internal links (`href="/..."`) resolve to a real page.
- No leftover placeholder text (`Lorem ipsum`, `{{`, `TBD`, `coming soon`, etc.)
  anywhere in the 43 pages.
- All 19 quote-form instances are wired identically and share the same
  `lead-form.js`/`api/submit-lead.js` path.
