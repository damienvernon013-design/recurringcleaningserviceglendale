const CRM_ENDPOINT = 'https://thequotemasters.com/crm_api/api.php?action=push_lead';
const ALLOWED_ORIGINS = [
  'https://recurringcleaningserviceglendale.com',
  'https://www.recurringcleaningserviceglendale.com',
];

const ZIP_RE = /^\d{5}$/;
const PHONE_RE = /^[\d\s()+.-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 255;

function isNonEmptyString(value, maxLen = MAX_LEN) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen;
}

function sanitize(value, maxLen = MAX_LEN) {
  return typeof value === 'string' ? value.trim().slice(0, maxLen) : '';
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    res.status(500).json({ ok: false, error: 'Server misconfiguration' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const {
    name,
    phone,
    email,
    zip,
    sqft,
    freq,
    utm_source,
    utm_medium,
    utm_campaign,
    page_url,
    company_name,
  } = body;

  if (!isNonEmptyString(name, 200)) {
    res.status(400).json({ ok: false, error: 'Name is required' });
    return;
  }
  if (!isNonEmptyString(phone) || !PHONE_RE.test(phone.trim())) {
    res.status(400).json({ ok: false, error: 'A valid phone number is required' });
    return;
  }
  if (!isNonEmptyString(email) || !EMAIL_RE.test(email.trim())) {
    res.status(400).json({ ok: false, error: 'A valid email is required' });
    return;
  }
  if (!isNonEmptyString(zip) || !ZIP_RE.test(zip.trim())) {
    res.status(400).json({ ok: false, error: 'A valid 5-digit ZIP code is required' });
    return;
  }

  const nameParts = sanitize(name, 200).split(/\s+/);
  const firstName = nameParts.shift() || '';
  const lastName = nameParts.join(' ') || '';

  const notesParts = [];
  if (sqft) notesParts.push(`Sq ft: ${sanitize(sqft, 100)}`);
  if (freq) notesParts.push(`Frequency: ${sanitize(freq, 100)}`);
  if (page_url) notesParts.push(`Source page: ${sanitize(page_url, 300)}`);

  const source = sanitize(utm_source, 255) || 'organic';
  const sourceTag = [source, sanitize(utm_medium, 100), sanitize(utm_campaign, 100)]
    .filter(Boolean)
    .join(' / ');

  const payload = {
    zip: sanitize(zip, 10),
    customer: {
      company_name: sanitize(company_name, 200),
      first_name: firstName,
      last_name: lastName,
      position: '',
      phone: sanitize(phone, 30),
      email: sanitize(email, 255),
      email2: '',
      address: '',
      service_address: '',
      notes: notesParts.join(' | '),
    },
    number_of_quotes: '1',
    utm_source: sourceTag,
  };

  try {
    const crmResponse = await fetch(CRM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await crmResponse.text();

    if (!crmResponse.ok) {
      res.status(502).json({ ok: false, error: 'Lead could not be submitted. Please call us instead.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ ok: false, error: 'Lead could not be submitted. Please call us instead.' });
  }
};
