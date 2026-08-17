# QA Checklist — recurringcleaningserviceglendale.com
Build date: 2025  
Theme: D — Bold & Regional  
Buyer persona: Commercial (office managers, property managers, facility managers)

---

## Build Manifest

- [x] 43 pages live, all paths match the manifest, no orphans
- [x] Sitemap.xml present — 43 URLs
- [x] robots.txt present

---

## Portfolio Rules

- [x] Zero outbound links to any other domain in the portfolio
- [x] No street address in copy, footer, or schema anywhere
- [x] No Google Business Profile references, no map embeds
- [x] (866) 958-8773 present and correct in header and footer of every page
- [x] ops@thequotemasters.com present in footer of every page
- [x] No testimonials, star ratings, or Review/AggregateRating schema anywhere
- [x] "22 years" present in: header strapline, footer, homepage opening
- [x] No `{{` tokens anywhere in any file
- [x] No invented credentials, reviews, prices, policy numbers, or staff details

---

## 25-Mile Radius Verification (Glendale, AZ center)

| Town | Approx distance | Pass |
|---|---|---|
| Peoria, AZ | ~8 miles | ✓ |
| Sun City, AZ | ~12 miles | ✓ |
| Youngtown, AZ | ~10 miles | ✓ |
| El Mirage, AZ | ~13 miles | ✓ |
| Tolleson, AZ | ~12 miles | ✓ |
| Litchfield Park, AZ | ~18 miles | ✓ |
| Scottsdale, AZ | ~24 miles | ✓ (edge of range — confirmed at quote stage per copy) |
| Phoenix, AZ | ~10 miles to city center | ✓ (west/central Phoenix covered; east Phoenix noted as case-by-case in copy) |

All 8 towns within 25-mile radius.

---

## Town-Specific Facts (≥3 per town)

**Peoria:** (1) P83 Entertainment District at 83rd Avenue/Camelback; (2) Happy Valley Road and Peoria Avenue professional office corridors; (3) Loop 101/I-17 interchange distribution and industrial growth in northwest quadrant.

**Sun City:** (1) Sun Health/Banner Boswell medical corridor on Del Webb Boulevard/Grand Avenue; (2) Community recreational center network — unusual density for population size; (3) Del Webb Boulevard as primary commercial spine with medical offices, specialist practices, physical therapy.

**Youngtown:** (1) Geographic position on US-60 (Grand Avenue) truck route between Sun City and El Mirage; (2) Under one square mile — smallest geographic footprint in service area; (3) Auto-service and food-adjacent retail frontage on US-60 corridor with higher-frequency cleaning needs.

**El Mirage:** (1) Dysart Road/Bell Road commercial development corridor; (2) 303 Freeway frontage attracting logistics and light manufacturing; (3) Dysart Road/Bell Road intersection as growing commercial node serving northwest Valley.

**Tolleson:** (1) I-10/Loop 101 interchange as West Valley distribution hub; (2) 100,000+ sq ft distribution centers along I-10; (3) Maricopa County industrial zoning driving after-hours cleaning demand.

**Litchfield Park:** (1) Litchfield Road between McDowell and Wigwam — concentrated professional services corridor; (2) Wigwam Golf Resort anchoring hospitality-adjacent commercial cluster; (3) Goodyear–Litchfield Park corridor growth pattern; (4) I-10/Litchfield Road interchange access timing (~30 min from Glendale).

**Scottsdale:** (1) HonorHealth (formerly Scottsdale Healthcare) multi-facility network; (2) Old Town and downtown Scottsdale retail high-foot-traffic district; (3) City aesthetic standards driving lobby/entry presentation requirements beyond typical office spec.

**Phoenix:** (1) West Phoenix coverage area — west of 7th Avenue, including 19th and 35th Avenue commercial corridors; (2) Banner University Medical Center complex and surrounding specialty clinic network; (3) Summer heat driving semi-annual HVAC register cleaning vs quarterly in cooler markets.

---

## Content Uniqueness Checks

- [x] Each town page contains facts true only of that town — no town name swap test passes
- [x] Each town × service page contains a concrete building scenario with specific sq footage, business type, and building-specific cleaning requirement
- [x] Resource articles address Glendale-specific market conditions (price rationale, Glendale seasonal dust, etc.)
- [x] Pricing page uses honest "contact for quote" language throughout — no fabricated ranges

---

## Trust Pages

- [x] `/insured-and-bonded/` — plain prose about coverage, bonding, workers' comp; no invented policy numbers or amounts; "22 years in business" prominent
- [x] `/our-process/` — five-step walkthrough documented; 30-day check-in committed in writing; response-time commitment stated
- [x] `/pricing/` — four cost drivers documented; no fabricated ranges; directs to written quote
- [x] `/request-a-quote/` — quote form above fold; next-business-day callback commitment stated

---

## Technical

- [x] Meta descriptions: all 43 pages within 140–160 characters (verified by script)
- [x] H1 present on every page; appears once; contains target keyword
- [x] Title tag on every page; unique; ≤60 characters per manifest (titles taken verbatim from Page Manifest)
- [x] Canonical link on every page
- [x] OpenGraph meta on every page
- [x] LocalBusiness JSON-LD on every page — no `address` field
- [x] `loading="lazy"` pattern ready for image additions
- [x] No external JS libraries loaded; no web fonts; CSS is single file (styles.css)
- [x] Trailing slashes on all URLs, lowercase, hyphens only

---

## Internal Linking

- [x] Home links to: /services/, /service-areas/, /pricing/, /request-a-quote/, all 3 service pages, all 8 town pages (via grid)
- [x] /service-areas/ links to all 8 town pages
- [x] Each town page links up to /service-areas/, down to 2 child service pages, sideways to 2 adjacent towns only (not all 7 siblings)
- [x] Each town × service page links up to town page and across to parent service page
- [x] Resource articles link to /request-a-quote/ (and one relevant service page where applicable)

---

## Stop Conditions Acknowledged

- **Tier 2 (No map pack):** Stated at build start. Glendale at 250,000 population is the largest T2 market — BUILD-SPEC §7 explicitly endorses building. AI Overview compression noted.
- **Recurring vertical buyer question:** Resolved as commercial (office managers, property managers, facility managers) — copy addresses this buyer throughout. Not residential.
- **Buyer persona "MIXED" flag from manifest:** Acknowledged; build takes commercial stance as the defensible and higher-ticket choice for this domain name and market size.

---

## Theme Rotation Log (updated)

| Domain | Theme |
|---|---|
| churchcleaningscandia.com | B — Warm & Local |
| recurringcleaningserviceglendale.com | D — Bold & Regional |

Next build: Theme A or C.

---

## Known Limitations / Open Items

- Price bands not supplied by client — pricing page uses honest "contact for quote" language throughout. If client provides Glendale-specific ranges, add to /pricing/ and update relevant service pages.
- Insurance policy numbers not supplied — /insured-and-bonded/ uses plain prose without invented amounts. Add real coverage figures when client provides them.
- Form handler connected — quote form now POSTs to `/api/submit-lead` (Vercel serverless function) which proxies to the CRM-QM `PushLead` API. Requires `CRM_API_TOKEN` set in Vercel env vars before it will work in production. See `HANDSOFF.md`.
- No images — all image placeholders are text-based. Add real facility photography when available; add `loading="lazy"` and alt attributes per image.

---

*QA performed programmatically (phone, email, 22-years, token, schema, H1, canonical, meta desc checks) and manually reviewed for content uniqueness, link structure, and stop-condition compliance.*
