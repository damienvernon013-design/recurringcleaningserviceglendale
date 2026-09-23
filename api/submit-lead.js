// Vercel serverless function — proxies lead submissions to the CRM-QM PushLead API.
// Keeps the Bearer token server-side only; never exposed to the browser.
//
// The only client is assets/js/quote-wizard.js, which posts an already
// CRM-shaped body: a `customer` object plus questions[]/appointments[]/industry.
//
// The CRM enforces (verified against the live endpoint 2026-08-28):
//   - questions[] and appointments[] must both be NON-EMPTY
//   - customer.company_name and customer.position must be non-blank
//   - appointment dates must be >= today+2 and fall Mon-Fri; timeid 1-39
//   - the quote-count key is `num_of_quotes` (the published PDF's
//     `number_of_quotes` is rejected)
//   - a successful push returns ResponseCode 201, not 200
// service_address and notes are genuinely optional.

const CRM_ENDPOINT = 'https://thequotemasters.com/crm_api/api.php?action=push_lead';
const ALLOWED_ORIGINS = [
  'https://recurringcleaningserviceglendale.com',
  'https://www.recurringcleaningserviceglendale.com',
];
const MAX_FIELD_LENGTH = 2000;
const ZIP_DEFAULT = '85301'; // Glendale, AZ
const ADDRESS_DEFAULT = 'Glendale, AZ';
const SITE_SOURCE_TAG = 'Site: recurringcleaningserviceglendale.com';
const MIN_PHONE_DIGITS = 10;
const MIN_LEAD_DAYS = 2;
const MAX_TIME_ID = 39;
const MAX_APPOINTMENTS = 5;
const MIN_SAME_DAY_GAP_MINUTES = 90;
const MAX_QUESTIONS = 20;
const MAX_ANSWERS_PER_QUESTION = 20;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function clean(value) {
  return isNonEmptyString(value) ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function digitsOnly(value) {
  return clean(value).replace(/[^\d]/g, '');
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// CRM rule: appointment date must be >= today + 2 days and fall Mon-Fri.
// Compared in UTC so the check does not drift with the serverless region.
function appointmentDateProblem(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Appointment date must be YYYY-MM-DD';

  const parts = value.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (
    date.getUTCFullYear() !== parts[0] ||
    date.getUTCMonth() !== parts[1] - 1 ||
    date.getUTCDate() !== parts[2]
  ) {
    return 'Appointment date is not a real date';
  }

  const day = date.getUTCDay();
  if (day === 0 || day === 6) return 'Appointment date must be a weekday';

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const earliest = today + MIN_LEAD_DAYS * 86400000;
  if (date.getTime() < earliest) return 'Appointment date must be at least 2 days from today';

  return '';
}

// Minutes since midnight for each SCHEDULES id, from api/crm-faq-reference.json.
// Ids 1-37 run 08:00am on a 15-minute grid, but 38 and 39 are 05:30pm and
// 05:45pm — there is no 05:15pm — so this cannot be computed from the id.
function slotMinutes(timeid) {
  const n = Number(timeid);
  if (!Number.isInteger(n) || n < 1 || n > MAX_TIME_ID) return null;
  if (n <= 37) return 480 + (n - 1) * 15; // 08:00am .. 05:00pm
  return n === 38 ? 17 * 60 + 30 : 17 * 60 + 45;
}

function normaliseAppointments(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'At least one appointment is required' };
  if (raw.length > MAX_APPOINTMENTS) return { error: 'Too many appointments requested' };

  const out = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (!isPlainObject(entry)) return { error: `Appointment ${i + 1} is malformed` };

    const date = clean(entry.date);
    const problem = appointmentDateProblem(date);
    if (problem) return { error: `Appointment ${i + 1}: ${problem}` };

    const timeid = digitsOnly(entry.timeid);
    const timeNum = Number(timeid);
    if (!timeid || !Number.isInteger(timeNum) || timeNum < 1 || timeNum > MAX_TIME_ID) {
      return { error: `Appointment ${i + 1}: invalid time slot` };
    }

    out.push({ date, timeid: String(timeNum) });
  }

  // Mirror the wizard's same-day spacing guard so a direct POST cannot book
  // two walkthroughs on top of each other. Not a CRM rule — ours.
  for (let a = 0; a < out.length; a += 1) {
    for (let b = a + 1; b < out.length; b += 1) {
      if (out[a].date !== out[b].date) continue;
      const minsA = slotMinutes(out[a].timeid);
      const minsB = slotMinutes(out[b].timeid);
      if (minsA === null || minsB === null) continue;
      const gap = Math.abs(minsA - minsB);
      if (gap === 0) {
        return { error: `Appointments ${a + 1} and ${b + 1} are at the same date and time` };
      }
      if (gap < MIN_SAME_DAY_GAP_MINUTES) {
        return {
          error: `Appointments ${a + 1} and ${b + 1} are only ${gap} minutes apart; ` +
            `leave at least ${MIN_SAME_DAY_GAP_MINUTES / 60} hours between same-day visits`,
        };
      }
    }
  }

  return { value: out };
}

function normaliseQuestions(raw) {
  if (raw === undefined || raw === null) return { value: [] };
  if (!Array.isArray(raw)) return { error: 'Questions must be a list' };
  if (raw.length > MAX_QUESTIONS) return { error: 'Too many questions submitted' };

  const out = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (!isPlainObject(entry)) return { error: `Question ${i + 1} is malformed` };

    const questionId = clean(entry.question_id);
    if (!questionId) return { error: `Question ${i + 1} is missing an id` };

    // Type C questions send an array of answer ids; type S sends a single id.
    if (Array.isArray(entry.answer_id)) {
      const answers = entry.answer_id.map(clean).filter(Boolean);
      if (answers.length === 0) return { error: `Question ${questionId} has no answer` };
      if (answers.length > MAX_ANSWERS_PER_QUESTION) {
        return { error: `Question ${questionId} has too many answers` };
      }
      out.push({ question_id: questionId, answer_id: answers });
    } else {
      const answer = clean(entry.answer_id);
      if (!answer) return { error: `Question ${questionId} has no answer` };
      out.push({ question_id: questionId, answer_id: answer });
    }
  }
  return { value: out };
}

function buildWizardPayload(body) {
  const input = body.customer;
  const firstName = clean(input.first_name);
  const lastName = clean(input.last_name);
  const phone = digitsOnly(input.phone);
  const email = clean(input.email);
  const email2 = clean(input.email2);
  const companyName = clean(input.company_name);
  const position = clean(input.position);
  const address = clean(input.address) || ADDRESS_DEFAULT;

  if (!firstName) return { error: 'First name is required' };
  if (!lastName) return { error: 'Last name is required' };
  if (!companyName) return { error: 'Company name is required' };
  if (!position) return { error: 'Position is required' };
  if (phone.length < MIN_PHONE_DIGITS) return { error: 'A valid phone number is required' };
  if (!email || !isValidEmail(email)) return { error: 'A valid email address is required' };
  if (email2 && !isValidEmail(email2)) return { error: 'The second email address is invalid' };

  const industry = Number(body.industry);
  if (!Number.isInteger(industry) || industry < 1) return { error: 'Select a valid industry' };

  const questions = normaliseQuestions(body.questions);
  if (questions.error) return { error: questions.error };

  const appointments = normaliseAppointments(body.appointments);
  if (appointments.error) return { error: appointments.error };

  const notes = clean(input.notes);
  const taggedNotes = notes ? `${SITE_SOURCE_TAG} | ${notes}` : SITE_SOURCE_TAG;

  return {
    value: {
      zip: ZIP_DEFAULT,
      customer: {
        company_name: companyName,
        first_name: firstName,
        last_name: lastName,
        position,
        phone,
        email,
        email2,
        address,
        service_address: clean(input.service_address) || address,
        notes: taggedNotes,
      },
      industry,
      questions: questions.value,
      appointments: appointments.value,
      // Per the CRM dev team the quote count is the number of booked slots.
      // Key is `num_of_quotes`, not the PDF's `number_of_quotes` — see above.
      num_of_quotes: String(appointments.value.length),
      utm_source: clean(body.utmSource),
    },
  };
}

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const token = process.env.CRM_API_TOKEN;
  if (!token) {
    console.error('submit-lead: CRM_API_TOKEN is not configured');
    res.status(500).json({ ok: false, error: 'Server not configured' });
    return;
  }

  const body = req.body || {};
  if (!isPlainObject(body.customer)) {
    res.status(400).json({ ok: false, error: 'Customer details are required' });
    return;
  }

  const built = buildWizardPayload(body);
  if (built.error) {
    res.status(400).json({ ok: false, error: built.error });
    return;
  }

  try {
    const crmResponse = await fetch(CRM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(built.value),
    });

    const text = await crmResponse.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    // The CRM signals the real outcome in the body, not the HTTP status: a
    // successful push returns ResponseCode 201 ("Lead pushed successfully!"),
    // while validation failures come back as 404 with an HTTP 400. Verified
    // against the live endpoint 2026-08-28.
    const crmCode = parsed && parsed.ResponseCode ? String(parsed.ResponseCode) : '';
    const accepted = crmCode === '200' || crmCode === '201';
    if (!accepted) {
      console.error('submit-lead: CRM rejected lead', crmResponse.status, parsed);
      res.status(502).json({ ok: false, error: 'Lead service unavailable' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-lead: request to CRM failed', err);
    res.status(502).json({ ok: false, error: 'Lead service unavailable' });
  }
};
