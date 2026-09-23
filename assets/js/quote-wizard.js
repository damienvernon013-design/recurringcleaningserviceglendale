(function () {
  'use strict';

  var form = document.querySelector('[data-quote-wizard]');
  if (!form) return;

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var UTM_STORAGE_KEY = 'qm_utm_params';
  var DRAFT_KEY = 'qm_wizard_draft';
  var MIN_PHONE_DIGITS = 10;
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MIN_LEAD_DAYS = 2;
  var MAX_SLOTS = 5;
  // Each slot is a different cleaning company walking the facility, and a
  // walkthrough runs 20-40 minutes. Keep same-day visits from colliding.
  // (The CRM does not enforce this — it is our own scheduling guard.)
  var MIN_SAME_DAY_GAP_MINUTES = 90;

  // Answer IDs mirror api/crm-faq-reference.json. Re-fetch get_lead_faq if the
  // CRM questionnaire changes — these are a snapshot, not a live source.
  var QUESTIONS = [
    {
      id: '1', type: 'S', legend: 'How often do you need the cleaners to come?',
      options: [
        { id: '103', label: '1x per week' }, { id: '104', label: '2x per week' },
        { id: '105', label: '3x per week' }, { id: '106', label: '4x per week' },
        { id: '107', label: '5x per week' }, { id: '108', label: '6x per week' },
        { id: '109', label: '7x per week' }
      ]
    },
    {
      id: '2', type: 'S', legend: 'What describes your current cleaning situation?',
      options: [
        { id: '201', label: 'In house — we clean our own office, but looking to hire a cleaner' },
        { id: '202', label: 'Outsourced — we pay a cleaning company' },
        { id: '203', label: 'We are a new company — we are looking for a cleaner' },
        { id: '204', label: 'We are relocating our current office' },
        { id: '205', label: 'We are opening a new location' }
      ]
    },
    {
      id: '3', type: 'C', legend: 'What could your current cleaners do better?',
      hint: 'Select all that apply. Skip if you have no cleaner today.',
      optional: true,
      options: [
        { id: '301', label: 'Not dusting well' },
        { id: '302', label: 'Not cleaning restrooms well' },
        { id: '303', label: 'Missing some obvious things' },
        { id: '304', label: 'Not following their cleaning schedule' },
        { id: '305', label: 'Not communicating' },
        { id: '306', label: 'The entryway could look better' },
        { id: '309', label: 'Not showing up when scheduled' },
        { id: '308', label: 'They may be retiring soon or moving away' },
        { id: '310', label: 'Not English speaking' },
        { id: '311', label: 'Not proper insurance' }
      ]
    },
    {
      id: '4', type: 'S', legend: 'How would you rate your current service?',
      hint: '1 = poor, 5 = excellent.',
      options: [
        { id: '401', label: '1 — Poor' }, { id: '402', label: '2' },
        { id: '403', label: '3' }, { id: '404', label: '4' },
        { id: '405', label: '5 — Excellent' }
      ]
    },
    {
      id: '10', type: 'S', legend: 'When do you want the cleaners to come?',
      options: [
        { id: '802', label: 'During the day' },
        { id: '803', label: 'After hours' },
        { id: '804', label: 'We are flexible' }
      ]
    }
  ];

  // QuesID 5 drives how many appointment slots we collect, so it is handled as
  // its own step rather than in the QUESTIONS loop.
  var QUOTES_QUESTION = {
    id: '5', type: 'S', legend: 'How many cleaning companies would you like to meet?',
    hint: 'Most facilities pick 3 — enough to compare without being overwhelmed.',
    options: [
      { id: '501', label: '1 company', count: 1 },
      { id: '502', label: '2 companies', count: 2 },
      { id: '503', label: '3 companies', count: 3 },
      { id: '504', label: '4 companies', count: 4 },
      { id: '505', label: '5 companies', count: 5 }
    ]
  };

  var SCHEDULES = [
    ['1', '08:00 am'], ['2', '08:15 am'], ['3', '08:30 am'], ['4', '08:45 am'],
    ['5', '09:00 am'], ['6', '09:15 am'], ['7', '09:30 am'], ['8', '09:45 am'],
    ['9', '10:00 am'], ['10', '10:15 am'], ['11', '10:30 am'], ['12', '10:45 am'],
    ['13', '11:00 am'], ['14', '11:15 am'], ['15', '11:30 am'], ['16', '11:45 am'],
    ['17', '12:00 pm'], ['18', '12:15 pm'], ['19', '12:30 pm'], ['20', '12:45 pm'],
    ['21', '01:00 pm'], ['22', '01:15 pm'], ['23', '01:30 pm'], ['24', '01:45 pm'],
    ['25', '02:00 pm'], ['26', '02:15 pm'], ['27', '02:30 pm'], ['28', '02:45 pm'],
    ['29', '03:00 pm'], ['30', '03:15 pm'], ['31', '03:30 pm'], ['32', '03:45 pm'],
    ['33', '04:00 pm'], ['34', '04:15 pm'], ['35', '04:30 pm'], ['36', '04:45 pm'],
    ['37', '05:00 pm'], ['38', '05:30 pm'], ['39', '05:45 pm']
  ];

  var INDUSTRIES = [
    [1, 'Churches / religious institutions'], [2, 'Learning centers'],
    [3, 'Fitness centers'], [4, 'Medical'], [5, 'Dental'],
    [6, 'HVAC - plumbing, heating, electric'], [7, 'Manufacturing'],
    [8, 'Legal - law offices'], [9, 'Engineering'],
    [10, 'Apartment / condo communities'],
    [11, 'Personal growth - message, meditation'], [12, 'Salons - hair, nail'],
    [13, 'Real estate, title companies, etc.'],
    [14, 'Veterinarian, grooming, pet care'],
    [15, 'Entertainment - family fun centers, play center'],
    [16, 'Car dealerships'], [17, 'Restaurants - food prep, culinary schools'],
    [18, 'Universities - higher learning centers'], [19, 'Government offices'],
    [20, 'Trucking -logistics'],
    [21, 'Accounting - bookkeeping, tax prep offices'],
    [22, 'Retail locations - jewelry, clothing, etc.'],
    [23, 'Distribution center'], [24, 'Car / truck rental'],
    [25, 'Builders / contractors'], [26, 'Bars - night clubs'],
    [27, 'Microbrewery'], [28, 'Funeral home'], [29, 'Suppliers'],
    [30, 'Agriculture'], [32, 'Security companies / Facility services'],
    [33, 'Automotive Service'], [34, 'Exercise studio - Yoga, Dance'],
    [35, 'IT-Information Technology'], [36, 'Marketing'], [37, 'Advertising'],
    [38, 'Healthcare'], [39, 'Daycares'], [40, 'Beauty & Wellness'],
    [41, 'Hospitality'], [42, 'Events'], [43, 'Architecture']
  ];

  var state = {
    answers: {},        // question_id -> string | string[]
    quotesAnswerId: '',
    slotCount: 1,
    appointments: [],   // [{date, timeid}]
    industry: '',
    customer: {
      company_name: '', first_name: '', last_name: '', position: '',
      phone: '', email: '', email2: '', address: '', notes: ''
    },
    stepIndex: 0,
    submitted: false
  };

  // ---------- utilities ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function toISODate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseISODate(value) {
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!parts) return null;
    var d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    if (d.getFullYear() !== Number(parts[1]) ||
        d.getMonth() !== Number(parts[2]) - 1 ||
        d.getDate() !== Number(parts[3])) return null;
    return d;
  }

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function earliestAllowedDate() {
    var d = startOfToday();
    d.setDate(d.getDate() + MIN_LEAD_DAYS);
    return d;
  }

  // CRM rule: date >= today + 2 days AND Mon-Fri.
  function firstBookableDate() {
    var d = earliestAllowedDate();
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
  }

  function dateProblem(value) {
    var d = parseISODate(value);
    if (!d) return 'Choose a date.';
    if (d.getDay() === 0 || d.getDay() === 6) return 'Pick a weekday — walkthroughs run Monday to Friday.';
    if (d < earliestAllowedDate()) return 'Choose a date at least 2 days from today.';
    return '';
  }

  function formatLongDate(value) {
    var d = parseISODate(value);
    if (!d) return value;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'];
    return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function slotLabel(timeid) {
    for (var i = 0; i < SCHEDULES.length; i++) {
      if (SCHEDULES[i][0] === timeid) return SCHEDULES[i][1];
    }
    return timeid;
  }

  // "01:30 pm" -> minutes since midnight. Returns null if unparseable.
  function slotMinutes(timeid) {
    var label = slotLabel(timeid);
    var m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(label || '');
    if (!m) return null;
    var hour = Number(m[1]) % 12;
    if (/pm/i.test(m[3])) hour += 12;
    return hour * 60 + Number(m[2]);
  }

  function answerLabel(question, id) {
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].id === id) return question.options[i].label;
    }
    return id;
  }

  function industryLabel(id) {
    for (var i = 0; i < INDUSTRIES.length; i++) {
      if (String(INDUSTRIES[i][0]) === String(id)) return INDUSTRIES[i][1];
    }
    return '';
  }

  // ---------- UTM ----------

  function captureUtm() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var hasAny = false;
    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) { found[key] = value.slice(0, 255); hasAny = true; }
    });
    if (hasAny) {
      try { sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(found)); } catch (e) {}
      return found;
    }
    try {
      var stored = sessionStorage.getItem(UTM_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
  }

  function buildUtmSource(utm) {
    if (utm.utm_source) return utm.utm_source;
    if (document.referrer) {
      try { return new URL(document.referrer).hostname; } catch (e) { return ''; }
    }
    return 'direct';
  }

  var utm = captureUtm();

  // ---------- prefill from teaser forms ----------

  function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var name = (params.get('name') || '').trim();
    if (name) {
      var bits = name.split(/\s+/);
      state.customer.first_name = bits[0] || '';
      state.customer.last_name = bits.slice(1).join(' ');
    }
    var phone = (params.get('phone') || '').trim();
    if (phone) state.customer.phone = phone;
    var city = (params.get('city') || '').trim();
    if (city) state.customer.address = city;
    var sqft = (params.get('sqft') || '').trim();
    if (sqft) state.customer.notes = 'Approx. size: ' + sqft;
  }

  // ---------- draft persistence ----------

  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        answers: state.answers,
        quotesAnswerId: state.quotesAnswerId,
        slotCount: state.slotCount,
        appointments: state.appointments,
        industry: state.industry,
        customer: state.customer
      }));
    } catch (e) {}
  }

  function loadDraft() {
    var raw;
    try { raw = sessionStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    if (!saved || typeof saved !== 'object') return;

    if (saved.answers && typeof saved.answers === 'object') state.answers = saved.answers;
    if (typeof saved.quotesAnswerId === 'string') state.quotesAnswerId = saved.quotesAnswerId;
    if (typeof saved.slotCount === 'number' && saved.slotCount >= 1 && saved.slotCount <= MAX_SLOTS) {
      state.slotCount = saved.slotCount;
    }
    if (Object.prototype.toString.call(saved.appointments) === '[object Array]') {
      state.appointments = saved.appointments;
    }
    if (saved.industry != null) state.industry = String(saved.industry);
    if (saved.customer && typeof saved.customer === 'object') {
      Object.keys(state.customer).forEach(function (key) {
        if (typeof saved.customer[key] === 'string') state.customer[key] = saved.customer[key];
      });
    }
    // Dates can go stale between sessions — drop any that no longer validate.
    state.appointments = state.appointments.filter(function (appt) {
      return appt && !dateProblem(appt.date);
    });
  }

  function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  // ---------- step definitions ----------

  var steps = [];

  QUESTIONS.forEach(function (question) {
    steps.push({
      key: 'q' + question.id,
      title: question.legend,
      render: function (host) { renderChoice(host, question); },
      validate: function () {
        if (question.optional) return '';
        var value = state.answers[question.id];
        if (question.type === 'C') {
          return (value && value.length) ? '' : 'Pick at least one option.';
        }
        return value ? '' : 'Pick an option to continue.';
      }
    });
  });

  steps.push({
    key: 'quotes',
    title: QUOTES_QUESTION.legend,
    render: function (host) { renderQuotesChoice(host); },
    validate: function () {
      return state.quotesAnswerId ? '' : 'Pick how many companies you want to meet.';
    }
  });

  steps.push({
    key: 'appointments',
    title: 'Book your walkthrough times',
    render: function (host) { renderAppointments(host); },
    validate: function () { return validateAppointments(); }
  });

  steps.push({
    key: 'details',
    title: 'Your details',
    render: function (host) { renderDetails(host); },
    validate: function () { return validateDetails(); }
  });

  steps.push({
    key: 'review',
    title: 'Review and confirm',
    render: function (host) { renderReview(host); },
    validate: function () { return ''; },
    isFinal: true
  });

  // ---------- rendering ----------

  var stepHost = form.querySelector('[data-wizard-steps]');
  var progressHost = form.querySelector('[data-wizard-progress]');
  var statusHost = form.querySelector('[data-wizard-status]');
  var navHost = form.querySelector('[data-wizard-nav]');
  var backBtn = form.querySelector('[data-wizard-back]');
  var nextBtn = form.querySelector('[data-wizard-next]');

  function setStatus(message, isError) {
    statusHost.textContent = message || '';
    statusHost.classList.toggle('form-status-error', !!(message && isError));
    statusHost.classList.toggle('form-status-success', !!(message && !isError));
  }

  function renderProgress() {
    progressHost.innerHTML = '';
    var total = steps.length;
    var current = state.stepIndex;

    var bar = el('div', 'wiz-progress-bar');
    var fill = el('span', 'wiz-progress-fill');
    fill.style.width = Math.round(((current + 1) / total) * 100) + '%';
    bar.appendChild(fill);

    var label = el('p', 'wiz-progress-label',
      'Step ' + (current + 1) + ' of ' + total + ' · ' + steps[current].title);

    progressHost.appendChild(bar);
    progressHost.appendChild(label);
  }

  function renderChoice(host, question) {
    var fieldset = el('fieldset', 'wiz-fieldset');
    var legend = el('legend', 'wiz-legend', question.legend);
    fieldset.appendChild(legend);
    if (question.hint) fieldset.appendChild(el('p', 'wiz-hint', question.hint));

    var isMulti = question.type === 'C';
    var list = el('div', 'wiz-options');

    question.options.forEach(function (option) {
      var inputId = 'q' + question.id + '-' + option.id;
      var wrap = el('label', 'wiz-option');
      wrap.setAttribute('for', inputId);

      var input = document.createElement('input');
      input.type = isMulti ? 'checkbox' : 'radio';
      input.name = 'question-' + question.id;
      input.id = inputId;
      input.value = option.id;
      input.className = 'wiz-option-input';

      var selected = state.answers[question.id];
      input.checked = isMulti
        ? !!(selected && selected.indexOf(option.id) !== -1)
        : selected === option.id;

      input.addEventListener('change', function () {
        if (isMulti) {
          var current = state.answers[question.id];
          var next = (Object.prototype.toString.call(current) === '[object Array]')
            ? current.slice() : [];
          var at = next.indexOf(option.id);
          if (input.checked && at === -1) next.push(option.id);
          if (!input.checked && at !== -1) next.splice(at, 1);
          state.answers[question.id] = next;
        } else {
          state.answers[question.id] = option.id;
        }
        saveDraft();
        setStatus('', false);
        syncOptionStyles(list);
      });

      wrap.appendChild(input);
      wrap.appendChild(el('span', 'wiz-option-label', option.label));
      list.appendChild(wrap);
    });

    fieldset.appendChild(list);
    host.appendChild(fieldset);
    syncOptionStyles(list);
  }

  function syncOptionStyles(list) {
    var labels = list.querySelectorAll('.wiz-option');
    for (var i = 0; i < labels.length; i++) {
      var input = labels[i].querySelector('input');
      labels[i].classList.toggle('is-selected', !!(input && input.checked));
    }
  }

  function renderQuotesChoice(host) {
    var fieldset = el('fieldset', 'wiz-fieldset');
    fieldset.appendChild(el('legend', 'wiz-legend', QUOTES_QUESTION.legend));
    fieldset.appendChild(el('p', 'wiz-hint', QUOTES_QUESTION.hint));

    var list = el('div', 'wiz-options');
    QUOTES_QUESTION.options.forEach(function (option) {
      var inputId = 'quotes-' + option.id;
      var wrap = el('label', 'wiz-option');
      wrap.setAttribute('for', inputId);

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'question-5';
      input.id = inputId;
      input.value = option.id;
      input.className = 'wiz-option-input';
      input.checked = state.quotesAnswerId === option.id;

      input.addEventListener('change', function () {
        state.quotesAnswerId = option.id;
        state.slotCount = option.count;
        // Drop any slots beyond the new count; keep what the visitor already picked.
        state.appointments = state.appointments.slice(0, option.count);
        saveDraft();
        setStatus('', false);
        syncOptionStyles(list);
      });

      wrap.appendChild(input);
      wrap.appendChild(el('span', 'wiz-option-label', option.label));
      list.appendChild(wrap);
    });

    fieldset.appendChild(list);
    host.appendChild(fieldset);
    syncOptionStyles(list);
  }

  function renderAppointments(host) {
    var fieldset = el('fieldset', 'wiz-fieldset');
    fieldset.appendChild(el('legend', 'wiz-legend',
      state.slotCount === 1
        ? 'Pick a date and time for your walkthrough'
        : 'Pick ' + state.slotCount + ' walkthrough slots'));
    fieldset.appendChild(el('p', 'wiz-hint', state.slotCount === 1
      ? 'Weekdays only, at least 2 days out.'
      : 'Weekdays only, at least 2 days out. Each company you meet gets its own ' +
        'slot — leave at least ' + (MIN_SAME_DAY_GAP_MINUTES / 60) +
        ' hours between visits booked on the same day.'));

    var minDate = toISODate(firstBookableDate());

    for (var i = 0; i < state.slotCount; i++) {
      (function (index) {
        var existing = state.appointments[index] || { date: '', timeid: '' };
        var group = el('div', 'wiz-slot');
        group.appendChild(el('h3', 'wiz-slot-title', 'Appointment ' + (index + 1)));

        var grid = el('div', 'wiz-slot-grid');

        var dateRow = el('div', 'form-row');
        var dateId = 'appt-date-' + index;
        var dateLabel = el('label', null, 'Date');
        dateLabel.setAttribute('for', dateId);
        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = dateId;
        dateInput.min = minDate;
        dateInput.value = existing.date || '';
        dateInput.addEventListener('change', function () {
          ensureSlot(index).date = dateInput.value;
          saveDraft();
          setStatus('', false);
        });
        dateRow.appendChild(dateLabel);
        dateRow.appendChild(dateInput);

        var timeRow = el('div', 'form-row');
        var timeId = 'appt-time-' + index;
        var timeLabel = el('label', null, 'Time');
        timeLabel.setAttribute('for', timeId);
        var timeSelect = document.createElement('select');
        timeSelect.id = timeId;
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a time';
        timeSelect.appendChild(placeholder);
        SCHEDULES.forEach(function (slot) {
          var opt = document.createElement('option');
          opt.value = slot[0];
          opt.textContent = slot[1];
          if (existing.timeid === slot[0]) opt.selected = true;
          timeSelect.appendChild(opt);
        });
        timeSelect.addEventListener('change', function () {
          ensureSlot(index).timeid = timeSelect.value;
          saveDraft();
          setStatus('', false);
        });
        timeRow.appendChild(timeLabel);
        timeRow.appendChild(timeSelect);

        grid.appendChild(dateRow);
        grid.appendChild(timeRow);
        group.appendChild(grid);
        fieldset.appendChild(group);
      })(i);
    }

    host.appendChild(fieldset);
  }

  function ensureSlot(index) {
    if (!state.appointments[index]) state.appointments[index] = { date: '', timeid: '' };
    return state.appointments[index];
  }

  function validateAppointments() {
    for (var i = 0; i < state.slotCount; i++) {
      var appt = state.appointments[i];
      if (!appt || !appt.date) return 'Pick a date for appointment ' + (i + 1) + '.';
      var problem = dateProblem(appt.date);
      if (problem) return 'Appointment ' + (i + 1) + ': ' + problem;
      if (!appt.timeid) return 'Pick a time for appointment ' + (i + 1) + '.';
    }
    // Two companies walking the facility at once is a scheduling clash, and
    // back-to-back slots overrun. Enforce a gap between same-day visits.
    for (var a = 0; a < state.slotCount; a++) {
      for (var b = a + 1; b < state.slotCount; b++) {
        var first = state.appointments[a];
        var second = state.appointments[b];
        if (first.date !== second.date) continue;

        var minsA = slotMinutes(first.timeid);
        var minsB = slotMinutes(second.timeid);
        if (minsA === null || minsB === null) continue;

        var gap = Math.abs(minsA - minsB);
        if (gap === 0) {
          return 'Appointments ' + (a + 1) + ' and ' + (b + 1) +
            ' are at the same date and time — pick different slots.';
        }
        if (gap < MIN_SAME_DAY_GAP_MINUTES) {
          return 'Appointments ' + (a + 1) + ' and ' + (b + 1) + ' are only ' +
            gap + ' minutes apart. Each walkthrough takes 20–40 minutes, so ' +
            'leave at least ' + (MIN_SAME_DAY_GAP_MINUTES / 60) +
            ' hours between visits on the same day.';
        }
      }
    }
    return '';
  }

  function renderDetails(host) {
    var fieldset = el('fieldset', 'wiz-fieldset');
    fieldset.appendChild(el('legend', 'wiz-legend', 'Your details'));
    fieldset.appendChild(el('p', 'wiz-hint', 'All fields required except the second email and notes.'));

    var industryRow = el('div', 'form-row');
    var industryLabelEl = el('label', null, 'Type of facility');
    industryLabelEl.setAttribute('for', 'wiz-industry');
    var industrySelect = document.createElement('select');
    industrySelect.id = 'wiz-industry';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select your industry';
    industrySelect.appendChild(placeholder);
    INDUSTRIES.forEach(function (row) {
      var opt = document.createElement('option');
      opt.value = String(row[0]);
      opt.textContent = row[1];
      if (String(state.industry) === String(row[0])) opt.selected = true;
      industrySelect.appendChild(opt);
    });
    industrySelect.addEventListener('change', function () {
      state.industry = industrySelect.value;
      saveDraft();
      setStatus('', false);
    });
    industryRow.appendChild(industryLabelEl);
    industryRow.appendChild(industrySelect);
    fieldset.appendChild(industryRow);

    var fields = [
      { key: 'company_name', label: 'Company name', type: 'text', autocomplete: 'organization' },
      { key: 'first_name', label: 'First name', type: 'text', autocomplete: 'given-name' },
      { key: 'last_name', label: 'Last name', type: 'text', autocomplete: 'family-name' },
      { key: 'position', label: 'Your position', type: 'text', autocomplete: 'organization-title' },
      { key: 'address', label: 'Facility address', type: 'text', autocomplete: 'street-address' },
      { key: 'phone', label: 'Phone number', type: 'tel', autocomplete: 'tel' },
      { key: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
      { key: 'email2', label: 'Second email (optional)', type: 'email', optional: true },
      { key: 'notes', label: 'Anything else? (optional)', type: 'textarea', optional: true }
    ];

    fields.forEach(function (field) {
      var row = el('div', 'form-row');
      var id = 'wiz-' + field.key;
      var labelEl = el('label', null, field.label);
      labelEl.setAttribute('for', id);
      var input = field.type === 'textarea'
        ? document.createElement('textarea')
        : document.createElement('input');
      if (field.type !== 'textarea') input.type = field.type;
      input.id = id;
      input.value = state.customer[field.key] || '';
      if (field.autocomplete) input.setAttribute('autocomplete', field.autocomplete);
      input.addEventListener('input', function () {
        state.customer[field.key] = input.value;
        setStatus('', false);
      });
      input.addEventListener('change', saveDraft);
      row.appendChild(labelEl);
      row.appendChild(input);
      fieldset.appendChild(row);
    });

    host.appendChild(fieldset);
  }

  function validateDetails() {
    var c = state.customer;
    if (!state.industry) return 'Select the type of facility.';
    if (!c.company_name.trim()) return 'Enter your company name.';
    if (!c.first_name.trim()) return 'Enter your first name.';
    if (!c.last_name.trim()) return 'Enter your last name.';
    if (!c.position.trim()) return 'Enter your position.';
    if (!c.address.trim()) return 'Enter the facility address.';
    if (c.phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS) {
      return 'Enter a valid phone number with area code.';
    }
    if (!EMAIL_PATTERN.test(c.email.trim())) return 'Enter a valid email address.';
    if (c.email2.trim() && !EMAIL_PATTERN.test(c.email2.trim())) {
      return 'The second email address is not valid.';
    }
    return '';
  }

  function renderReview(host) {
    var wrap = el('div', 'wiz-review');
    wrap.appendChild(el('h3', 'wiz-review-heading', 'Your appointment booking summary'));

    var company = el('div', 'wiz-review-card');
    company.appendChild(el('h4', null, 'Company details'));
    var companyRows = [
      ['Company', state.customer.company_name],
      ['Contact', state.customer.first_name + ' ' + state.customer.last_name],
      ['Position', state.customer.position],
      ['Facility type', industryLabel(state.industry)],
      ['Address', state.customer.address],
      ['Phone', state.customer.phone],
      ['Email', state.customer.email]
    ];
    if (state.customer.email2.trim()) companyRows.push(['Second email', state.customer.email2]);
    company.appendChild(buildReviewList(companyRows));
    wrap.appendChild(company);

    var details = el('div', 'wiz-review-card');
    details.appendChild(el('h4', null, 'Appointment details'));
    var detailRows = [];
    QUESTIONS.forEach(function (question) {
      var value = state.answers[question.id];
      if (question.type === 'C') {
        if (value && value.length) {
          detailRows.push([question.legend, value.map(function (id) {
            return answerLabel(question, id);
          }).join(', ')]);
        }
      } else if (value) {
        detailRows.push([question.legend, answerLabel(question, value)]);
      }
    });
    if (state.quotesAnswerId) {
      detailRows.push([QUOTES_QUESTION.legend, answerLabel(QUOTES_QUESTION, state.quotesAnswerId)]);
    }
    state.appointments.slice(0, state.slotCount).forEach(function (appt, index) {
      detailRows.push([
        'Time and date for appointment ' + (index + 1),
        formatLongDate(appt.date) + ', ' + slotLabel(appt.timeid)
      ]);
    });
    if (state.customer.notes.trim()) detailRows.push(['Notes', state.customer.notes]);
    details.appendChild(buildReviewList(detailRows));
    wrap.appendChild(details);

    var termsRow = el('label', 'wiz-terms');
    var terms = document.createElement('input');
    terms.type = 'checkbox';
    terms.id = 'wiz-terms';
    terms.setAttribute('data-wizard-terms', '');
    termsRow.setAttribute('for', 'wiz-terms');
    termsRow.appendChild(terms);
    termsRow.appendChild(el('span', null,
      'I agree to be contacted about this quote request by phone, text, or email.'));
    wrap.appendChild(termsRow);

    wrap.appendChild(el('p', 'wiz-hint', 'Please confirm your booking summary is correct.'));
    host.appendChild(wrap);
  }

  function buildReviewList(rows) {
    var dl = el('dl', 'wiz-review-list');
    rows.forEach(function (row) {
      dl.appendChild(el('dt', null, row[0]));
      dl.appendChild(el('dd', null, row[1] || '—'));
    });
    return dl;
  }

  // ---------- navigation ----------

  function renderStep(options) {
    var step = steps[state.stepIndex];
    stepHost.innerHTML = '';
    var panel = el('div', 'wiz-step');
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', step.title);
    step.render(panel);
    stepHost.appendChild(panel);

    renderProgress();

    backBtn.hidden = state.stepIndex === 0;
    nextBtn.textContent = step.isFinal ? 'Confirm and send' : 'Next';

    if (options && options.focus !== false) {
      var focusTarget = panel.querySelector('input, select, textarea, button');
      if (focusTarget) {
        try { focusTarget.focus({ preventScroll: true }); } catch (e) { focusTarget.focus(); }
      }
      var top = form.getBoundingClientRect().top + window.pageYOffset - 24;
      window.scrollTo(0, Math.max(0, top));
    }
  }

  function goNext() {
    var step = steps[state.stepIndex];
    var problem = step.validate();
    if (problem) { setStatus(problem, true); return; }

    if (step.isFinal) { submit(); return; }

    setStatus('', false);
    state.stepIndex += 1;
    saveDraft();
    renderStep();
  }

  function goBack() {
    if (state.stepIndex === 0) return;
    setStatus('', false);
    state.stepIndex -= 1;
    renderStep();
  }

  // ---------- submit ----------

  function buildQuestionsPayload() {
    var out = [];
    QUESTIONS.forEach(function (question) {
      var value = state.answers[question.id];
      if (question.type === 'C') {
        if (value && value.length) out.push({ question_id: question.id, answer_id: value.slice() });
      } else if (value) {
        out.push({ question_id: question.id, answer_id: value });
      }
    });
    if (state.quotesAnswerId) {
      out.push({ question_id: QUOTES_QUESTION.id, answer_id: state.quotesAnswerId });
    }
    return out;
  }

  function submit() {
    var terms = form.querySelector('[data-wizard-terms]');
    if (!terms || !terms.checked) {
      setStatus('Please agree to be contacted before sending.', true);
      return;
    }
    if (state.submitted) return;

    var appointments = state.appointments.slice(0, state.slotCount).map(function (appt) {
      return { date: appt.date, timeid: String(appt.timeid) };
    });

    var payload = {
      customer: {
        company_name: state.customer.company_name.trim(),
        first_name: state.customer.first_name.trim(),
        last_name: state.customer.last_name.trim(),
        position: state.customer.position.trim(),
        phone: state.customer.phone.trim(),
        email: state.customer.email.trim(),
        email2: state.customer.email2.trim(),
        address: state.customer.address.trim(),
        service_address: state.customer.address.trim(),
        notes: state.customer.notes.trim()
      },
      industry: Number(state.industry),
      questions: buildQuestionsPayload(),
      appointments: appointments,
      // The quote count is derived server-side from appointments.length and
      // sent to the CRM as `num_of_quotes`, so it is not passed from here.
      utmSource: buildUtmSource(utm)
    };

    state.submitted = true;
    nextBtn.disabled = true;
    backBtn.disabled = true;
    nextBtn.textContent = 'Sending...';
    setStatus('', false);

    fetch('/api/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data && result.data.ok) {
          clearDraft();
          showSuccess();
          return;
        }
        state.submitted = false;
        nextBtn.disabled = false;
        backBtn.disabled = false;
        nextBtn.textContent = 'Confirm and send';
        setStatus((result.data && result.data.error) ||
          'Something went wrong. Please call us on (866) 958-8773.', true);
      })
      .catch(function () {
        state.submitted = false;
        nextBtn.disabled = false;
        backBtn.disabled = false;
        nextBtn.textContent = 'Confirm and send';
        setStatus('Something went wrong. Please call us on (866) 958-8773.', true);
      });
  }

  function showSuccess() {
    progressHost.innerHTML = '';
    stepHost.innerHTML = '';

    // `hidden` alone loses to the stylesheet's `display: flex` on .wiz-nav,
    // which would leave the frozen "Sending..." button on screen.
    navHost.hidden = true;
    navHost.style.display = 'none';
    // Restore the buttons too, so they can never strand mid-submit if this
    // element is ever revealed again.
    nextBtn.disabled = false;
    backBtn.disabled = false;
    nextBtn.textContent = 'Confirm and send';

    var done = el('div', 'wiz-done');
    done.appendChild(el('h2', null, 'Request received'));
    done.appendChild(el('p', null,
      'Thanks — your walkthrough request is in. We call back the next business day, ' +
      'Monday to Friday, before 5:00pm.'));

    var list = el('ul', 'wiz-done-list');
    state.appointments.slice(0, state.slotCount).forEach(function (appt, index) {
      list.appendChild(el('li', null,
        'Appointment ' + (index + 1) + ': ' + formatLongDate(appt.date) + ' at ' + slotLabel(appt.timeid)));
    });
    done.appendChild(list);

    done.appendChild(el('p', null, 'Need to reach us sooner? Call (866) 958-8773.'));
    stepHost.appendChild(done);
    setStatus('', false);

    var top = form.getBoundingClientRect().top + window.pageYOffset - 24;
    window.scrollTo(0, Math.max(0, top));
  }

  // ---------- boot ----------

  prefillFromQuery();
  loadDraft();

  nextBtn.addEventListener('click', goNext);
  backBtn.addEventListener('click', goBack);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    goNext();
  });

  // Enter inside a text field advances rather than submitting the whole form.
  form.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    var target = event.target;
    if (target && target.tagName === 'TEXTAREA') return;
    event.preventDefault();
    goNext();
  });

  renderStep({ focus: false });
})();
